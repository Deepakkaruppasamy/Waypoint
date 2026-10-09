import { Injectable, computed, signal } from '@angular/core';
import { localStore } from '../utils/safe-storage';

const STORAGE_KEY = 'waypoint.delayMs';
const DEFAULT_DELAY_MS = 1500;

export interface DelayOption {
  ms: number;
  label: string;
}

/**
 * Holds the artificial delay the user picked in the header.
 *
 * The delay interceptor reads this value and sends it to the API as
 * "?delay=<ms>", which makes the server wait before answering.
 */
@Injectable({ providedIn: 'root' })
export class LatencyService {
  readonly options: DelayOption[] = [
    { ms: 0, label: 'None' },
    { ms: 500, label: '0.5 s' },
    { ms: 1500, label: '1.5 s' },
    { ms: 3000, label: '3 s' },
  ];

  readonly delayMs = signal(this.readSaved());
  readonly label = computed(
    () => this.options.find((option) => option.ms === this.delayMs())?.label ?? `${this.delayMs()} ms`,
  );

  set(ms: number): void {
    this.delayMs.set(ms);
    localStore.set(STORAGE_KEY, String(ms));
  }

  private readSaved(): number {
    const saved = Number(localStore.get(STORAGE_KEY) ?? NaN);
    return this.options.some((option) => option.ms === saved) ? saved : DEFAULT_DELAY_MS;
  }
}
