import { Component, EnvironmentInjector, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { storefrontOutline, bagHandleOutline, receiptOutline, personOutline, settingsOutline } from 'ionicons/icons';

import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);
  readonly auth = inject(AuthService);

  constructor() {
    addIcons({ storefrontOutline, bagHandleOutline, receiptOutline, personOutline, settingsOutline });
  }
}
