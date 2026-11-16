import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';
import { shopConfig } from './shop.config';
import { DEMO_PRODUCTS } from './shop.models';
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

describe('ShopService conectado', () => {
  const fetchMock = vi.fn();
  const auth = {
    demo: false,
    user: signal<{ id: string } | null>({ id: 'customer-a' }),
    token: async () => 'token-test',
    operator: () => false,
  };
  beforeEach(() => {
    shopConfig.supabaseUrl = 'https://test.supabase.co';
    shopConfig.supabaseKey = 'public-test-key';
    storage.clear();
    auth.user.set({ id: 'customer-a' });
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: auth }] });
  });
  afterEach(() => {
    shopConfig.supabaseUrl = '';
    shopConfig.supabaseKey = '';
    vi.unstubAllGlobals();
  });

  it('envía solo cantidades e identificadores y conserva el identificador de reintento tras recargar', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(DEMO_PRODUCTS)));
    const shop = TestBed.inject(ShopService);
    await shop.initialize();
    await shop.change(DEMO_PRODUCTS[0], 1);
    fetchMock.mockRejectedValueOnce(new Error('Respuesta perdida'));
    await expect(shop.checkout()).rejects.toThrow('Respuesta perdida');
    const first = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(first.p_items).toEqual([{ productId: 'mochila', quantity: 1 }]);
    expect(shop.count()).toBe(1);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(DEMO_PRODUCTS)));
    const reopened = TestBed.runInInjectionContext(() => new ShopService());
    await reopened.initialize();
    fetchMock.mockRejectedValueOnce(new Error('Otra interrupción'));
    await expect(reopened.checkout()).rejects.toThrow('Otra interrupción');
    expect(JSON.parse(fetchMock.mock.calls[3][1].body).p_request_id).toBe(first.p_request_id);
    expect(fetchMock.mock.calls[3][1].headers.Authorization).toBe('Bearer token-test');
  });

  it('recupera un catálogo guardado al fallar la conexión', async () => {
    storage.set('shop-https://test.supabase.co-catalog', JSON.stringify(DEMO_PRODUCTS));
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const shop = TestBed.inject(ShopService);
    await shop.initialize();
    expect(shop.products()).toHaveLength(6);
    expect(shop.cached()).toBe(true);
    expect(shop.message()).toContain('sin conexión');
  });

  it('descarta consultas privadas que terminan después de cerrar la sesión', async () => {
    let respond!: (value: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        respond = resolve;
      }),
    );
    const shop = TestBed.inject(ShopService);
    const loading = shop.loadOrders();
    await Promise.resolve();
    auth.user.set(null);
    respond(new Response(JSON.stringify([{ id: 'private-order' }])));
    await loading;
    expect(shop.orders()).toEqual([]);
  });
});
