import { TestBed } from '@angular/core/testing';
import { DatabaseService } from './database.service';
import { StorageService } from './storage.service';
import type { CachedRecord, OfflineOperation } from '../interfaces/cache-entity';

function createStorageSpy(): StorageService {
  return {
    init: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    getAuthToken: vi.fn(),
    setAuthToken: vi.fn(),
    getLastSyncTimestamp: vi.fn(),
    setLastSyncTimestamp: vi.fn(),
  } as unknown as StorageService;
}

describe('DatabaseService', () => {
  let service: DatabaseService;
  let storageSpy: StorageService;

  beforeEach(() => {
    storageSpy = createStorageSpy();
    TestBed.configureTestingModule({
      providers: [
        DatabaseService,
        { provide: StorageService, useValue: storageSpy },
      ],
    });
    service = TestBed.inject(DatabaseService);
  });

  // ------------------------------------------------------------------
  // Cached records
  // ------------------------------------------------------------------

  describe('getCachedRecords / setCachedRecords', () => {
    it('should return empty array when no cache exists', async () => {
      vi.mocked(storageSpy.get).mockResolvedValue(null);
      await expect(service.getCachedRecords('announcements')).resolves.toEqual([]);
    });

    it('should store and retrieve cached records', async () => {
      const sample: CachedRecord[] = [
        { id: '1', data: { title: 'Test' }, cachedAt: new Date().toISOString() },
      ];
      vi.mocked(storageSpy.get).mockResolvedValue(sample);

      await service.setCachedRecords('announcements', sample);
      const result = await service.getCachedRecords('announcements');

      expect(storageSpy.set).toHaveBeenCalledWith('cache_announcements', sample);
      expect(result).toEqual(sample);
    });
  });

  describe('upsertCachedRecord', () => {
    it('should add a new record when id is not found', async () => {
      vi.mocked(storageSpy.get).mockResolvedValue([]);

      const record: CachedRecord = {
        id: 'new-1', data: { name: 'New' }, cachedAt: new Date().toISOString(),
      };
      await service.upsertCachedRecord('faq_entries', record);

      expect(storageSpy.set).toHaveBeenCalledWith('cache_faq_entries', [record]);
    });

    it('should replace an existing record by id', async () => {
      const existing: CachedRecord = {
        id: '1', data: { name: 'Old' }, cachedAt: '2025-01-01T00:00:00Z',
      };
      const updated: CachedRecord = {
        id: '1', data: { name: 'Updated' }, cachedAt: '2026-01-01T00:00:00Z',
      };
      vi.mocked(storageSpy.get).mockResolvedValue([existing]);

      await service.upsertCachedRecord('faq_entries', updated);

      expect(storageSpy.set).toHaveBeenCalledWith('cache_faq_entries', [updated]);
    });
  });

  describe('removeCachedRecord', () => {
    it('should remove a record by id', async () => {
      vi.mocked(storageSpy.get).mockResolvedValue([
        { id: '1', data: {} }, { id: '2', data: {} },
      ] as CachedRecord[]);

      await service.removeCachedRecord('notices', '1');

      expect(storageSpy.set).toHaveBeenCalledWith('cache_notices', [
        { id: '2', data: {} },
      ]);
    });
  });

  // ------------------------------------------------------------------
  // Offline queue
  // ------------------------------------------------------------------

  describe('offline operation queue', () => {
    it('should return empty queue initially', async () => {
      vi.mocked(storageSpy.get).mockResolvedValue(null);
      await expect(service.getPendingOperations()).resolves.toEqual([]);
    });

    it('should enqueue and dequeue operations', async () => {
      vi.mocked(storageSpy.get).mockResolvedValue([]);

      const op: OfflineOperation = {
        id: 'op-1', operation: 'INSERT', entityType: 'surveys',
        payload: { title: 'Test' }, createdAt: new Date().toISOString(), retryCount: 0,
      };

      await service.enqueueOperation(op);
      expect(storageSpy.set).toHaveBeenCalledWith('offline_queue', [op]);

      vi.mocked(storageSpy.get).mockResolvedValue([op]);
      await service.dequeueOperation('op-1');
      expect(storageSpy.set).toHaveBeenCalledWith('offline_queue', []);
    });
  });
});
