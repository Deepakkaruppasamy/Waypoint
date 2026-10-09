import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { activityInterceptor } from './core/interceptors/activity.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { delayInterceptor } from './core/interceptors/delay.interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),

    // Interceptors run top to bottom on the way out, bottom to top on the way back.
    provideHttpClient(withInterceptors([activityInterceptor, delayInterceptor, authInterceptor])),

    // App load: Angular waits for this before drawing the first page, so the
    // route guards already know whether someone is signed in.
    provideAppInitializer(() => inject(AuthService).restoreSession()),

    { provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: 'material-icons-outlined' } },
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } },
  ],
};
