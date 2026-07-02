import { TestBed } from '@angular/core/testing';
import { Storage } from '@ionic/storage-angular';
import { EventService, type CalendarEvent, type RecurringException } from './event.service';
import { SupabaseService } from './supabase.service';
import { OfflineManagerService } from './offline-manager.service';
import { DatabaseService } from '../storage/database.service';
import { StorageService } from '../storage/storage.service';
import { createSupabaseServiceMock, type QueryBuilderMock } from '../../../testing/mock-factories';

const baseEvent: CalendarEvent = {
  id: 'evt-1',
  title: 'Álgebra Lineal',
  description: 'Clase de álgebra',
  event_type: 'class',
  classroom_id: 'aula-1',
  classroom_name: 'A101',
  professor_id: 'prof-1',
  professor_name: 'Dr. García',
  start_time: '2026-05-20T08:00:00Z',
  end_time: '2026-05-20T10:00:00Z',
  recurring_rule: 'FREQ=WEEKLY',
  color: '#3B82F6',
  is_cancelled: false,
  created_by: 'admin-1',
  created_at: '2026-05-10T00:00:00Z',
  updated_at: '2026-05-10T00:00:00Z',
};

const nonRecurringEvent: CalendarEvent = {
  id: 'evt-2',
  title: 'Examen Final',
  description: 'Examen de cálculo',
  event_type: 'exam',
  classroom_id: 'aula-2',
  classroom_name: 'B201',
  professor_id: 'prof-2',
  professor_name: 'Dra. López',
  start_time: '2026-05-25T14:00:00Z',
  end_time: '2026-05-25T16:00:00Z',
  recurring_rule: null,
  color: '#EF4444',
  is_cancelled: false,
  created_by: 'admin-1',
  created_at: '2026-05-08T00:00:00Z',
  updated_at: '2026-05-08T00:00:00Z',
};

const classroomRow = { id: 'aula-1', name: 'A101', building: 'Edificio A', capacity: 30, resources: null, is_active: true, created_at: '2026-01-01T00:00:00Z' };

function createStackedQueryBuilder(results: { data: unknown; error: Error | null }[]): QueryBuilderMock {
  let idx = 0;
  const next = () => results[idx++] ?? { data: null, error: null };

  const self = {} as QueryBuilderMock;
  const chainMethods = ['select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'contains', 'order', 'range', 'limit', 'is', 'not', 'insert', 'update', 'delete', 'upsert'];
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

describe('EventService', () => {
  let service: EventService;
  let supabaseMock: ReturnType<typeof createSupabaseServiceMock>;

  beforeEach(() => {
    supabaseMock = createSupabaseServiceMock();

    TestBed.configureTestingModule({
      providers: [
        EventService,
        OfflineManagerService,
        DatabaseService,
        StorageService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: Storage, useValue: createStorageMock() },
      ],
    });
    service = TestBed.inject(EventService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getEvents / fetchAndExpandEvents', () => {
    it('should return non-recurring events within date range', async () => {
      const qb = createStackedQueryBuilder([
        { data: [{ ...nonRecurringEvent, classrooms: { name: 'B201' } }], error: null },
        { data: [], error: null },
      ]);
      mockFrom(supabaseMock, qb);

      const events = await service.getEvents('2026-05-01T00:00:00Z', '2026-05-31T00:00:00Z');
      expect(events.length).toBe(1);
      expect(events[0].title).toBe('Examen Final');
    });

    it('should expand recurring events and apply exceptions', async () => {
      const qb = createStackedQueryBuilder([
        { data: [], error: null },
        { data: [{ ...baseEvent, classrooms: { name: 'A101' } }], error: null },
        { data: [{ id: 'ex-1', event_id: 'evt-1', exception_date: '2026-05-27', is_cancelled: true, new_start_time: null, new_end_time: null, title: null, description: null }], error: null },
      ]);
      mockFrom(supabaseMock, qb);

      const events = await service.getEvents('2026-05-01T00:00:00Z', '2026-06-30T00:00:00Z');
      const recurringInstances = events.filter((e) => e.id.startsWith('evt-1_'));
      expect(recurringInstances.length).toBeGreaterThanOrEqual(4);
      expect(recurringInstances.some((e) => e.start_time.startsWith('2026-05-27'))).toBe(false);
    });

    it('should keep original recurring event when rule is invalid and not cache-only', async () => {
      const qb = createStackedQueryBuilder([
        { data: [], error: null },
        { data: [{ ...baseEvent, recurring_rule: 'INVALID_RULE', classrooms: { name: 'A101' } }], error: null },
      ]);
      mockFrom(supabaseMock, qb);

      const events = await service.getEvents('2026-05-01T00:00:00Z', '2026-05-31T00:00:00Z');
      expect(events.length).toBe(1);
      expect(events[0].id).toBe('evt-1');
    });

    it('should skip invalid recurring events when cacheOnly is true (getUpcomingEvents)', async () => {
      const qb = createStackedQueryBuilder([
        { data: [], error: null },
        { data: [{ ...baseEvent, recurring_rule: 'INVALID_RULE', classrooms: { name: 'A101' } }], error: null },
      ]);
      mockFrom(supabaseMock, qb);

      const events = await service.getUpcomingEvents();
      expect(events.length).toBe(0);
    });

    it('should throw when non-recurring query fails', async () => {
      const qb = createStackedQueryBuilder([
        { data: null, error: new Error('db error') },
        { data: [], error: null },
      ]);
      mockFrom(supabaseMock, qb);

      await expect(service.getEvents('2026-05-01T00:00:00Z', '2026-05-31T00:00:00Z')).rejects.toThrow('db error');
    });

    it('should throw when recurring query fails', async () => {
      const qb = createStackedQueryBuilder([
        { data: [], error: null },
        { data: null, error: new Error('db error') },
      ]);
      mockFrom(supabaseMock, qb);

      await expect(service.getEvents('2026-05-01T00:00:00Z', '2026-05-31T00:00:00Z')).rejects.toThrow('db error');
    });
  });

  describe('getUpcomingEvents', () => {
    it('should return upcoming events for next 30 days', async () => {
      const qb = createStackedQueryBuilder([
        { data: [{ ...nonRecurringEvent, classrooms: { name: 'B201' } }], error: null },
        { data: [], error: null },
      ]);
      mockFrom(supabaseMock, qb);

      const events = await service.getUpcomingEvents();
      expect(events.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getExceptionsForEvent', () => {
    it('should return exceptions for an event', async () => {
      const exceptions: RecurringException[] = [{ id: 'ex-1', event_id: 'evt-1', exception_date: '2026-05-27', is_cancelled: true, new_start_time: null, new_end_time: null, title: null, description: null }];
      const qb = createStackedQueryBuilder([{ data: exceptions, error: null }]);
      mockFrom(supabaseMock, qb);

      const result = await service.getExceptionsForEvent('evt-1');
      expect(result).toEqual(exceptions);
      expect(qb.eq).toHaveBeenCalledWith('event_id', 'evt-1');
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.getExceptionsForEvent('evt-1')).rejects.toThrow('fail');
    });
  });

  describe('cancelRecurringInstance', () => {
    it('should upsert cancelled exception', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: null }]);
      mockFrom(supabaseMock, qb);

      await service.cancelRecurringInstance('evt-1', '2026-05-27T08:00:00Z');
      expect(qb.upsert).toHaveBeenCalledWith(
        { event_id: 'evt-1', exception_date: '2026-05-27', is_cancelled: true },
        { onConflict: 'event_id,exception_date' },
      );
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.cancelRecurringInstance('evt-1', '2026-05-27T08:00:00Z')).rejects.toThrow('fail');
    });
  });

  describe('updateRecurringInstance', () => {
    it('should upsert exception with updated fields', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: null }]);
      mockFrom(supabaseMock, qb);

      await service.updateRecurringInstance({
        eventId: 'evt-1',
        instanceDate: '2026-05-27T08:00:00Z',
        title: 'Título actualizado',
        description: 'Desc actualizada',
        newStartTime: '2026-05-27T09:00:00Z',
        newEndTime: '2026-05-27T11:00:00Z',
      });

      expect(qb.upsert).toHaveBeenCalledWith(
        {
          event_id: 'evt-1',
          exception_date: '2026-05-27',
          is_cancelled: false,
          title: 'Título actualizado',
          description: 'Desc actualizada',
          new_start_time: '2026-05-27T09:00:00Z',
          new_end_time: '2026-05-27T11:00:00Z',
        },
        { onConflict: 'event_id,exception_date' },
      );
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.updateRecurringInstance({ eventId: 'evt-1', instanceDate: '2026-05-27T08:00:00Z' })).rejects.toThrow('fail');
    });
  });

  describe('getEventById', () => {
    it('should return mapped event when found', async () => {
      const qb = createStackedQueryBuilder([{ data: { ...nonRecurringEvent, classrooms: { name: 'B201' }, profiles: { full_name: 'Dra. López' } }, error: null }]);
      mockFrom(supabaseMock, qb);

      const event = await service.getEventById('evt-2');
      expect(event).not.toBeNull();
      expect(event?.title).toBe('Examen Final');
      expect(qb.single).toHaveBeenCalled();
    });

    it('should return null when not found', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('not found') }]);
      mockFrom(supabaseMock, qb);

      const event = await service.getEventById('missing');
      expect(event).toBeNull();
    });
  });

  describe('checkConflict', () => {
    it('should return no conflict when classroom is empty', async () => {
      const qb = createStackedQueryBuilder([{ data: [], error: null }]);
      mockFrom(supabaseMock, qb);

      const result = await service.checkConflict('aula-1', '2026-06-01T10:00:00Z', '2026-06-01T12:00:00Z');
      expect(result.hasConflict).toBe(false);
    });

    it('should detect overlapping event', async () => {
      const qb = createStackedQueryBuilder([{ data: [{ ...nonRecurringEvent }], error: null }]);
      mockFrom(supabaseMock, qb);

      const result = await service.checkConflict('aula-2', '2026-05-25T13:00:00Z', '2026-05-25T17:00:00Z');
      expect(result.hasConflict).toBe(true);
      expect(result.message).toContain('Conflicto con');
    });

    it('should exclude specified event id', async () => {
      const qb = createStackedQueryBuilder([{ data: [], error: null }]);
      mockFrom(supabaseMock, qb);

      await service.checkConflict('aula-2', '2026-05-25T13:00:00Z', '2026-05-25T17:00:00Z', 'evt-2');
      expect(qb.neq).toHaveBeenCalledWith('id', 'evt-2');
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.checkConflict('aula-1', '2026-06-01T10:00:00Z', '2026-06-01T12:00:00Z')).rejects.toThrow('fail');
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
      const qb = createStackedQueryBuilder([{ data: { id: 'evt-new' }, error: null }]);
      mockFrom(supabaseMock, qb);

      const id = await service.createEvent(newEvent as Parameters<EventService['createEvent']>[0]);
      expect(id).toBe('evt-new');
      expect(qb.insert).toHaveBeenCalledWith(newEvent);
    });

    it('should check conflict when classroom is provided', async () => {
      const qb = createStackedQueryBuilder([
        { data: [], error: null },
        { data: { id: 'evt-new' }, error: null },
      ]);
      mockFrom(supabaseMock, qb);

      const id = await service.createEvent({ ...newEvent, classroom_id: 'aula-1' } as Parameters<EventService['createEvent']>[0]);
      expect(id).toBe('evt-new');
      expect(qb.eq).toHaveBeenCalledWith('classroom_id', 'aula-1');
    });

    it('should throw conflict error', async () => {
      const qb = createStackedQueryBuilder([{ data: [{ ...nonRecurringEvent }], error: null }]);
      mockFrom(supabaseMock, qb);

      await expect(service.createEvent({ ...newEvent, classroom_id: 'aula-2' } as Parameters<EventService['createEvent']>[0])).rejects.toThrow('Conflicto con');
    });

    it('should throw on insert error', async () => {
      const qb = createStackedQueryBuilder([
        { data: [], error: null },
        { data: null, error: new Error('insert failed') },
      ]);
      mockFrom(supabaseMock, qb);

      await expect(service.createEvent({ ...newEvent, classroom_id: 'aula-1' } as Parameters<EventService['createEvent']>[0])).rejects.toThrow('insert failed');
    });
  });

  describe('updateEvent', () => {
    it('should update event by id', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: null }]);
      mockFrom(supabaseMock, qb);

      await service.updateEvent('evt-1', { title: 'Updated' });
      expect(qb.update).toHaveBeenCalledWith({ title: 'Updated' });
      expect(qb.eq).toHaveBeenCalledWith('id', 'evt-1');
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.updateEvent('evt-1', { title: 'Updated' })).rejects.toThrow('fail');
    });
  });

  describe('cancelEvent', () => {
    it('should set is_cancelled to true', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: null }]);
      mockFrom(supabaseMock, qb);

      await service.cancelEvent('evt-1');
      expect(qb.update).toHaveBeenCalledWith({ is_cancelled: true });
      expect(qb.eq).toHaveBeenCalledWith('id', 'evt-1');
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.cancelEvent('evt-1')).rejects.toThrow('fail');
    });
  });

  describe('deleteEvent', () => {
    it('should delete event by id', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: null }]);
      mockFrom(supabaseMock, qb);

      await service.deleteEvent('evt-1');
      expect(qb.delete).toHaveBeenCalled();
      expect(qb.eq).toHaveBeenCalledWith('id', 'evt-1');
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.deleteEvent('evt-1')).rejects.toThrow('fail');
    });
  });

  describe('getAllEvents', () => {
    it('should return all events ordered by start_time desc', async () => {
      const qb = createStackedQueryBuilder([{ data: [{ ...nonRecurringEvent, classrooms: { name: 'B201' } }], error: null }]);
      mockFrom(supabaseMock, qb);

      const events = await service.getAllEvents();
      expect(events.length).toBe(1);
      expect(qb.order).toHaveBeenCalledWith('start_time', { ascending: false });
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.getAllEvents()).rejects.toThrow('fail');
    });
  });

  describe('getClassroomAvailability', () => {
    it('should return availability events', async () => {
      const qb = createStackedQueryBuilder([{ data: [{ ...nonRecurringEvent }], error: null }]);
      mockFrom(supabaseMock, qb);

      const events = await service.getClassroomAvailability('aula-2', '2026-05-01T00:00:00Z', '2026-05-31T00:00:00Z');
      expect(events.length).toBe(1);
      expect(qb.eq).toHaveBeenCalledWith('classroom_id', 'aula-2');
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.getClassroomAvailability('aula-1', '2026-05-01T00:00:00Z', '2026-05-31T00:00:00Z')).rejects.toThrow('fail');
    });
  });

  describe('getBuildings', () => {
    it('should return unique buildings', async () => {
      const qb = createStackedQueryBuilder([{ data: [{ building: 'Edificio A' }, { building: 'Edificio A' }, { building: 'Edificio B' }], error: null }]);
      mockFrom(supabaseMock, qb);

      const buildings = await service.getBuildings();
      expect(buildings).toEqual(['Edificio A', 'Edificio B']);
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.getBuildings()).rejects.toThrow('fail');
    });
  });

  describe('getProfessors', () => {
    it('should return professors', async () => {
      const qb = createStackedQueryBuilder([{ data: [{ id: 'prof-1', full_name: 'Dr. García' }], error: null }]);
      mockFrom(supabaseMock, qb);

      const professors = await service.getProfessors();
      expect(professors.length).toBe(1);
      expect(professors[0].full_name).toBe('Dr. García');
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.getProfessors()).rejects.toThrow('fail');
    });
  });

  describe('getClassrooms', () => {
    it('should return classrooms without filter', async () => {
      const qb = createStackedQueryBuilder([{ data: [classroomRow], error: null }]);
      mockFrom(supabaseMock, qb);

      const classrooms = await service.getClassrooms();
      expect(classrooms.length).toBe(1);
      expect(qb.eq).not.toHaveBeenCalledWith('is_active', true);
    });

    it('should filter active classrooms', async () => {
      const qb = createStackedQueryBuilder([{ data: [classroomRow], error: null }]);
      mockFrom(supabaseMock, qb);

      await service.getClassrooms(true);
      expect(qb.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.getClassrooms()).rejects.toThrow('fail');
    });
  });

  describe('createClassroom', () => {
    it('should insert classroom', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: null }]);
      mockFrom(supabaseMock, qb);

      await service.createClassroom({ name: 'C301', building: 'Edificio C', capacity: 25 });
      expect(qb.insert).toHaveBeenCalledWith({ name: 'C301', building: 'Edificio C', capacity: 25 });
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.createClassroom({ name: 'C301', building: 'Edificio C', capacity: 25 })).rejects.toThrow('fail');
    });
  });

  describe('updateClassroom', () => {
    it('should update classroom by id', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: null }]);
      mockFrom(supabaseMock, qb);

      await service.updateClassroom('aula-1', { name: 'A101 Updated' });
      expect(qb.update).toHaveBeenCalledWith({ name: 'A101 Updated' });
      expect(qb.eq).toHaveBeenCalledWith('id', 'aula-1');
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.updateClassroom('aula-1', { name: 'A101 Updated' })).rejects.toThrow('fail');
    });
  });

  describe('deleteClassroom', () => {
    it('should delete classroom by id', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: null }]);
      mockFrom(supabaseMock, qb);

      await service.deleteClassroom('aula-1');
      expect(qb.delete).toHaveBeenCalled();
      expect(qb.eq).toHaveBeenCalledWith('id', 'aula-1');
    });

    it('should throw on error', async () => {
      const qb = createStackedQueryBuilder([{ data: null, error: new Error('fail') }]);
      mockFrom(supabaseMock, qb);

      await expect(service.deleteClassroom('aula-1')).rejects.toThrow('fail');
    });
  });

  describe('getEventColor', () => {
    it('should return correct color for known types', () => {
      expect(service.getEventColor('class')).toBe('#3B82F6');
      expect(service.getEventColor('exam')).toBe('#EF4444');
      expect(service.getEventColor('meeting')).toBe('#22C55E');
      expect(service.getEventColor('workshop')).toBe('#F97316');
      expect(service.getEventColor('other')).toBe('#9CA3AF');
    });

    it('should return other color for unknown type', () => {
      expect(service.getEventColor('unknown')).toBe('#9CA3AF');
    });
  });

  describe('getEventTypeLabel', () => {
    it('should return translated labels', () => {
      expect(service.getEventTypeLabel('class')).toBe('Clase');
      expect(service.getEventTypeLabel('exam')).toBe('Examen');
    });

    it('should return input for unknown type', () => {
      expect(service.getEventTypeLabel('unknown')).toBe('unknown');
    });
  });
});
