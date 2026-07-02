import { TestBed } from '@angular/core/testing';
import { Storage } from '@ionic/storage-angular';
import { AnnouncementService, type Announcement } from './announcement.service';
import { SupabaseService } from './supabase.service';
import { OfflineManagerService } from './offline-manager.service';
import { DatabaseService } from '../storage/database.service';
import { StorageService } from '../storage/storage.service';
import { createSupabaseServiceMock, type QueryBuilderMock } from '../../../testing/mock-factories';

const futureDate = (days = 7) => new Date(Date.now() + days * 86400_000).toISOString();
const pastDate = (days = 7) => new Date(Date.now() - days * 86400_000).toISOString();

const mockAnnouncements: Announcement[] = [
  {
    id: '1', title: 'Urgente: Suspensión de clases',
    body: 'Por motivos de fuerza mayor se suspenden las clases.',
    category: 'urgent', is_pinned: true,
    created_by: 'admin-1', expires_at: futureDate(30),
    created_at: pastDate(5), updated_at: pastDate(5),
  },
  {
    id: '2', title: 'Inscripciones abiertas',
    body: 'Las inscripciones para el próximo semestre están abiertas.',
    category: 'academic', is_pinned: false,
    created_by: 'admin-1', expires_at: futureDate(14),
    created_at: pastDate(10), updated_at: pastDate(10),
  },
];

function createStackedQueryBuilder(results: { data: unknown; count?: number; error: Error | null }[]): QueryBuilderMock {
  let idx = 0;
  const next = () => results[idx++] ?? { data: null, count: null, error: null };

  const self = {} as QueryBuilderMock;
  const chainMethods = ['select', 'eq', 'order', 'range', 'insert', 'update', 'delete'];
  for (const method of chainMethods) {
    (self as Record<string, unknown>)[method] = vi.fn(() => self);
  }
  self.single = vi.fn(() => Promise.resolve(next()));
  self.maybeSingle = vi.fn(() => Promise.resolve(next()));
  self.then = vi.fn((resolve: (value: unknown) => unknown) => Promise.resolve(resolve(next())));

  return self;
}

function mockFrom(supabaseMock: ReturnType<typeof createSupabaseServiceMock>, qb: QueryBuilderMock) {
  (supabaseMock.client.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(qb);
}

function createStorageMock() {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    length: vi.fn().mockResolvedValue(0),
    keys: vi.fn().mockResolvedValue([]),
    forEach: vi.fn(),
    ready: vi.fn().mockResolvedValue(undefined),
    driver: '',
  };
}

describe('AnnouncementService', () => {
  let service: AnnouncementService;
  let supabaseMock: ReturnType<typeof createSupabaseServiceMock>;

  beforeEach(() => {
    supabaseMock = createSupabaseServiceMock();

    TestBed.configureTestingModule({
      providers: [
        AnnouncementService,
        OfflineManagerService,
        DatabaseService,
        StorageService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: Storage, useValue: createStorageMock() },
      ],
    });
    service = TestBed.inject(AnnouncementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAnnouncements (cached)', () => {
    it('should return data from supabase', async () => {
      const qb = createStackedQueryBuilder([{ data: mockAnnouncements, error: null }]);
      mockFrom(supabaseMock, qb);

      const { data, count } = await service.getAnnouncements();
      expect(data.length).toBeGreaterThanOrEqual(2);
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should filter by category via eq', async () => {
      const qb = createStackedQueryBuilder([{ data: mockAnnouncements, error: null }]);
      mockFrom(supabaseMock, qb);

      await service.getAnnouncements({ category: 'urgent' });
      expect(qb.eq).toHaveBeenCalledWith('category', 'urgent');
    });

    it('should filter by search text client-side', async () => {
      const qb = createStackedQueryBuilder([{ data: mockAnnouncements, error: null }]);
      mockFrom(supabaseMock, qb);

      const { data } = await service.getAnnouncements({ search: 'Inscripciones' });
      expect(data.length).toBe(1);
      expect(data[0].title).toContain('Inscripciones');
    });

    it('should filter expired announcements client-side', async () => {
      const qb = createStackedQueryBuilder([
        {
          data: [
            ...mockAnnouncements,
            {
              id: '3', title: 'Anuncio expirado',
              body: 'Este ya venció.',
              category: 'general', is_pinned: false,
              created_by: 'admin-1',
              expires_at: pastDate(1),
              created_at: pastDate(30), updated_at: pastDate(30),
            },
          ],
          error: null,
        },
      ]);
      mockFrom(supabaseMock, qb);

      const { data } = await service.getAnnouncements();
      expect(data.length).toBe(2);
      expect(data.find((a) => a.id === '3')).toBeUndefined();
    });

    it('should keep announcements with null expires_at', async () => {
      const qb = createStackedQueryBuilder([
        {
          data: [
            {
              id: '4', title: 'Permanente',
              body: 'Sin fecha de expiración.',
              category: 'general', is_pinned: false,
              created_by: 'admin-1', expires_at: null,
              created_at: pastDate(30), updated_at: pastDate(30),
            },
          ],
          error: null,
        },
      ]);
      mockFrom(supabaseMock, qb);

      const { data } = await service.getAnnouncements();
      expect(data.length).toBe(1);
      expect(data[0].id).toBe('4');
    });

    it('should return empty for non-matching search', async () => {
      const qb = createStackedQueryBuilder([{ data: mockAnnouncements, error: null }]);
      mockFrom(supabaseMock, qb);

      const { data } = await service.getAnnouncements({ search: 'xyznotfound' });
      expect(data.length).toBe(0);
    });

    it('should fall back to empty cache when supabase query fails', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('db error') }]);
      mockFrom(supabaseMock, qb);

      const { data, count } = await service.getAnnouncements();
      expect(data).toEqual([]);
      expect(count).toBe(0);
    });
  });

  describe('getAllAnnouncements', () => {
    it('should return all announcements', async () => {
      const qb = createStackedQueryBuilder([{ data: mockAnnouncements, error: null }]);
      mockFrom(supabaseMock, qb);

      const data = await service.getAllAnnouncements();
      expect(data.length).toBe(2);
      expect(qb.order).toHaveBeenCalledWith('is_pinned', { ascending: false });
      expect(qb.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.getAllAnnouncements()).rejects.toThrow('fail');
    });
  });

  describe('createAnnouncement', () => {
    it('should insert announcement', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: null }]);
      mockFrom(supabaseMock, qb);

      const payload = {
        title: 'Nuevo anuncio',
        body: 'Cuerpo del anuncio',
        category: 'general',
        is_pinned: false,
        expires_at: null,
        created_by: 'admin-1',
      };

      await service.createAnnouncement(payload);
      expect(qb.insert).toHaveBeenCalledWith(payload);
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(
        service.createAnnouncement({
          title: 'Nuevo anuncio',
          body: 'Cuerpo',
          category: 'general',
          is_pinned: false,
          expires_at: null,
          created_by: 'admin-1',
        }),
      ).rejects.toThrow('fail');
    });
  });

  describe('updateAnnouncement', () => {
    it('should update announcement by id', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: null }]);
      mockFrom(supabaseMock, qb);

      await service.updateAnnouncement('1', { title: 'Actualizado' });
      expect(qb.update).toHaveBeenCalledWith({ title: 'Actualizado' });
      expect(qb.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.updateAnnouncement('1', { title: 'Actualizado' })).rejects.toThrow('fail');
    });
  });

  describe('deleteAnnouncement', () => {
    it('should delete announcement by id', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: null }]);
      mockFrom(supabaseMock, qb);

      await service.deleteAnnouncement('1');
      expect(qb.delete).toHaveBeenCalled();
      expect(qb.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.deleteAnnouncement('1')).rejects.toThrow('fail');
    });
  });

  describe('togglePin', () => {
    it('should update is_pinned via updateAnnouncement', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: null }]);
      mockFrom(supabaseMock, qb);

      await service.togglePin('1', true);
      expect(qb.update).toHaveBeenCalledWith({ is_pinned: true });
      expect(qb.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.togglePin('1', false)).rejects.toThrow('fail');
    });
  });

  describe('getAnnouncementsPaginated', () => {
    it('should return paginated results with range', async () => {
      const qb = createStackedQueryBuilder([{ data: [mockAnnouncements[0]], count: 3, error: null }]);
      mockFrom(supabaseMock, qb);

      const result = await service.getAnnouncementsPaginated(1, 1);
      expect(result.data.length).toBe(1);
      expect(result.count).toBe(3);
      expect(qb.range).toHaveBeenCalledWith(0, 0);
    });

    it('should use count in select for paginated queries', async () => {
      const qb = createStackedQueryBuilder([{ data: [], count: 0, error: null }]);
      mockFrom(supabaseMock, qb);

      await service.getAnnouncementsPaginated(2, 10);
      expect(qb.select).toHaveBeenCalledWith('*', { count: 'exact' });
    });

    it('should filter by category in paginated query', async () => {
      const qb = createStackedQueryBuilder([{ data: [], count: 0, error: null }]);
      mockFrom(supabaseMock, qb);

      await service.getAnnouncementsPaginated(1, 10, { category: 'academic' });
      expect(qb.eq).toHaveBeenCalledWith('category', 'academic');
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.getAnnouncementsPaginated(1, 10)).rejects.toThrow('fail');
    });
  });
});
