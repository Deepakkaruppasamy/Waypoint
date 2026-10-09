import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { API_URL } from '../api.config';
import { Credentials, LoginResponse, User } from '../models/user.model';
import { sessionStore } from '../utils/safe-storage';

const TOKEN_KEY = 'waypoint.token';

/**
 * Owns the answer to "who is signed in?".
 *
 * The current user is a signal, so any component or guard that reads it
 * updates automatically on sign-in and sign-out.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  private readonly currentUser = signal<User | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isSignedIn = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'Admin');

  get token(): string | null {
    return sessionStore.get(TOKEN_KEY);
  }

  login(credentials: Credentials): Observable<User> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(({ token, user }) => {
        sessionStore.set(TOKEN_KEY, token);
        this.currentUser.set(user);
      }),
      map(({ user }) => user),
    );
  }

  logout(): void {
    sessionStore.remove(TOKEN_KEY);
    this.currentUser.set(null);
  }

  /**
   * Runs once while the app starts (see app.config.ts).
   *
   * If a token was left in this tab by an earlier visit, ask the API who it
   * belongs to. A token that is missing, expired or rejected just means
   * "not signed in" - start-up never fails because of it.
   */
  restoreSession(): Observable<User | null> {
    if (!this.token) return of(null);

    return this.http.get<User>(`${this.apiUrl}/auth/me`).pipe(
      tap((user) => this.currentUser.set(user)),
      catchError(() => {
        this.logout();
        return of(null);
      }),
    );
  }

  /** Keeps the header in sync when the signed-in user's own details change. */
  refreshUser(user: User): void {
    if (this.currentUser()?.id === user.id) this.currentUser.set(user);
  }
}
