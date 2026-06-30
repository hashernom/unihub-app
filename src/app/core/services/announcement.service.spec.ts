import { TestBed } from '@angular/core/testing';
import { Storage } from '@ionic/storage-angular';
import { AnnouncementService, type Announcement } from './announcement.service';
import { SupabaseService } from './supabase.service';
import { OfflineManagerService } from './offline-manager.service';
import { DatabaseService } from '../storage/database.service';
import { StorageService } from '../storage/storage.service';

// Relative dates so specs never break when "today" crosses a hardcoded boundary.
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

function createQueryBuilder() {
  const resolve: { value: unknown; count?: number } = { value: [] };
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    range: vi.fn(() => builder),
    then: vi.fn((onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve(onFulfilled({ data: resolve.value, error: null, count: resolve.count ?? null })),
    ),
  };
  return { builder, setResult: (data: unknown, count?: number) => { resolve.value = data; resolve.count = count; } };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockSupabase(): any {
  return {
    client: {
      from: vi.fn(),
    },
  };
}

describe('AnnouncementService', () => {
  let service: AnnouncementService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabaseMock: any;
  let { builder: queryBuilder, setResult } = createQueryBuilder();

  beforeEach(() => {
    const qb = createQueryBuilder();
    queryBuilder = qb.builder;
    setResult = qb.setResult;

    supabaseMock = createMockSupabase();
    supabaseMock.client.from.mockReturnValue(queryBuilder);

    const storageMock = {
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

    TestBed.configureTestingModule({
      providers: [
        AnnouncementService,
        OfflineManagerService,
        DatabaseService,
        StorageService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: Storage, useValue: storageMock },
      ],
    });
    service = TestBed.inject(AnnouncementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAnnouncements (cached)', () => {
    it('should return data from supabase', async () => {
      setResult(mockAnnouncements);
      const { data, count } = await service.getAnnouncements();
      expect(data.length).toBeGreaterThanOrEqual(2);
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should filter by category via eq', async () => {
      setResult(mockAnnouncements);
      await service.getAnnouncements({ category: 'urgent' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((queryBuilder as any).eq).toHaveBeenCalledWith('category', 'urgent');
    });

    it('should filter by search text client-side', async () => {
      setResult(mockAnnouncements);
      const { data } = await service.getAnnouncements({ search: 'Inscripciones' });
      expect(data.length).toBe(1);
      expect(data[0].title).toContain('Inscripciones');
    });

    it('should filter expired announcements client-side', async () => {
      setResult([
        ...mockAnnouncements,
        {
          id: '3', title: 'Anuncio expirado',
          body: 'Este ya venció.',
          category: 'general', is_pinned: false,
          created_by: 'admin-1',
          expires_at: pastDate(1),
          created_at: pastDate(30), updated_at: pastDate(30),
        },
      ]);
      const { data } = await service.getAnnouncements();
      expect(data.length).toBe(2);
      expect(data.find((a) => a.id === '3')).toBeUndefined();
    });

    it('should return empty for non-matching search', async () => {
      setResult(mockAnnouncements);
      const { data } = await service.getAnnouncements({ search: 'xyznotfound' });
      expect(data.length).toBe(0);
    });
  });

  describe('getAnnouncementsPaginated', () => {
    it('should return paginated results with range', async () => {
      setResult([mockAnnouncements[0]], 3);
      const result = await service.getAnnouncementsPaginated(1, 1);
      expect(result.data.length).toBe(1);
      expect(result.count).toBe(3);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((queryBuilder as any).range).toHaveBeenCalledWith(0, 0);
    });

    it('should use count in select for paginated queries', async () => {
      setResult([], 0);
      await service.getAnnouncementsPaginated(2, 10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((queryBuilder as any).select).toHaveBeenCalledWith('*', { count: 'exact' });
    });
  });
});
