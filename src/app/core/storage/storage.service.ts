import { Injectable, inject } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

/**
 * Key-value storage backed by Ionic Storage (IndexedDB on web,
 * native storage on devices).
 *
 * Used for: auth token, user preferences, last sync timestamp.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly storage = inject(Storage);
  private initialized = false;

  /** Initialises the underlying Ionic Storage instance. */
  async init(): Promise<void> {
    if (this.initialized) return;
    await this.storage.create();
    this.initialized = true;
  }

  // ---------------------------------------------------------------------------
  // Generic key-value operations
  // ---------------------------------------------------------------------------

  async get<T = unknown>(key: string): Promise<T | null> {
    await this.init();
    const value = await this.storage.get(key);
    return (value as T) ?? null;
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.init();
    await this.storage.set(key, value);
  }

  async remove(key: string): Promise<void> {
    await this.init();
    await this.storage.remove(key);
  }

  async clear(): Promise<void> {
    await this.init();
    await this.storage.clear();
  }

  // ---------------------------------------------------------------------------
  // Convenience accessors
  // ---------------------------------------------------------------------------

  async getAuthToken(): Promise<string | null> {
    return this.get<string>('auth_token');
  }

  async setAuthToken(token: string | null): Promise<void> {
    if (token) {
      await this.set('auth_token', token);
    } else {
      await this.remove('auth_token');
    }
  }

  async getLastSyncTimestamp(entityType: string): Promise<string | null> {
    return this.get<string>(`sync_${entityType}`);
  }

  async setLastSyncTimestamp(entityType: string): Promise<void> {
    await this.set(`sync_${entityType}`, new Date().toISOString());
  }
}
