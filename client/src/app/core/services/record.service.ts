import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../api.config';
import { RecordsResponse } from '../models/record.model';

@Injectable({ providedIn: 'root' })
export class RecordService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  /** Records the signed-in user is allowed to see. The server decides which ones. */
  list(): Observable<RecordsResponse> {
    return this.http.get<RecordsResponse>(`${this.apiUrl}/records`);
  }
}
