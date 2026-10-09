import { Routes } from '@angular/router';

/** Loaded only for administrators (see roleGuard in app.routes.ts). */
export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'users' },
  {
    path: 'users',
    title: 'Users - Waypoint',
    loadComponent: () => import('./users/users').then((m) => m.Users),
  },
];
