import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_URL } from '../api.config';
import { LatencyService } from '../services/latency.service';

/** Appends "?delay=<ms>" to API requests so the server answers slowly on purpose. */
export const delayInterceptor: HttpInterceptorFn = (request, next) => {
  const delayMs = inject(LatencyService).delayMs();
  const isApiCall = request.url.startsWith(inject(API_URL));

  if (!isApiCall || delayMs <= 0 || request.params.has('delay')) return next(request);

  return next(request.clone({ setParams: { delay: String(delayMs) } }));
};
