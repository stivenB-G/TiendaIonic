import { Injectable, computed, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import { AuthService } from './auth.service';
import { shopConfig } from './shop.config';
import { DEMO_PRODUCTS, type CartItem, type Order, type Product } from './shop.models';

@Injectable({ providedIn: 'root' })
export class ShopService {
  readonly auth = inject(AuthService);
  readonly products = signal<Product[]>([]);
  readonly cart = signal<CartItem[]>([]);
  readonly orders = signal<Order[]>([]);
  readonly ready = signal(false);
  readonly cached = signal(false);
  readonly message = signal('');
  readonly lines = computed(() =>
    this.cart().flatMap((item) => {
      const product = this.products().find((p) => p.id === item.productId);
      return product ? [{ product, quantity: item.quantity }] : [];
    }),
  );
  readonly count = computed(() => this.cart().reduce((sum, item) => sum + item.quantity, 0));
  readonly total = computed(() => this.lines().reduce((sum, line) => sum + line.product.price * line.quantity, 0));
  private readonly namespace = this.auth.demo ? 'shop-demo' : `shop-${shopConfig.supabaseUrl}`;
  private readonly orderKey = 'shop-demo-orders';
  private started?: Promise<void>;
  private writes: Promise<void> = Promise.resolve();
  private checkingOut = false;
  private requestId?: string;

  initialize(): Promise<void> {
    return (this.started ??= this.load());
  }

  private async load(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: `${this.namespace}-cart` });
      const saved = value ? JSON.parse(value) : [];
      const items: unknown = Array.isArray(saved) ? saved : saved.items;
      if (!Array.isArray(saved) && typeof saved.requestId === 'string') this.requestId = saved.requestId;
      if (Array.isArray(items))
        this.cart.set(
          items.filter(
            (item): item is CartItem =>
              typeof item?.productId === 'string' &&
              Number.isInteger(item.quantity) &&
              item.quantity > 0 &&
              item.quantity <= 99,
          ),
        );
    } catch {
      this.message.set('No se pudo recuperar el carrito guardado.');
    }
    await this.refreshProducts();
    this.ready.set(true);
  }

  async refreshProducts(): Promise<void> {
    this.cached.set(false);
    try {
      let products: Product[];
      if (this.auth.demo) {
        const { value } = await Preferences.get({ key: this.orderKey });
        const orders: Order[] = value ? JSON.parse(value) : [];
        const catalog = await this.demoCatalog();
        products = catalog.map((product) => ({
          ...product,
          stock: Math.max(
            0,
            product.stock -
              orders.reduce(
                (used, order) =>
                  used +
                  order.items
                    .filter((item) => item.productId === product.id)
                    .reduce((sum, item) => sum + item.quantity, 0),
                0,
              ),
          ),
        }));
      } else products = await this.request('products?select=*&order=name.asc');
      this.products.set(products);
      await Preferences.set({ key: `${this.namespace}-catalog`, value: JSON.stringify(products) });
    } catch {
      try {
        const { value } = await Preferences.get({ key: `${this.namespace}-catalog` });
        if (value) {
          this.products.set(JSON.parse(value));
          this.cached.set(true);
          this.message.set('Catálogo guardado sin conexión. Precios y existencias se validarán al confirmar.');
          return;
        }
      } catch {
        /* Se mantiene el catálogo ya cargado si el almacenamiento falla. */
      }
      this.message.set('No se pudo actualizar el catálogo. Comprueba tu conexión y reintenta.');
    }
  }

  async change(product: Product, delta: number): Promise<void> {
    if (this.checkingOut) throw new Error('Espera a que termine el pedido antes de cambiar el carrito.');
    const current = this.cart().find((item) => item.productId === product.id)?.quantity ?? 0;
    const quantity = current + delta;
    if (delta > 0 && quantity > Math.min(product.stock, 99)) throw new Error('No hay más unidades disponibles.');
    const next = this.cart().filter((item) => item.productId !== product.id);
    if (quantity > 0) next.push({ productId: product.id, quantity });
    this.cart.set(next);
    this.requestId = undefined;
    await this.persistCart();
  }

  private async demoCatalog(): Promise<Product[]> {
    const { value } = await Preferences.get({ key: 'shop-demo-products' });
    return value ? JSON.parse(value) : DEMO_PRODUCTS;
  }

  async saveDemoProduct(product: Product, expectedStock?: number): Promise<void> {
    if (!this.auth.demo || !this.auth.admin()) throw new Error('Solo un administrador puede guardar productos.');
    if (this.checkingOut) throw new Error('Espera a que termine el pedido antes de editar el catálogo.');
    const catalog = await this.demoCatalog();
    const { value } = await Preferences.get({ key: this.orderKey });
    const orders: Order[] = value ? JSON.parse(value) : [];
    const sold = orders.reduce(
      (sum, order) =>
        sum +
        order.items.filter((item) => item.productId === product.id).reduce((count, item) => count + item.quantity, 0),
      0,
    );
    const existing = catalog.find((item) => item.id === product.id);
    if (existing && Math.max(0, existing.stock - sold) !== expectedStock)
      throw new Error(
        'El producto o sus existencias cambiaron mientras editabas. Actualiza el listado y vuelve a abrirlo para conservar las ventas recientes.',
      );
    // El catálogo demo base conserva el stock inicial; la tienda descuenta los pedidos guardados.
    const saved = { ...product, stock: product.stock + sold };
    const next = [...catalog.filter((item) => item.id !== saved.id), saved];
    await Preferences.set({ key: 'shop-demo-products', value: JSON.stringify(next) });
    this.products.update((items) => [...items.filter((item) => item.id !== product.id), product]);
  }

  private persistCart(): Promise<void> {
    const value = JSON.stringify({ items: this.cart(), requestId: this.requestId });
    const write = this.writes
      .catch(() => undefined)
      .then(() => Preferences.set({ key: `${this.namespace}-cart`, value }));
    this.writes = write;
    return write.catch(() => {
      throw new Error('El carrito cambió, pero no pudo guardarse en este dispositivo.');
    });
  }

  async loadOrders(): Promise<void> {
    const userId = this.auth.user()?.id;
    if (!userId) {
      this.orders.set([]);
      return;
    }
    if (this.auth.demo) {
      const { value } = await Preferences.get({ key: this.orderKey });
      if (this.auth.user()?.id === userId) this.orders.set(value ? JSON.parse(value) : []);
    } else {
      const orders: Order[] = await this.request('orders?select=*&order=created_at.desc', undefined, true);
      if (this.auth.user()?.id === userId) this.orders.set(orders);
    }
  }

  clearPrivateData(): void {
    this.orders.set([]);
  }

  async checkout(): Promise<Order> {
    if (this.checkingOut) throw new Error('El pedido se está procesando.');
    if (!this.auth.user()) throw new Error('Inicia sesión antes de confirmar.');
    if (!this.cart().length || this.lines().length !== this.cart().length)
      throw new Error('Revisa los productos de tu carrito.');
    this.checkingOut = true;
    try {
      this.requestId ??= crypto.randomUUID();
      await this.persistCart();
      let order: Order;
      if (this.auth.demo) {
        await this.refreshProducts();
        if (this.lines().some((line) => line.quantity > line.product.stock))
          throw new Error('Revisa las existencias del carrito.');
        await this.loadOrders();
        order = {
          id: this.requestId,
          created_at: new Date().toISOString(),
          status: 'pending',
          payment_status: 'simulated',
          total: this.total(),
          items: this.lines().map(({ product, quantity }) => ({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity,
          })),
        };
        const orders = [order, ...this.orders().filter((item) => item.id !== order.id)];
        await Preferences.set({ key: this.orderKey, value: JSON.stringify(orders) });
        this.orders.set(orders);
      } else {
        order = await this.request('rpc/create_order', { p_items: this.cart(), p_request_id: this.requestId }, true);
        this.orders.update((orders) => [order, ...orders.filter((item) => item.id !== order.id)]);
      }
      this.cart.set([]);
      this.requestId = undefined;
      try {
        await this.persistCart();
      } catch {
        this.message.set('Pedido creado. No se pudo limpiar el carrito guardado; revísalo antes de comprar de nuevo.');
      }
      await this.refreshProducts();
      return order;
    } finally {
      this.checkingOut = false;
    }
  }

  async markDelivered(order: Order): Promise<void> {
    if (!this.auth.operator()) throw new Error('Se requiere un rol de logística.');
    if (this.auth.demo) {
      const orders = this.orders().map((item) =>
        item.id === order.id ? { ...item, status: 'delivered' as const } : item,
      );
      await Preferences.set({ key: this.orderKey, value: JSON.stringify(orders) });
      this.orders.set(orders);
    } else {
      await this.request('rpc/mark_delivered', { p_order_id: order.id }, true);
      await this.loadOrders();
    }
  }

  private async request<T>(path: string, body?: object, authenticated = false): Promise<T> {
    if (!shopConfig.supabaseUrl.startsWith('https://')) throw new Error('El servidor debe usar HTTPS.');
    const token = authenticated ? await this.auth.token() : undefined;
    const response = await fetch(`${shopConfig.supabaseUrl}/rest/v1/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        apikey: shopConfig.supabaseKey,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new Error(
        response.status === 401
          ? 'Tu sesión terminó. Vuelve a ingresar.'
          : 'No se pudo completar la operación. Revisa la conexión y las existencias.',
      );
    return response.status === 204 ? (undefined as T) : response.json();
  }
}
