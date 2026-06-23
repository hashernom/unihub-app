import { TestBed } from '@angular/core/testing';
import { Storage } from '@ionic/storage-angular';
import { EventService, type CalendarEvent } from './event.service';
import { SupabaseService } from './supabase.service';
import { OfflineManagerService } from './offline-manager.service';
import { DatabaseService } from '../storage/database.service';
import { StorageService } from '../storage/storage.service';

const mockNonRecurring: CalendarEvent[] = [
  {
    id: '2', title: 'Examen Final', description: 'Examen de cálculo',
    event_type: 'exam', classroom_id: 'aula-2', classroom_name: 'B201',
    professor_id: 'prof-2', professor_name: 'Dra. López',
    start_time: '2026-05-25T14:00:00Z', end_time: '2026-05-25T16:00:00Z',
    recurring_rule: null, color: '#EF4444',
    is_cancelled: false, created_by: 'admin-1',
    created_at: '2026-05-08T00:00:00Z', updated_at: '2026-05-08T00:00:00Z',
  },
  {
    id: '3', title: 'Reunión de facultad', description: null,
    event_type: 'meeting', classroom_id: null, classroom_name: null,
    professor_id: null, professor_name: null,
    start_time: '2026-05-22T09:00:00Z', end_time: '2026-05-22T11:00:00Z',
    recurring_rule: null, color: '#22C55E',
    is_cancelled: false, created_by: 'admin-1',
    created_at: '2026-05-09T00:00:00Z', updated_at: '2026-05-09T00:00:00Z',
  },
];

const mockRecurring: CalendarEvent[] = [
  {
    id: '1', title: 'Álgebra Lineal', description: 'Clase de álgebra',
    event_type: 'class', classroom_id: 'aula-1', classroom_name: 'A101',
    professor_id: 'prof-1', professor_name: 'Dr. García',
    start_time: '2026-05-20T08:00:00Z', end_time: '2026-05-20T10:00:00Z',
    recurring_rule: 'FREQ=WEEKLY', color: '#3B82F6',
    is_cancelled: false, created_by: 'admin-1',
    created_at: '2026-05-10T00:00:00Z', updated_at: '2026-05-10T00:00:00Z',
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockClient(): any {
  let thenCount = 0;
  const resolveList: { value: unknown }[] = [{ value: [] }, { value: [] }];
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    is: vi.fn(() => builder),
    not: vi.fn(() => builder),
    in: vi.fn(() => builder),
    single: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    then: vi.fn((onFulfilled: (v: unknown) => unknown) => {
      const idx = Math.min(thenCount, resolveList.length - 1);
      thenCount++;
      return Promise.resolve(onFulfilled({ data: resolveList[idx].value, error: null }));
    }),
  };

  const trackedFrom = vi.fn(() => builder);

  const setResults = (nonRecurring: unknown, recurring: unknown) => {
    resolveList[0].value = nonRecurring;
    resolveList[1].value = recurring;
  };

  const setResult = (data: unknown) => {
    resolveList[0].value = data;
    resolveList[1].value = data;
  };

  return {
    client: { from: trackedFrom },
    builder,
    setResults,
    setResult,
  };
}

describe('EventService', () => {
  let service: EventService;
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();

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
        EventService,
        OfflineManagerService,
        DatabaseService,
        StorageService,
        { provide: SupabaseService, useValue: { client: client.client } },
        { provide: Storage, useValue: storageMock },
      ],
    });
    service = TestBed.inject(EventService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getEvents', () => {
    it('should return non-recurring events within date range', async () => {
      client.setResults(mockNonRecurring, []);
      const events = await service.getEvents('2026-05-01T00:00:00Z', '2026-05-31T00:00:00Z');
      expect(events.length).toBe(2);
    });

    it('should query with gte/lte on start_time for non-recurring', async () => {
      client.setResults(mockNonRecurring, []);
      await service.getEvents('2026-05-01T00:00:00Z', '2026-05-31T00:00:00Z');
      expect(client.builder['gte']).toHaveBeenCalledWith('start_time', '2026-05-01T00:00:00Z');
      expect(client.builder['lte']).toHaveBeenCalledWith('start_time', '2026-05-31T00:00:00Z');
    });

    it('should filter out cancelled events', async () => {
      client.setResults(mockNonRecurring, []);
      await service.getEvents('2026-05-01T00:00:00Z', '2026-05-31T00:00:00Z');
      expect(client.builder['eq']).toHaveBeenCalledWith('is_cancelled', false);
    });

    it('should return empty array when no events in range', async () => {
      client.setResults([], []);
      const events = await service.getEvents('2026-01-01T00:00:00Z', '2026-01-31T00:00:00Z');
      expect(events.length).toBe(0);
    });

    it('should filter recurring vs non-recurring correctly', async () => {
      client.setResults(mockNonRecurring, []);
      await service.getEvents('2026-05-01T00:00:00Z', '2026-05-31T00:00:00Z');
      expect(client.builder['is']).toHaveBeenCalledWith('recurring_rule', null);
      expect(client.builder['not']).toHaveBeenCalledWith('recurring_rule', 'is', null);
    });

    it('should expand recurring events into instances', async () => {
      client.setResults([], mockRecurring);
      const events = await service.getEvents('2026-05-01T00:00:00Z', '2026-06-30T00:00:00Z');
      expect(events.length).toBeGreaterThanOrEqual(4);
      for (const ev of events) {
        expect(new Date(ev.start_time).getUTCDay()).toBe(3);
      }
    });
  });

  describe('createEvent', () => {
    const newEvent = {
      title: 'Taller de Python',
      description: 'Taller introductorio',
      event_type: 'workshop',
      classroom_id: null,
      professor_id: null,
      start_time: '2026-06-01T10:00:00Z',
      end_time: '2026-06-01T12:00:00Z',
      recurring_rule: null,
      color: '#F97316',
      created_by: 'admin-1',
    };

    it('should create event without classroom', async () => {
      client.setResult([]);
      await expect(service.createEvent(newEvent)).resolves.toBeUndefined();
      expect(client.builder['insert']).toHaveBeenCalled();
    });

    it('should not check conflict when no classroom_id', async () => {
      client.setResult([]);
      await service.createEvent(newEvent);
      expect(client.builder['eq']).not.toHaveBeenCalledWith('classroom_id', expect.anything());
    });

    it('should check conflict when classroom_id is provided', async () => {
      const eventWithClassroom = { ...newEvent, classroom_id: 'aula-1' };
      client.setResult([]);
      await service.createEvent(eventWithClassroom);
      expect(client.builder['eq']).toHaveBeenCalledWith('classroom_id', 'aula-1');
    });

    it('should throw conflict error when overlapping event exists', async () => {
      const eventWithClassroom = { ...newEvent, classroom_id: 'aula-1' };
      client.setResult([mockNonRecurring[0]]);
      await expect(service.createEvent(eventWithClassroom)).rejects.toThrow('Conflicto con');
    });
  });

  describe('checkConflict', () => {
    it('should return no conflict when classroom is empty', async () => {
      client.setResult([]);
      const result = await service.checkConflict('aula-1', '2026-06-01T10:00:00Z', '2026-06-01T12:00:00Z');
      expect(result.hasConflict).toBe(false);
    });

    it('should detect overlapping event in same classroom', async () => {
      client.setResult([mockNonRecurring[0]]);
      const result = await service.checkConflict('aula-1', '2026-05-25T13:00:00Z', '2026-05-25T17:00:00Z');
      expect(result.hasConflict).toBe(true);
      expect(result.conflictingEvent).toBeDefined();
      expect(result.message).toContain('Conflicto con');
    });

    it('should exclude specified event from conflict check', async () => {
      const conflictClient = createMockClient();
      conflictClient.setResult([mockNonRecurring[0]]);
      const customSupabase = { client: conflictClient.client };
      const customService = TestBed.inject(EventService);
      (customService as unknown as { supabase: unknown })['supabase'] = customSupabase;

      await customService.checkConflict('aula-1', '2026-05-25T13:00:00Z', '2026-05-25T17:00:00Z', '2');
      expect(conflictClient.builder['neq']).toHaveBeenCalledWith('id', '2');
    });

    it('should use lt/gt for overlap detection', async () => {
      client.setResult([]);
      await service.checkConflict('aula-1', '2026-05-20T09:00:00Z', '2026-05-20T11:00:00Z');
      expect(client.builder['lt']).toHaveBeenCalledWith('start_time', '2026-05-20T11:00:00Z');
      expect(client.builder['gt']).toHaveBeenCalledWith('end_time', '2026-05-20T09:00:00Z');
    });
  });

  describe('updateEvent', () => {
    it('should update event by id', async () => {
      client.setResult([]);
      await service.updateEvent('1', { title: 'Updated Title' });
      expect(client.builder['update']).toHaveBeenCalledWith({ title: 'Updated Title' });
      expect(client.builder['eq']).toHaveBeenCalledWith('id', '1');
    });
  });

  describe('cancelEvent', () => {
    it('should set is_cancelled to true', async () => {
      client.setResult([]);
      await service.cancelEvent('1');
      expect(client.builder['update']).toHaveBeenCalledWith({ is_cancelled: true });
      expect(client.builder['eq']).toHaveBeenCalledWith('id', '1');
    });
  });

  describe('deleteEvent', () => {
    it('should delete event by id', async () => {
      client.setResult([]);
      await service.deleteEvent('1');
      expect(client.builder['delete']).toHaveBeenCalled();
      expect(client.builder['eq']).toHaveBeenCalledWith('id', '1');
    });
  });

  describe('getEventById', () => {
    it('should return null if event not found', async () => {
      client.setResult(null);
      const event = await service.getEventById('nonexistent');
      expect(event).toBeNull();
    });

    it('should return event data when found', async () => {
      client.setResult(mockNonRecurring[0]);
      const event = await service.getEventById('2');
      expect(event).not.toBeNull();
      expect(event!.title).toBe('Examen Final');
    });
  });

  describe('getAllEvents', () => {
    it('should return all events ordered by start_time desc', async () => {
      client.setResult(mockNonRecurring);
      const events = await service.getAllEvents();
      expect(events.length).toBe(2);
      expect(client.builder['order']).toHaveBeenCalledWith('start_time', { ascending: false });
    });
  });

  describe('RRULE expansion', () => {
    it('should generate weekly instances for FREQ=WEEKLY', async () => {
      client.setResults([], mockRecurring);
      const events = await service.getEvents('2026-05-01T00:00:00Z', '2026-06-30T00:00:00Z');
      const weeklyEvents = events.filter((e) => e.recurring_rule === 'FREQ=WEEKLY');
      expect(weeklyEvents.length).toBeGreaterThanOrEqual(4);
      weeklyEvents.forEach((e) => {
        const d = new Date(e.start_time);
        expect(d.getUTCDay()).toBe(3);
      });
    });

    it('should not expand events without recurring_rule', async () => {
      client.setResults(mockNonRecurring, []);
      const events = await service.getEvents('2026-05-01T00:00:00Z', '2026-05-31T00:00:00Z');
      events.forEach((e) => {
        expect(e.recurring_rule).toBeNull();
      });
    });
  });

  describe('getEventColor', () => {
    it('should return correct color for each event type', () => {
      expect(service.getEventColor('class')).toBe('#3B82F6');
      expect(service.getEventColor('exam')).toBe('#EF4444');
      expect(service.getEventColor('meeting')).toBe('#22C55E');
      expect(service.getEventColor('workshop')).toBe('#F97316');
      expect(service.getEventColor('other')).toBe('#9CA3AF');
      expect(service.getEventColor('unknown')).toBe('#9CA3AF');
    });
  });

  describe('getEventTypeLabel', () => {
    it('should return translated labels', () => {
      expect(service.getEventTypeLabel('class')).toBe('Clase');
      expect(service.getEventTypeLabel('exam')).toBe('Examen');
      expect(service.getEventTypeLabel('unknown')).toBe('unknown');
    });
  });
});
