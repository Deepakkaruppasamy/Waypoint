import { Injectable, computed, signal } from '@angular/core';

export type ApiCallState = 'pending' | 'success' | 'error' | 'cancelled';

export interface ApiCall {
  id: number;
  method: string;
  path: string;
  delayMs: number;
  state: ApiCallState;
  httpStatus?: number;
  durationMs?: number;
}

const MAX_ENTRIES = 5;

/**
 * A live log of API requests, filled in by the activity interceptor.
 *
 * It drives the progress bar in the header and the "API activity" panel on
 * the dashboard, which together make the asynchronous work visible.
 */
@Injectable({ providedIn: 'root' })
export class ApiActivityService {
  private nextId = 1;
  private readonly startTimes = new Map<number, number>();
  private readonly entries = signal<ApiCall[]>([]);

  readonly calls = this.entries.asReadonly();
  readonly pendingCount = computed(
    () => this.entries().filter((call) => call.state === 'pending').length,
  );

  start(method: string, path: string, delayMs: number): number {
    const id = this.nextId++;
    this.startTimes.set(id, performance.now());
    this.entries.update((calls) =>
      [{ id, method, path, delayMs, state: 'pending' as const }, ...calls].slice(0, MAX_ENTRIES),
    );
    return id;
  }

  finish(id: number, state: Exclude<ApiCallState, 'pending'>, httpStatus?: number): void {
    const startedAt = this.startTimes.get(id);
    if (startedAt === undefined) return; // already finished
    this.startTimes.delete(id);

    const durationMs = Math.round(performance.now() - startedAt);
    this.entries.update((calls) =>
      calls.map((call) => (call.id === id ? { ...call, state, httpStatus, durationMs } : call)),
    );
  }
}
