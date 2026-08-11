import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../loading/loading.service';

const SKIP = [/\/live-tracking(?:\?|$)/, /\/auth\/admin\/refresh(?:\?|$)/];

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (SKIP.some((re) => re.test(req.url))) return next(req);
  const loading = inject(LoadingService);
  loading.begin();
  return next(req).pipe(finalize(() => loading.end()));
};
