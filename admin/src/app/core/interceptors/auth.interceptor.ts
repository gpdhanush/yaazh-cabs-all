import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

let refreshing = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken();
  const isPublicApi = req.url.includes('/api/v1/public/');
  const isAuthRoute = req.url.includes('/api/v1/auth/admin/');

  const authReq =
    token && !isAuthRoute
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || isAuthRoute || isPublicApi) {
        return throwError(() => err);
      }
      if (refreshing) {
        auth.logout();
        return throwError(() => err);
      }
      refreshing = true;
      return auth.refresh().pipe(
        switchMap(() => {
          refreshing = false;
          const nextToken = auth.accessToken();
          const retry = nextToken
            ? req.clone({ setHeaders: { Authorization: `Bearer ${nextToken}` } })
            : req;
          return next(retry);
        }),
        catchError((refreshErr) => {
          refreshing = false;
          auth.logout();
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
