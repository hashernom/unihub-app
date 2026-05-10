import { TestBed } from '@angular/core/testing';
import { Storage } from '@ionic/storage-angular';
import { StorageService } from './storage.service';

function createStorageMock(): Storage {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    length: vi.fn(),
    keys: vi.fn(),
    forEach: vi.fn(),
    driver: '',
    ready: vi.fn(),
  } as unknown as Storage;
}

describe('StorageService', () => {
  let service: StorageService;
  let storageMock: Storage;

  beforeEach(async () => {
    storageMock = createStorageMock();
    TestBed.configureTestingModule({
      providers: [
        StorageService,
        { provide: Storage, useValue: storageMock },
      ],
    });
    service = TestBed.inject(StorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('init', () => {
    it('should call storage.create once', async () => {
      await service.init();
      expect(storageMock.create).toHaveBeenCalledTimes(1);
    });

    it('should not call storage.create twice', async () => {
      await service.init();
      await service.init();
      expect(storageMock.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('get / set / remove', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('should return null for missing keys', async () => {
      vi.mocked(storageMock.get).mockResolvedValue(null);
      await expect(service.get('nonexistent')).resolves.toBeNull();
    });

    it('should store a value via set', async () => {
      await service.set('theme', 'dark');
      expect(storageMock.set).toHaveBeenCalledWith('theme', 'dark');
    });

    it('should retrieve a previously stored value', async () => {
      vi.mocked(storageMock.get).mockResolvedValue('dark');
      const result = await service.get<string>('theme');
      expect(result).toBe('dark');
    });

    it('should remove a key', async () => {
      await service.remove('auth_token');
      expect(storageMock.remove).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('auth token shortcuts', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('should set and get auth token', async () => {
      vi.mocked(storageMock.get).mockResolvedValue('my-jwt');

      await service.setAuthToken('my-jwt');
      const token = await service.getAuthToken();

      expect(token).toBe('my-jwt');
    });

    it('should remove auth token when null', async () => {
      await service.setAuthToken(null);
      expect(storageMock.remove).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('sync timestamps', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('should return null for unsynced entities', async () => {
      vi.mocked(storageMock.get).mockResolvedValue(null);
      await expect(service.getLastSyncTimestamp('announcements')).resolves.toBeNull();
    });

    it('should set a sync timestamp', async () => {
      await service.setLastSyncTimestamp('events');
      expect(storageMock.set).toHaveBeenCalledWith('sync_events', expect.any(String));
    });
  });
});
