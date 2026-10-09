import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../api.config';
import { NewUser, User, UserChanges } from '../models/user.model';

/** Every user-related API call lives here, so components never build URLs themselves. */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  /** Details of the signed-in user. */
  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`);
  }

  // --- Admin only: the API answers 403 for anyone else ---

  list(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }

  create(user: NewUser): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, user);
  }

  update(id: string, changes: UserChanges): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, changes);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${id}`);
  }
}
