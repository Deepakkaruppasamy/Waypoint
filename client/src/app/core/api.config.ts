import { InjectionToken } from '@angular/core';

/**
 * Base address of the REST API.
 *
 * In development "/api" is forwarded to http://localhost:3000 by proxy.conf.json.
 * To point the app at another server, provide a different value in app.config.ts.
 */
export const API_URL = new InjectionToken<string>('API_URL', {
  factory: () => '/api',
});
