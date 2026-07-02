import { TestBed } from '@angular/core/testing';
import { OfflineManagerService } from './offline-manager.service';
import { DatabaseService } from '../storage/database.service';
import { StorageService } from '../storage/storage.service';
import {
  createDatabaseServiceMock,
  createStorageServiceMock,
} from '../../../testing/mock-factories';
import { firstValueFrom } from 'rxjs';

const originalOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');

function mockOnLine(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    value,
    configurable: true,
    writable: true,
  });
}

describe('OfflineManagerService', () => {
  let service: OfflineManagerService;
  let databaseMock: ReturnType<typeof createDatabaseServiceMock>;
  let storageMock: ReturnType<typeof createStorageServiceMock>;

  beforeEach(() => {
    mockOnLine(true);
    databaseMock = createDatabaseServiceMock();
    storageMock = createStorageServiceMock();

    TestBed.configureTestingModule({
      providers: [
        OfflineManagerService,
        { provide: DatabaseService, useValue: databaseMock },
        { provide: StorageService, useValue: storageMock },
      ],
    });
    service = TestBed.inject(OfflineManagerService);
  });

  afterEach(() => {
    if (originalOnLine) {
      Object.defineProperty(navigator, 'onLine', originalOnLine);
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('isOnline should reflect navigator.onLine', () => {
    mockOnLine(true);
    expect(service.isOnline).toBe(true);
    mockOnLine(false);
    expect(service.isOnline).toBe(false);
  });

  it('isOnline$ should emit connectivity changes', async () => {
    const promise = firstValueFrom(service.isOnline$);
    window.dispatchEvent(new Event('offline'));
    expect(await promise).toBe(false);
  });

  it('isOnline$ should emit true when browser comes online', async () => {
    const promise = firstValueFrom(service.isOnline$);
    window.dispatchEvent(new Event('online'));
    expect(await promise).toBe(true);
  });

  describe('fetchWithCache', () => {
    it('should return network data and cache it when online', async () => {
      const fresh = [{ id: '1', name: 'A' }];
      const fetchFn = vi.fn().mockResolvedValue(fresh);

      const result = await service.fetchWithCache(
        'announcements',
        fetchFn,
        (item: { id: string }) => item.id,
      );

      expect(result.data).toEqual(fresh);
      expect(result.source).toBe('network');
      expect(fetchFn).toHaveBeenCalled();
      expect(databaseMock.setCachedRecords).toHaveBeenCalled();
      expect(storageMock.setLastSyncTimestamp).toHaveBeenCalled();
    });

    it('should fall back to cached data when offline', async () => {
      mockOnLine(false);
      const cached = [{ id: '1', name: 'A' }];
      vi.mocked(databaseMock.getCachedRecords).mockResolvedValue([
        { id: '1', data: cached[0], cachedAt: '2026-01-01T00:00:00Z' },
      ]);

      const result = await service.fetchWithCache(
        'announcements',
        vi.fn().mockRejectedValue(new Error('network error')),
        (item: { id: string }) => item.id,
      );

      expect(result.data).toEqual(cached);
      expect(result.source).toBe('cache');
    });

    it('should fall back to cache on network failure', async () => {
      const cached = [{ id: '1', name: 'A' }];
      vi.mocked(databaseMock.getCachedRecords).mockResolvedValue([
        { id: '1', data: cached[0], cachedAt: '2026-01-01T00:00:00Z' },
      ]);

      const result = await service.fetchWithCache(
        'announcements',
        vi.fn().mockRejectedValue(new Error('network error')),
        (item: { id: string }) => item.id,
      );

      expect(result.source).toBe('cache');
      expect(result.data).toEqual(cached);
    });
  });

  describe('mutateWithQueue', () => {
    it('should execute mutation when online', async () => {
      const mutateFn = vi.fn().mockResolvedValue(undefined);

      await service.mutateWithQueue('INSERT', 'announcements', { id: '1' }, mutateFn);

      expect(mutateFn).toHaveBeenCalled();
      expect(databaseMock.enqueueOperation).not.toHaveBeenCalled();
    });

    it('should queue operation when offline', async () => {
      mockOnLine(false);
      const mutateFn = vi.fn().mockResolvedValue(undefined);

      await service.mutateWithQueue('INSERT', 'announcements', { id: '1' }, mutateFn);

      expect(mutateFn).not.toHaveBeenCalled();
      expect(databaseMock.enqueueOperation).toHaveBeenCalled();
    });

    it('should queue operation when mutation fails', async () => {
      const mutateFn = vi.fn().mockRejectedValue(new Error('fail'));

      await service.mutateWithQueue('INSERT', 'announcements', { id: '1' }, mutateFn);

      expect(databaseMock.enqueueOperation).toHaveBeenCalled();
    });
  });

  describe('syncPending', () => {
    it('should sync queued operations and remove them', async () => {
      const op = {
        id: 'op-1',
        operation: 'INSERT' as const,
        entityType: 'announcements' as const,
        payload: { id: '1' },
        createdAt: '2026-01-01T00:00:00Z',
        retryCount: 0,
      };
      vi.mocked(databaseMock.getPendingOperations).mockResolvedValue([op]);
      const syncFn = vi.fn().mockResolvedValue(undefined);

      const result = await service.syncPending(syncFn);

      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
      expect(databaseMock.dequeueOperation).toHaveBeenCalledWith('op-1');
    });

    it('should increment retryCount on sync failure', async () => {
      const op = {
        id: 'op-1',
        operation: 'INSERT' as const,
        entityType: 'announcements' as const,
        payload: { id: '1' },
        createdAt: '2026-01-01T00:00:00Z',
        retryCount: 0,
      };
      vi.mocked(databaseMock.getPendingOperations).mockResolvedValue([op]);
      const syncFn = vi.fn().mockRejectedValue(new Error('sync failed'));

      const result = await service.syncPending(syncFn);

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);
      expect(op.retryCount).toBe(1);
    });
  });
});
