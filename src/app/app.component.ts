import { Component, effect, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { Router } from '@angular/router';

import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    // Si no hay usuario y no es modo demo, redirigir a la pestaña de cuenta para mostrar el login
    effect(() => {
      const user = this.auth.user();
      if (!user && !this.auth.demo) {
        const currentUrl = this.router.url;
        // Solo redirigir si no está ya en la pestaña de cuenta
        if (!currentUrl.includes('/tabs/cuenta')) {
          this.router.navigateByUrl('/tabs/cuenta');
        }
      }
    });
  }
}
