import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';
import { CatalogAdminService, PRODUCT_PHOTO_LIMIT, validateProductPhoto } from './catalog-admin.service';
import { DEMO_PRODUCTS, type Product } from './shop.models';
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

describe('Administración de catálogo en demostración', () => {
  let auth: AuthService;
  let shop: ShopService;
  let catalog: CatalogAdminService;
  const photo = () => new File(['photo'], 'producto.png', { type: 'image/png' });
  const product = (): Product => ({ ...DEMO_PRODUCTS[0], id: 'new-product', name: 'Producto nuevo', stock: 7 });

  beforeEach(async () => {
    storage.clear();
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthService);
    shop = TestBed.inject(ShopService);
    catalog = TestBed.inject(CatalogAdminService);
    await shop.initialize();
  });

  it('impide leer el panel o guardar productos como cliente o logística', async () => {
    auth.enterDemo();
    expect(auth.admin()).toBe(false);
    await expect(catalog.load()).rejects.toThrow('administrador');
    await expect(catalog.save(product(), photo(), true)).rejects.toThrow('administrador');
    await expect(shop.saveDemoProduct(product())).rejects.toThrow('administrador');
    auth.user.set({ id: 'operator', email: 'operator@example.com', app_metadata: { role: 'operator' } });
    await expect(catalog.save(product(), photo(), true)).rejects.toThrow('administrador');
  });

  it('crea un producto con foto y conserva los datos después de reiniciar', async () => {
    auth.enterDemoAdmin();
    const saved = await catalog.save(product(), photo(), true);
    expect(saved.image_url).toMatch(/^data:image\/png;base64,/);
    const reopened = TestBed.runInInjectionContext(() => new ShopService());
    await reopened.initialize();
    expect(reopened.products().find((item) => item.id === saved.id)).toEqual(saved);
  });

  it('valida foto obligatoria, precio y existencias antes de escribir', async () => {
    auth.enterDemoAdmin();
    await expect(catalog.save(product(), undefined, true)).rejects.toThrow('fotografía');
    await expect(catalog.save({ ...product(), price: 2.5 }, photo(), true)).rejects.toThrow('entero positivo');
    await expect(catalog.save({ ...product(), stock: -1 }, photo(), true)).rejects.toThrow('existencias');
    expect(storage.has('shop-demo-products')).toBe(false);
  });

  it('rechaza archivos vacíos, formatos no permitidos y fotos de más de 5 MB', () => {
    expect(() => validateProductPhoto(new File(['svg'], 'imagen.svg', { type: 'image/svg+xml' }))).toThrow('JPG');
    expect(() => validateProductPhoto(new File([], 'empty.png', { type: 'image/png' }))).toThrow('5 MB');
    expect(() =>
      validateProductPhoto(new File([new Uint8Array(PRODUCT_PHOTO_LIMIT + 1)], 'big.png', { type: 'image/png' })),
    ).toThrow('5 MB');
  });

  it('permite editar datos conservando la foto y reponer el stock sin descontar ventas dos veces', async () => {
    auth.enterDemo();
    await shop.change(DEMO_PRODUCTS[0], 2);
    await shop.checkout();
    auth.enterDemoAdmin();
    const existing = shop.products().find((item) => item.id === 'mochila')!;
    const withPhoto = await catalog.save({ ...existing, stock: 15 }, photo(), false, existing.stock);
    const updated = await catalog.save(
      { ...withPhoto, name: 'Mochila nueva', price: 140000 },
      undefined,
      false,
      withPhoto.stock,
    );
    await shop.refreshProducts();
    const loaded = shop.products().find((item) => item.id === 'mochila')!;
    expect(loaded.stock).toBe(15);
    expect(loaded.name).toBe('Mochila nueva');
    expect(loaded.price).toBe(140000);
    expect(loaded.image_url).toBe(updated.image_url);
  });
});
