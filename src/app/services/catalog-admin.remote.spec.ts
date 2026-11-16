import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';
import { CatalogAdminService } from './catalog-admin.service';
import { shopConfig } from './shop.config';
import { DEMO_PRODUCTS } from './shop.models';
import { ShopService } from './shop.service';

describe('Administración conectada a Supabase', () => {
  const fetchMock = vi.fn();
  const isAdmin = signal(true);
  const auth = { demo: false, admin: isAdmin, user: signal({ id: 'admin-a' }), token: async () => 'admin-token' };
  const product = { ...DEMO_PRODUCTS[0], id: 'new-product', image_url: 'https://test.supabase.co/old.png' };
  const photo = () => new File(['photo'], 'producto.png', { type: 'image/png' });

  beforeEach(() => {
    shopConfig.supabaseUrl = 'https://test.supabase.co';
    shopConfig.supabaseKey = 'public-test-key';
    fetchMock.mockReset();
    isAdmin.set(true);
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: auth }] });
  });
  afterEach(() => {
    shopConfig.supabaseUrl = '';
    shopConfig.supabaseKey = '';
    vi.unstubAllGlobals();
  });

  it('sube la foto con JWT y luego crea el producto con su URL pública', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ Key: 'saved' })));
    fetchMock.mockImplementationOnce(async (_url, init) => new Response(JSON.stringify([JSON.parse(init.body)])));
    const catalog = TestBed.inject(CatalogAdminService);
    const saved = await catalog.save(product, photo(), true);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/storage\/v1\/object\/product-images\/new-product\/.+\.png$/);
    expect(fetchMock.mock.calls[0][1].body).toBeInstanceOf(File);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer admin-token');
    expect(fetchMock.mock.calls[1][0]).toBe('https://test.supabase.co/rest/v1/products');
    expect(fetchMock.mock.calls[1][1].method).toBe('POST');
    expect(saved.image_url).toContain('/storage/v1/object/public/product-images/new-product/');
    expect(TestBed.inject(ShopService).products()[0]).toEqual(saved);
  });

  it('edita datos mediante PATCH y conserva la foto existente', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([{ ...product, price: 150000 }])));
    const catalog = TestBed.inject(CatalogAdminService);
    await catalog.save({ ...product, price: 150000 }, undefined, false, product.stock);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/rest/v1/products?id=eq.new-product');
    expect(fetchMock.mock.calls[0][0]).toContain(`&stock=eq.${product.stock}`);
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).image_url).toBe(product.image_url);
  });

  it('no crea un producto cuando Storage rechaza la carga', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 403 }));
    const catalog = TestBed.inject(CatalogAdminService);
    await expect(catalog.save(product, photo(), true)).rejects.toThrow('permiso');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(ShopService).products()).toEqual([]);
  });

  it('informa un conflicto de inventario sin publicar un cambio local que sobrescriba ventas recientes', async () => {
    fetchMock.mockResolvedValueOnce(new Response('[]'));
    const catalog = TestBed.inject(CatalogAdminService);
    await expect(catalog.save({ ...product, stock: 20 }, undefined, false, product.stock)).rejects.toThrow(
      'existencias cambiaron',
    );
    expect(TestBed.inject(ShopService).products()).toEqual([]);
  });

  it('no realiza solicitudes cuando la cuenta no es administradora', async () => {
    isAdmin.set(false);
    const catalog = TestBed.inject(CatalogAdminService);
    await expect(catalog.load()).rejects.toThrow('administrador');
    await expect(catalog.save(product, photo(), true)).rejects.toThrow('administrador');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
