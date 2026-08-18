import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { permissionForPath } from '../auth/permissions';

export function permissionGuard(...needed: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (needed.every((key) => auth.hasPermission(key))) return true;
    return router.createUrlTree(['/dashboard']);
  };
}

export const routePermissionGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const path = state.url.split('?')[0];
  const needed = permissionForPath(path);
  if (!needed || auth.hasPermission(needed)) return true;
  return router.createUrlTree(['/dashboard']);
};
