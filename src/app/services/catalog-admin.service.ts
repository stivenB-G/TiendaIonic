import { Injectable, inject } from '@angular/core';

import { AuthService } from './auth.service';
import { shopConfig } from './shop.config';
import type { Product } from './shop.models';
import { ShopService } from './shop.service';

export const PRODUCT_PHOTO_LIMIT = 5 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export function validateProductPhoto(file: File): void {
  if (!Object.hasOwn(PHOTO_TYPES, file.type)) throw new Error('Elige una imagen JPG, PNG o WebP.');
  if (!file.size || file.size > PRODUCT_PHOTO_LIMIT) throw new Error('La fotografía debe pesar entre 1 byte y 5 MB.');
}

@Injectable({ providedIn: 'root' })
export class CatalogAdminService {
  private readonly auth = inject(AuthService);
  private readonly shop = inject(ShopService);

  private requireAdmin(): void {
    if (!this.auth.admin()) throw new Error('Solo un administrador puede gestionar productos.');
  }

  async load(): Promise<Product[]> {
    this.requireAdmin();
    if (this.auth.demo) {
      await this.shop.initialize();
      await this.shop.refreshProducts();
      return this.shop.products();
    }
    return this.request<Product[]>('/rest/v1/products?select=*&order=name.asc');
  }

  async save(product: Product, photo?: File, creating = false, expectedStock?: number): Promise<Product> {
    this.requireAdmin();
    const next: Product = {
      ...product,
      name: product.name.trim(),
      category: product.category.trim(),
      description: product.description.trim(),
    };
    if (
      !next.name ||
      next.name.length > 100 ||
      !next.category ||
      next.category.length > 60 ||
      !next.description ||
      next.description.length > 2000
    )
      throw new Error('Completa nombre, categoría y descripción dentro de los límites indicados.');
    if (!Number.isInteger(next.price) || next.price < 1 || next.price > 2147483647)
      throw new Error('El precio debe ser un número entero positivo en COP.');
    if (!Number.isInteger(next.stock) || next.stock < 0 || next.stock > 2147483647)
      throw new Error('Las existencias deben ser un número entero igual o mayor que cero.');
    if (!/^#[0-9a-f]{6}$/i.test(next.color)) throw new Error('Elige un color válido.');
    if (creating && !photo) throw new Error('Selecciona una fotografía para el nuevo producto.');
    if (!creating && (typeof expectedStock !== 'number' || !Number.isInteger(expectedStock) || expectedStock < 0))
      throw new Error('Actualiza el listado y vuelve a seleccionar el producto que deseas editar.');
    if (photo) validateProductPhoto(photo);
    if (this.auth.demo) {
      if (photo) next.image_url = await this.dataUrl(photo);
      try {
        await this.shop.saveDemoProduct(next, expectedStock);
      } catch (error) {
        if (error instanceof Error && /quota/i.test(error.message))
          throw new Error('No hay espacio local. Prueba con una fotografía más pequeña.', { cause: error });
        throw error;
      }
      return next;
    }
    if (photo) {
      const path = `${next.id}/${crypto.randomUUID()}.${PHOTO_TYPES[photo.type]}`;
      await this.request(`/storage/v1/object/product-images/${path}`, {
        method: 'POST',
        body: photo,
        headers: { 'Content-Type': photo.type },
      });
      next.image_url = `${shopConfig.supabaseUrl}/storage/v1/object/public/product-images/${path}`;
    }
    // Cada foto usa un objeto nuevo: editar un producto nunca sobrescribe la imagen publicada.
    // Si la respuesta se interrumpe se conserva el objeto, porque la escritura pudo haberse completado.
    const rows = await this.request<Product[]>(
      creating
        ? '/rest/v1/products'
        : `/rest/v1/products?id=eq.${encodeURIComponent(next.id)}&stock=eq.${expectedStock}`,
      {
        method: creating ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(next),
      },
    );
    if (!rows[0])
      throw new Error(
        'El producto o sus existencias cambiaron mientras editabas. Actualiza el listado y vuelve a abrirlo para conservar las ventas recientes.',
      );
    const saved = rows[0];
    this.shop.products.update((items) => [...items.filter((item) => item.id !== saved.id), saved]);
    return saved;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    this.requireAdmin();
    if (!shopConfig.supabaseUrl.startsWith('https://')) throw new Error('Supabase debe usar HTTPS.');
    const token = await this.auth.token();
    const response = await fetch(`${shopConfig.supabaseUrl}${path}`, {
      ...init,
      headers: { apikey: shopConfig.supabaseKey, Authorization: `Bearer ${token}`, ...init.headers },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403)
        throw new Error('No tienes permiso para esta operación. Verifica tu rol de administrador y vuelve a ingresar.');
      if (response.status === 413)
        throw new Error('La imagen supera el tamaño permitido. Usa una imagen de hasta 5 MB.');
      throw new Error(
        'No se pudo guardar o consultar el catálogo. Comprueba la conexión y ejecuta el schema.sql actualizado en Supabase antes de reintentar.',
      );
    }
    return response.json();
  }

  private dataUrl(photo: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('No se pudo leer la fotografía.'));
      reader.readAsDataURL(photo);
    });
  }
}
