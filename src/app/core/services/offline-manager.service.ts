import { Injectable, inject } from '@angular/core';
import { fromEvent, merge, Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import type {
  CacheEntityType,
  CachedRecord,
  OfflineOperation,
  OfflineOperationType,
} from '../interfaces/cache-entity';
import { DatabaseService } from '../storage/database.service';
import { StorageService } from '../storage/storage.service';

/**
 * Coordinates data access with a network-first, cache-fallback strategy.
 *
 * Flow:
 *  1. Attempt to fetch from the network (Supabase).
 *  2. On success → update local cache, return fresh data.
 *  3. On failure → return cached data if available.
 *
 * Mutations (POST / PUT / DELETE) are attempted against the network first;
 * if the network is unavailable the operation is enqueued for later sync.
 */
@Injectable({ providedIn: 'root' })
export class OfflineManagerService {
  private readonly database = inject(DatabaseService);
  private readonly storage = inject(StorageService);

  // ---------------------------------------------------------------------------
  // Connectivity observable
  // ---------------------------------------------------------------------------

  /** Emits `true` when the browser is online, `false` when offline. */
  readonly isOnline$: Observable<boolean> = merge(
    fromEvent(window, 'online').pipe(map(() => true)),
    fromEvent(window, 'offline').pipe(map(() => false)),
  ).pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /** Returns the current connectivity status synchronously. */
  get isOnline(): boolean {
    return navigator.onLine;
  }

  // ---------------------------------------------------------------------------
  // Network-first read
  // ---------------------------------------------------------------------------

  /**
   * Generic network-first fetch.
   *
   * @param entityType  Cache entity type
   * @param fetchFn     Async function that calls the Supabase API
   * @param idFn        Function that extracts a record id from the API response
   */
  async fetchWithCache<T extends Record<string, unknown>>(
    entityType: CacheEntityType,
    fetchFn: () => Promise<T[]>,
    idFn: (item: T) => string,
  ): Promise<{ data: T[]; source: 'network' | 'cache' }> {
    // 1. Try network
    if (this.isOnline) {
      try {
        const fresh = await fetchFn();
        // Persist to cache
        const cached: CachedRecord<T>[] = fresh.map((item) => ({
          id: idFn(item),
          data: item,
          cachedAt: new Date().toISOString(),
        }));
        await this.database.setCachedRecords(entityType, cached);
        await this.storage.setLastSyncTimestamp(entityType);
        return { data: fresh, source: 'network' };
      } catch {
        // Network failed – fall through to cache
      }
    }

    // 2. Fallback to cache
    const cachedRecords = await this.database.getCachedRecords<T>(entityType);
    return {
      data: cachedRecords.map((r) => r.data),
      source: 'cache',
    };
  }

  // ---------------------------------------------------------------------------
  // Offline-aware mutation
  // ---------------------------------------------------------------------------

  /**
   * Attempts a mutation against the network. On failure the operation is
   * queued for later replay.
   *
   * @param operationType  INSERT | UPDATE | DELETE
   * @param entityType     Target entity
   * @param payload        Data to send
   * @param mutateFn       Async function that performs the network request
   */
  async mutateWithQueue(
    operationType: OfflineOperationType,
    entityType: CacheEntityType,
    payload: Record<string, unknown>,
    mutateFn: () => Promise<void>,
  ): Promise<void> {
    if (this.isOnline) {
      try {
        await mutateFn();
        return;
      } catch {
        // Mutation failed – enqueue for later
      }
    }

    // Offline or failed — queue the operation
    const op: OfflineOperation = {
      id: crypto.randomUUID(),
      operation: operationType,
      entityType,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    await this.database.enqueueOperation(op);
  }

  // ---------------------------------------------------------------------------
  // Sync pending operations
  // ---------------------------------------------------------------------------

  /**
   * Replays all queued offline operations against the network.
   * Should be called when connectivity is restored.
   *
   * @param syncFn  Function that takes an OfflineOperation and performs the
   *                corresponding network request.
   */
  async syncPending(syncFn: (op: OfflineOperation) => Promise<void>): Promise<{
    synced: number;
    failed: number;
  }> {
    const queue = await this.database.getPendingOperations();
    let synced = 0;
    let failed = 0;

    for (const op of queue) {
      try {
        await syncFn(op);
        await this.database.dequeueOperation(op.id);
        synced++;
      } catch {
        op.retryCount++;
        failed++;
      }
    }

    return { synced, failed };
  }
}
