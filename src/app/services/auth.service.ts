import { Injectable, computed, signal } from '@angular/core';

import { shopConfig } from './shop.config';

interface AuthUser {
  id: string;
  email: string;
  app_metadata?: { role?: string };
}
interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly demo = !shopConfig.supabaseUrl && !shopConfig.supabaseKey;
  readonly user = signal<AuthUser | null>(null);
  readonly admin = computed(() => this.user()?.app_metadata?.role === 'admin');
  readonly operator = computed(
    () => !!this.user() && (this.demo || ['admin', 'operator'].includes(this.user()?.app_metadata?.role ?? '')),
  );
  private session: Session | null = null;
  private expiresAt = 0;
  private refreshing?: Promise<void>;

  enterDemo(): void {
    if (!this.demo) throw new Error('La demostración está desactivada.');
    this.user.set({ id: 'demo', email: 'cliente@demo.local' });
  }

  enterDemoAdmin(): void {
    if (!this.demo) throw new Error('La demostración está desactivada.');
    this.user.set({ id: 'demo-admin', email: 'admin@demo.local', app_metadata: { role: 'admin' } });
  }

  async login(email: string, password: string): Promise<void> {
    this.accept(await this.authRequest('/token?grant_type=password', { email, password }));
  }

  async register(email: string, password: string): Promise<string> {
    const result = await this.authRequest('/signup', { email, password });
    if (result.access_token) {
      this.accept(result);
      return 'Cuenta creada. Ya puedes realizar tu pedido.';
    }
    return 'Revisa tu correo para confirmar la cuenta y luego inicia sesión.';
  }

  async logout(): Promise<void> {
    const token = this.session?.access_token;
    this.session = null;
    this.user.set(null);
    if (token) {
      await fetch(`${shopConfig.supabaseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: shopConfig.supabaseKey, Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
  }

  async token(): Promise<string> {
    if (!this.session) throw new Error('Inicia sesión para continuar.');
    if (Date.now() >= this.expiresAt) {
      this.refreshing ??= this.refresh().finally(() => {
        this.refreshing = undefined;
      });
      await this.refreshing;
    }
    if (!this.session) throw new Error('Tu sesión terminó. Vuelve a ingresar.');
    return this.session.access_token;
  }

  private async refresh(): Promise<void> {
    try {
      this.accept(
        await this.authRequest('/token?grant_type=refresh_token', { refresh_token: this.session?.refresh_token }),
      );
    } catch (error) {
      this.session = null;
      this.user.set(null);
      throw error;
    }
  }

  private accept(session: Session): void {
    this.session = session;
    this.expiresAt = Date.now() + (session.expires_in - 60) * 1000;
    this.user.set(session.user);
  }

  private async authRequest(path: string, body: object): Promise<Session> {
    if (this.demo) throw new Error('Configura Supabase para usar cuentas reales.');
    if (!shopConfig.supabaseUrl.startsWith('https://')) throw new Error('Supabase debe usar HTTPS.');
    const response = await fetch(`${shopConfig.supabaseUrl}/auth/v1${path}`, {
      method: 'POST',
      headers: { apikey: shopConfig.supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      let detail = '';
      try {
        const err = await response.json();
        detail = err.msg || err.message || '';
      } catch {}
      if (detail.includes('Invalid login credentials') || detail.includes('Invalid credentials')) {
        throw new Error('El correo o la contraseña no coinciden. Revisa tus datos o crea una cuenta primero.');
      }
      if (detail.includes('Email not confirmed') || detail.includes('not confirmed')) {
        throw new Error('Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.');
      }
      if (detail.includes('rate limit') || detail.includes('rate_limit')) {
        throw new Error('Demasiados intentos. Espera un momento e inténtalo de nuevo.');
      }
      if (response.status === 0 || response.status >= 500) {
        throw new Error('No se puede conectar con el servidor. Revisa tu conexión a internet.');
      }
      throw new Error('No se pudo completar el acceso. Revisa tus datos o intenta más tarde.');
    }
    return response.json();
  }
}
