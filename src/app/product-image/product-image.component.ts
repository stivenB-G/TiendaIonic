import { Component, input, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { bagHandleOutline, headsetOutline, waterOutline, watchOutline, bookOutline, bulbOutline } from 'ionicons/icons';

import type { Product } from '../services/shop.models';

@Component({
  selector: 'app-product-image',
  imports: [IonIcon],
  template: `
    @if (product().image_url && failed() !== product().image_url) {
      <img
        [src]="product().image_url"
        [alt]="product().name"
        loading="lazy"
        (error)="failed.set(product().image_url ?? '')"
      />
    } @else {
      <ion-icon [name]="product().icon || 'bag-handle-outline'" aria-hidden="true" />
    }
  `,
  styles: `
    :host {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      border-radius: inherit;
    }
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    ion-icon {
      font-size: 1em;
    }
  `,
})
export class ProductImageComponent {
  readonly product = input.required<Product>();
  readonly failed = signal('');

  constructor() {
    addIcons({ bagHandleOutline, headsetOutline, waterOutline, watchOutline, bookOutline, bulbOutline });
  }
}
