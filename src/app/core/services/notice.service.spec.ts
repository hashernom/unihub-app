import { TestBed } from '@angular/core/testing';
import { Storage } from '@ionic/storage-angular';
import { NoticeService, type Notice } from './notice.service';
import { SupabaseService } from './supabase.service';
import { OfflineManagerService } from './offline-manager.service';
import { DatabaseService } from '../storage/database.service';
import { StorageService } from '../storage/storage.service';

const mockNotices: Notice[] = [
  {
    id: '1', title: 'Cierre de inscripciones',
    content: 'Las inscripciones cierran este viernes.',
    priority: 'high', is_active: true,
    created_by: 'admin-1', created_at: '2026-05-10T10:00:00Z', updated_at: '2026-05-10T10:00:00Z',
  },
  {
    id: '2', title: 'Recordatorio de pago',
    content: 'Fecha límite para pago de matrícula.',
    priority: 'medium', is_active: true,
    created_by: 'admin-1', created_at: '2026-05-08T08:00:00Z', updated_at: '2026-05-08T08:00:00Z',
  },
  {
    id: '3', title: 'Horario de biblioteca',
    content: 'La biblioteca abre de 7am a 9pm.',
    priority: 'low', is_active: true,
    created_by: 'admin-1', created_at: '2026-05-05T12:00:00Z', updated_at: '2026-05-05T12:00:00Z',
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
  return { client: { from: vi.fn() } };
}

describe('NoticeService', () => {
  let service: NoticeService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabaseMock: any;
  let { builder: queryBuilder, setResult } = createQueryBuilder();

  beforeEach(() => {
    const qb = createQueryBuilder();
    queryBuilder = qb.builder;
    setResult = qb.setResult;

    supabaseMock = createMockSupabase();
    supabaseMock.client.from.mockReturnValue(queryBuilder);

    TestBed.configureTestingModule({
      providers: [
        NoticeService,
        OfflineManagerService,
        DatabaseService,
        StorageService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: Storage, useValue: {
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
        } },
      ],
    });
    service = TestBed.inject(NoticeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getNotices', () => {
    it('should return data from supabase', async () => {
      setResult(mockNotices);
      const { data, count } = await service.getNotices();
      expect(data.length).toBeGreaterThanOrEqual(3);
      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('should filter out inactive notices', async () => {
      setResult([
        ...mockNotices,
        {
          id: '4', title: 'Inactivo',
          content: 'Este aviso está inactivo.',
          priority: 'high', is_active: false,
          created_by: 'admin-1', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
        },
      ]);
      const { data } = await service.getNotices();
      expect(data.length).toBe(3);
      expect(data.find((n) => n.id === '4')).toBeUndefined();
    });

    it('should filter by priority', async () => {
      setResult(mockNotices);
      const { data } = await service.getNotices({ priority: 'high' });
      expect(data.length).toBe(1);
      expect(data[0].priority).toBe('high');
    });

    it('should sort by priority then created_at desc', async () => {
      setResult(mockNotices);
      const { data } = await service.getNotices();
      expect(data[0].priority).toBe('high');
      expect(data[1].priority).toBe('medium');
      expect(data[2].priority).toBe('low');
    });

    it('should filter by search text', async () => {
      setResult(mockNotices);
      const { data } = await service.getNotices({ search: 'biblioteca' });
      expect(data.length).toBe(1);
      expect(data[0].title).toContain('biblioteca');
    });
  });

  describe('getNoticesPaginated', () => {
    it('should return paginated results with range', async () => {
      setResult([mockNotices[0]], 3);
      const result = await service.getNoticesPaginated(1, 1);
      expect(result.data.length).toBe(1);
      expect(result.count).toBe(3);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((queryBuilder as any).range).toHaveBeenCalledWith(0, 0);
    });
  });
});
