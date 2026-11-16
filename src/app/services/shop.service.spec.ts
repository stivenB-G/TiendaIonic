import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';
import { DEMO_PRODUCTS, type Order } from './shop.models';
import { ShopService } from './shop.service';

const storage = vi.hoisted(() => new Map<string, string>());
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({ value: storage.get(key) ?? null })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      storage.set(key, value);
    }),
  },
}));

describe('ShopService', () => {
  let shop: ShopService;
  let auth: AuthService;
  beforeEach(async () => {
    storage.clear();
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthService);
    shop = TestBed.inject(ShopService);
    await shop.initialize();
  });

  it('calcula el total de múltiples productos y conserva el carrito al reiniciar', async () => {
    await shop.change(DEMO_PRODUCTS[0], 1);
    await shop.change(DEMO_PRODUCTS[0], 1);
    await shop.change(DEMO_PRODUCTS[2], 1);
    expect(shop.total()).toBe(324700);
    const reopened = TestBed.runInInjectionContext(() => new ShopService());
    await reopened.initialize();
    expect(reopened.count()).toBe(3);
    expect(reopened.total()).toBe(324700);
  });

  it('rechaza la compra sin sesión y las cantidades superiores al stock', async () => {
    await shop.change(DEMO_PRODUCTS[0], 1);
    await expect(shop.checkout()).rejects.toThrow('Inicia sesión');
    await expect(shop.change(DEMO_PRODUCTS[0], 12)).rejects.toThrow('unidades disponibles');
    expect(shop.count()).toBe(1);
  });

  it('conserva el comprobante, descuenta existencias y vacía el carrito', async () => {
    auth.enterDemo();
    await shop.change(DEMO_PRODUCTS[0], 2);
    const order = await shop.checkout();
    expect(order.total).toBe(259800);
    expect(order.payment_status).toBe('simulated');
    expect(order.items[0].quantity).toBe(2);
    expect(shop.count()).toBe(0);
    expect(shop.products().find((product) => product.id === 'mochila')?.stock).toBe(10);
    const reopened = TestBed.runInInjectionContext(() => new ShopService());
    await reopened.initialize();
    await reopened.loadOrders();
    expect(reopened.orders()[0].id).toBe(order.id);
    expect(reopened.count()).toBe(0);
  });

  it('impide un segundo pedido concurrente y cambios de estado sin un rol autorizado', async () => {
    auth.enterDemo();
    await shop.change(DEMO_PRODUCTS[1], 1);
    const first = shop.checkout();
    await expect(shop.checkout()).rejects.toThrow('procesando');
    const order = await first;
    await auth.logout();
    await expect(shop.markDelivered(order)).rejects.toThrow('rol');
  });

  it('permite recuperar una cantidad que quedó por encima del stock disponible', async () => {
    await shop.change(DEMO_PRODUCTS[0], 3);
    await shop.change({ ...DEMO_PRODUCTS[0], stock: 1 }, -1);
    expect(shop.count()).toBe(2);
  });

  it('registra una entrega de prueba y conserva ese estado', async () => {
    auth.enterDemo();
    await shop.change(DEMO_PRODUCTS[2], 1);
    const order = await shop.checkout();
    await shop.markDelivered(order);
    const saved: Order[] = JSON.parse(storage.get('shop-demo-orders')!);
    expect(saved[0].status).toBe('delivered');
    expect(saved[0].payment_status).toBe('simulated');
  });
});
