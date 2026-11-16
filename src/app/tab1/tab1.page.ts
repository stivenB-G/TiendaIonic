import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/angular';

import { PhotoService } from '../services/photo.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [DatePipe, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonButton],
})
export class Tab1Page {
  readonly gallery = inject(PhotoService);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly ready = signal(false);
  private readonly route = inject(ActivatedRoute);
  readonly orderId = signal('');

  async ionViewWillEnter(): Promise<void> {
    this.orderId.set(this.route.snapshot.queryParamMap.get('pedido') ?? '');
    this.busy.set(true);
    this.message.set('');
    try {
      await this.gallery.load();
      this.ready.set(true);
    } catch {
      this.message.set('No se pudieron cargar las fotos. Vuelve a abrir la galería para reintentar.');
    } finally {
      this.busy.set(false);
    }
  }

  async takePhoto(): Promise<void> {
    this.busy.set(true);
    this.message.set('');
    try {
      await this.gallery.capture(this.orderId() || undefined);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.message.set(
        /cancel/i.test(detail)
          ? 'Captura cancelada. Puedes intentarlo de nuevo.'
          : 'No se pudo guardar la foto. Revisa el permiso de cámara y el espacio disponible.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
