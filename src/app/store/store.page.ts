import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  bagHandleOutline,
  headsetOutline,
  waterOutline,
  watchOutline,
  bookOutline,
  bulbOutline,
  arrowForwardOutline,
  checkmarkCircleOutline,
  searchOutline,
  addOutline,
  removeOutline,
  receiptOutline,
  cubeOutline,
  cameraOutline,
  logOutOutline,
} from 'ionicons/icons';

import { ProductImageComponent } from '../product-image/product-image.component';
import { AuthService } from '../services/auth.service';
import type { Order, Product } from '../services/shop.models';
import { ShopService } from '../services/shop.service';

@Component({
  selector: 'app-store',
  templateUrl: './store.page.html',
  styleUrls: ['./store.page.scss'],
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonIcon,
    ProductImageComponent,
  ],
})
export class StorePage {
  readonly shop = inject(ShopService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly view = inject(ActivatedRoute).snapshot.data['view'] as string;
  readonly search = signal('');
  readonly category = signal('Todos');
  readonly selected = signal<Product | null>(null);
  readonly notice = signal('');
  readonly busy = signal(false);
  readonly receipt = signal<Order | null>(null);
  readonly categories = computed(() => ['Todos', ...new Set(this.shop.products().map((product) => product.category))]);
  readonly filtered = computed(() =>
    this.shop
      .products()
      .filter(
        (product) =>
          (this.category() === 'Todos' || product.category === this.category()) &&
          `${product.name} ${product.description}`
            .toLocaleLowerCase('es')
            .includes(this.search().trim().toLocaleLowerCase('es')),
      ),
  );
  email = '';
  password = '';
  registering = false;

  constructor() {
    effect(() => {
      if (!this.auth.user()) {
        this.receipt.set(null);
        this.notice.set('');
        this.password = '';
      }
    });
    addIcons({
      bagHandleOutline,
      headsetOutline,
      waterOutline,
      watchOutline,
      bookOutline,
      bulbOutline,
      arrowForwardOutline,
      checkmarkCircleOutline,
      searchOutline,
      addOutline,
      removeOutline,
      receiptOutline,
      cubeOutline,
      cameraOutline,
      logOutOutline,
    });
  }

  async ionViewWillEnter(): Promise<void> {
    await this.run(async () => {
      await this.shop.initialize();
      if (this.view === 'pedidos') await this.shop.loadOrders();
    });
  }

  async change(product: Product, delta: number): Promise<void> {
    await this.run(async () => {
      await this.shop.change(product, delta);
      this.notice.set(delta > 0 ? `${product.name} añadido al carrito.` : 'Carrito actualizado.');
    });
  }

  showProduct(product: Product): void {
    this.selected.set(product);
    requestAnimationFrame(() => {
      const detail = document.getElementById('product-detail');
      detail?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      detail?.focus({ preventScroll: true });
    });
  }

  async checkout(): Promise<void> {
    await this.run(async () => {
      this.receipt.set(await this.shop.checkout());
      this.notice.set('Pedido registrado. Puedes consultar el comprobante y el estado en Mis pedidos.');
    });
  }

  async submitAccount(): Promise<void> {
    await this.run(async () => {
      const email = this.email.trim();
      if (this.registering) this.notice.set(await this.auth.register(email, this.password));
      else {
        await this.auth.login(email, this.password);
        this.notice.set('Sesión iniciada. Ya puedes confirmar tu pedido.');
      }
      this.password = '';
    });
  }

  async demoLogin(): Promise<void> {
    this.auth.enterDemo();
    await this.router.navigateByUrl('/tabs/carrito');
  }

  async demoAdmin(): Promise<void> {
    this.auth.enterDemoAdmin();
    await this.router.navigateByUrl('/tabs/admin');
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.shop.clearPrivateData();
    this.receipt.set(null);
    this.password = '';
    await this.router.navigateByUrl('/tabs/cuenta');
  }

  status(order: Order): string {
    return { pending: 'En preparación', ready: 'Listo para recoger', delivered: 'Entregado' }[order.status];
  }

  async deliver(order: Order): Promise<void> {
    await this.run(async () => {
      await this.shop.markDelivered(order);
      this.notice.set('Entrega registrada.');
    });
  }

  async refresh(): Promise<void> {
    await this.run(async () => {
      this.shop.message.set('');
      await this.shop.refreshProducts();
      if (this.auth.user()) await this.shop.loadOrders();
    });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.notice.set('');
    try {
      await action();
    } catch (error) {
      this.notice.set(error instanceof Error ? error.message : 'No se pudo completar la operación.');
    } finally {
      this.busy.set(false);
    }
  }
}
