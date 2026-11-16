import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthService } from './auth.service';

export const customerGuard: CanActivateFn = () =>
  inject(AuthService).user() ? true : inject(Router).createUrlTree(['/tabs/cuenta']);
export const operatorGuard: CanActivateFn = () =>
  inject(AuthService).operator() ? true : inject(Router).createUrlTree(['/tabs/cuenta']);
export const adminGuard: CanActivateFn = () =>
  inject(AuthService).admin() ? true : inject(Router).createUrlTree(['/tabs/cuenta']);
