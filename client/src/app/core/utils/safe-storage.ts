/**
 * Thin wrapper around browser storage.
 *
 * Storage can throw (private windows, blocked site data), so every call is
 * guarded and the app keeps working without it.
 */
export class SafeStorage {
  constructor(private readonly storage: () => Storage) {}

  get(key: string): string | null {
    try {
      return this.storage().getItem(key);
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      this.storage().setItem(key, value);
    } catch {
      /* ignore: the value simply will not be remembered */
    }
  }

  remove(key: string): void {
    try {
      this.storage().removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

/** Cleared when the browser tab is closed. Used for the login token. */
export const sessionStore = new SafeStorage(() => sessionStorage);

/** Survives restarts. Used for harmless preferences. */
export const localStore = new SafeStorage(() => localStorage);
