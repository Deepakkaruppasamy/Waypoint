import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../models/user.model';
import { AuthService } from '../services/auth.service';

/** Pages behind this guard need a signed-in user. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).isSignedIn()) return true;

  // Remember where the user wanted to go, so login can send them there afterwards.
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Keeps signed-in users away from the login page. */
export const guestGuard: CanActivateFn = () =>
  inject(AuthService).isSignedIn() ? inject(Router).createUrlTree(['/dashboard']) : true;

/**
 * Pages behind this guard need a specific role.
 *
 * This only hides the page. The real protection is on the server, which
 * rejects the API calls with 403 whatever the browser does.
 */
export function roleGuard(role: Role): CanActivateFn {
  return () => {
    if (inject(AuthService).user()?.role === role) return true;

    inject(MatSnackBar).open(`That page needs the ${role} role.`, 'OK', { duration: 4000 });
    return inject(Router).createUrlTree(['/dashboard']);
  };
}
