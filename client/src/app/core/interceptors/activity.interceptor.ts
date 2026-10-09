import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, tap } from 'rxjs';
import { API_URL } from '../api.config';
import { ApiActivityService } from '../services/api-activity.service';
import { LatencyService } from '../services/latency.service';

/** Records when each API request starts and how it ends. */
export const activityInterceptor: HttpInterceptorFn = (request, next) => {
  const apiUrl = inject(API_URL);
  if (!request.url.startsWith(apiUrl)) return next(request);

  const activity = inject(ApiActivityService);
  const delayMs = inject(LatencyService).delayMs();
  const id = activity.start(request.method, request.url, delayMs);

  return next(request).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) activity.finish(id, 'success', event.status);
      },
      error: (error: unknown) => {
        const status = error instanceof HttpErrorResponse ? error.status : undefined;
        activity.finish(id, 'error', status);
      },
    }),
    // Still pending here means nobody is waiting any more (for example the user left the page).
    finalize(() => activity.finish(id, 'cancelled')),
  );
};
