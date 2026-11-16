import { CurrencyPipe } from '@angular/common';
import type { ElementRef } from '@angular/core';
import { Component, DestroyRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle } from '@ionic/angular';

import { ProductImageComponent } from '../product-image/product-image.component';
import { AuthService } from '../services/auth.service';
import { CatalogAdminService, validateProductPhoto } from '../services/catalog-admin.service';
import type { Product } from '../services/shop.models';

function emptyProduct(): Product {
  return {
    id: crypto.randomUUID(),
    name: '',
    category: '',
    description: '',
    price: 0,
    stock: 0,
    icon: 'bag-handle-outline',
    color: '#eee8db',
    image_url: null,
  };
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  imports: [CurrencyPipe, FormsModule, RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, ProductImageComponent],
})
export class AdminPage {
  readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogAdminService);
  @ViewChild('photoInput') private photoInput?: ElementRef<HTMLInputElement>;
  readonly products = signal<Product[]>([]);
  readonly query = signal('');
  readonly busy = signal(false);
  readonly notice = signal('');
  readonly photoError = signal('');
  readonly preview = signal('');
  readonly editing = signal(false);
  readonly filtered = computed(() =>
    this.products().filter((product) =>
      `${product.name} ${product.category}`
        .toLocaleLowerCase('es')
        .includes(this.query().trim().toLocaleLowerCase('es')),
    ),
  );
  draft = emptyProduct();
  photo?: File;
  private objectUrl?: string;
  private originalStock?: number;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releasePreview());
    effect(() => {
      if (!this.auth.admin()) {
        this.products.set([]);
        this.reset();
      }
    });
  }

  async ionViewWillEnter(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    if (this.busy() || !this.auth.admin()) return;
    this.busy.set(true);
    this.notice.set('');
    try {
      const products = await this.catalog.load();
      if (this.auth.admin()) this.products.set(products);
    } catch (error) {
      this.notice.set(this.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  edit(product: Product): void {
    if (this.busy()) return;
    this.reset();
    this.editing.set(true);
    this.draft = { ...product };
    this.originalStock = product.stock;
    this.preview.set(product.image_url ?? '');
    this.notice.set('');
    requestAnimationFrame(() => {
      const form = document.getElementById('product-editor');
      form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('product-name')?.focus({ preventScroll: true });
    });
  }

  selectPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.photoError.set('');
    try {
      validateProductPhoto(file);
      this.releasePreview();
      this.objectUrl = URL.createObjectURL(file);
      this.photo = file;
      this.preview.set(this.objectUrl);
    } catch (error) {
      this.photoError.set(this.errorMessage(error));
      input.value = '';
      this.photo = undefined;
      this.releasePreview();
      this.preview.set(this.draft.image_url ?? '');
    }
  }

  photoFailed(): void {
    if (!this.photo) return;
    this.photoError.set('No se pudo abrir esta imagen. Selecciona otra fotografía.');
    this.photo = undefined;
    this.releasePreview();
    this.preview.set(this.draft.image_url ?? '');
    if (this.photoInput) this.photoInput.nativeElement.value = '';
  }

  reset(): void {
    this.originalStock = undefined;
    this.releasePreview();
    this.draft = emptyProduct();
    this.editing.set(false);
    this.photo = undefined;
    this.preview.set('');
    this.photoError.set('');
    if (this.photoInput) this.photoInput.nativeElement.value = '';
  }

  async save(): Promise<void> {
    if (this.busy() || this.photoError()) return;
    this.busy.set(true);
    this.notice.set('');
    try {
      const editing = this.editing();
      const product = await this.catalog.save(this.draft, this.photo, !editing, this.originalStock);
      if (!this.auth.admin()) return;
      this.products.update((items) => [product, ...items.filter((item) => item.id !== product.id)]);
      this.reset();
      this.notice.set(
        editing
          ? 'Producto actualizado. Los cambios ya están en la tienda.'
          : 'Producto creado. Ya está disponible en la tienda.',
      );
    } catch (error) {
      this.notice.set(this.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private releasePreview(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = undefined;
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    window.location.href = '/tabs/tienda';
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'No se pudo completar la operación. Inténtalo nuevamente.';
  }
}
