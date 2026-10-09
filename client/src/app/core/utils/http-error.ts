import { HttpErrorResponse } from '@angular/common/http';

interface ApiErrorBody {
  message?: string;
  details?: { field: string; message: string }[];
}

/** Turns any failed request into one sentence that is safe to show to the user. */
export function describeHttpError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Something unexpected happened. Please try again.';
  }
  if (error.status === 0) {
    return 'Cannot reach the API. Check that the server is running on port 3000.';
  }

  const body = error.error as ApiErrorBody | null;
  if (body?.details?.length) {
    return body.details.map((detail) => detail.message).join('. ') + '.';
  }
  return body?.message ?? `The request failed (HTTP ${error.status}).`;
}
