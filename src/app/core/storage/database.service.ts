import { Injectable, inject } from '@angular/core';
import type {
  CacheEntityType,
  CachedRecord,
  OfflineOperation,
} from '../interfaces/cache-entity';
import { StorageService } from './storage.service';

/**
 * Structured cache layer that stores entity collections and an offline
 * operation queue inside Ionic Storage (IndexedDB).
 *
 * On native devices @capacitor-community/sqlite would be used instead;
 * this implementation uses Ionic Storage as a portable fallback that
 * works on every platform including web / PWA.
 */
@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private readonly storage = inject(StorageService);

  private cacheKey(entityType: CacheEntityType): string {
    return `cache_${entityType}`;
  }

  // ---------------------------------------------------------------------------
  // Read / write cached entity collections
  // ---------------------------------------------------------------------------

  /** Returns all cached records for a given entity type. */
  async getCachedRecords<T = Record<string, unknown>>(
    entityType: CacheEntityType,
  ): Promise<CachedRecord<T>[]> {
    const raw = await this.storage.get<CachedRecord<T>[]>(
      this.cacheKey(entityType),
    );
    return raw ?? [];
  }

  /** Stores an array of records for the given entity type. */
  async setCachedRecords<T = Record<string, unknown>>(
    entityType: CacheEntityType,
    records: CachedRecord<T>[],
  ): Promise<void> {
    await this.storage.set(this.cacheKey(entityType), records);
  }

  /** Appends or replaces a single record inside the cached collection. */
  async upsertCachedRecord<T = Record<string, unknown>>(
    entityType: CacheEntityType,
    record: CachedRecord<T>,
  ): Promise<void> {
    const records = await this.getCachedRecords<T>(entityType);
    const idx = records.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      records[idx] = record;
    } else {
      records.push(record);
    }
    await this.setCachedRecords(entityType, records);
  }

  /** Removes a single record from the cached collection by id. */
  async removeCachedRecord(
    entityType: CacheEntityType,
    id: string,
  ): Promise<void> {
    const records = await this.getCachedRecords(entityType);
    await this.setCachedRecords(
      entityType,
      records.filter((r) => r.id !== id),
    );
  }

  // ---------------------------------------------------------------------------
  // Offline operation queue
  // ---------------------------------------------------------------------------

  private readonly queueKey = 'offline_queue';

  /** Returns all pending offline operations. */
  async getPendingOperations(): Promise<OfflineOperation[]> {
    const raw = await this.storage.get<OfflineOperation[]>(this.queueKey);
    return raw ?? [];
  }

  /** Adds an operation to the offline queue. */
  async enqueueOperation(op: OfflineOperation): Promise<void> {
    const queue = await this.getPendingOperations();
    queue.push(op);
    await this.storage.set(this.queueKey, queue);
  }

  /** Removes a processed operation from the queue by id. */
  async dequeueOperation(opId: string): Promise<void> {
    const queue = await this.getPendingOperations();
    await this.storage.set(
      this.queueKey,
      queue.filter((o) => o.id !== opId),
    );
  }

  /** Clears the entire offline queue (used after full sync). */
  async clearQueue(): Promise<void> {
    await this.storage.set(this.queueKey, []);
  }
}
