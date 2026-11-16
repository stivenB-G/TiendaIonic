import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';
import { shopConfig } from './shop.config';

describe('AuthService conectado', () => {
  const fetchMock = vi.fn();
  const session = {
    access_token: 'access-test',
    refresh_token: 'refresh-test',
    expires_in: 3600,
    user: {
      id: 'customer-a',
      email: 'cliente@example.com',
      app_metadata: { role: 'customer' },
      user_metadata: { role: 'admin' },
    },
  };
  beforeEach(() => {
    shopConfig.supabaseUrl = 'https://test.supabase.co';
    shopConfig.supabaseKey = 'public-test-key';
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    shopConfig.supabaseUrl = '';
    shopConfig.supabaseKey = '';
    vi.unstubAllGlobals();
  });

  it('ingresa por HTTPS y no concede roles desde metadatos editables por el cliente', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(session)));
    const auth = new AuthService();
    await auth.login('cliente@example.com', 'password-test');
    expect(await auth.token()).toBe('access-test');
    expect(auth.operator()).toBe(false);
    expect(auth.admin()).toBe(false);
    expect(fetchMock.mock.calls[0][0]).toBe('https://test.supabase.co/auth/v1/token?grant_type=password');
    await expect(async () => auth.enterDemo()).rejects.toThrow('desactivada');
    await expect(async () => auth.enterDemoAdmin()).rejects.toThrow('desactivada');
  });

  it('renueva un token caducado y cierra la sesión cuando falla la renovación', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ...session, expires_in: 30 })));
    const auth = new AuthService();
    await auth.login('cliente@example.com', 'password-test');
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }));
    await expect(auth.token()).rejects.toThrow('acceso');
    expect(auth.user()).toBeNull();
    expect(fetchMock.mock.calls[1][0]).toContain('grant_type=refresh_token');
  });

  it('informa la confirmación de correo sin crear una sesión falsa', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ user: session.user })));
    const auth = new AuthService();
    expect(await auth.register('cliente@example.com', 'password-test')).toContain('confirmar');
    expect(auth.user()).toBeNull();
  });

  it('el cierre elimina inmediatamente el acceso aunque falle la red', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(session)));
    const auth = new AuthService();
    await auth.login('cliente@example.com', 'password-test');
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await auth.logout();
    expect(auth.user()).toBeNull();
    await expect(auth.token()).rejects.toThrow('Inicia sesión');
  });
});
