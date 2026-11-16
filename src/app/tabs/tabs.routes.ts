import type { Routes } from '@angular/router';

import { adminGuard, customerGuard, operatorGuard } from '../services/shop.guard';

import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('../admin/admin.page').then((m) => m.AdminPage),
      },
      ...['tienda', 'carrito', 'cuenta', 'pedidos'].map((view) => ({
        path: view,
        data: { view },
        ...(view === 'pedidos' ? { canActivate: [customerGuard] } : {}),
        loadComponent: () => import('../store/store.page').then((m) => m.StorePage),
      })),
      {
        path: 'evidencias',
        canActivate: [operatorGuard],
        loadComponent: () => import('../tab1/tab1.page').then((m) => m.Tab1Page),
      },
      {
        path: '',
        redirectTo: '/tabs/tienda',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/tienda',
    pathMatch: 'full',
  },
];
