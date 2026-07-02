import { TestBed } from '@angular/core/testing';
import { RouterLink, provideRouter, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { vi } from 'vitest';
import { AdminEventsPage } from './admin-events.page';
import { EventService, type CalendarEvent } from '../../core/services/event.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';

function createMockEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'event-1',
    title: 'Charla académica',
    description: 'Descripción de prueba',
    event_type: 'class',
    classroom_id: null,
    classroom_name: 'Aula 101',
    professor_id: null,
    professor_name: null,
    start_time: '2099-07-15T10:00:00Z',
    end_time: '2099-07-15T12:00:00Z',
    recurring_rule: null,
    color: '#3B82F6',
    is_cancelled: false,
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createMockRecurringEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'event-2',
    title: 'Taller recurrente',
    description: null,
    event_type: 'workshop',
    classroom_id: null,
    classroom_name: null,
    professor_id: null,
    professor_name: null,
    start_time: '2099-07-20T14:00:00Z',
    end_time: '2099-07-20T16:00:00Z',
    recurring_rule: 'FREQ=WEEKLY;BYDAY=MO',
    color: '#F97316',
    is_cancelled: false,
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const mockEvent = createMockEvent();
const mockRecurringEvent = createMockRecurringEvent();

describe('AdminEventsPage', () => {
  let component: AdminEventsPage;
  let fixture: ReturnType<typeof TestBed.createComponent<AdminEventsPage>>;
  let router: Router;
  let eventMock: {
    getAllEvents: ReturnType<typeof vi.fn>;
    deleteEvent: ReturnType<typeof vi.fn>;
    cancelEvent: ReturnType<typeof vi.fn>;
    cancelRecurringInstance: ReturnType<typeof vi.fn>;
    getEventColor: ReturnType<typeof vi.fn>;
    getEventTypeLabel: ReturnType<typeof vi.fn>;
  };
  let errorHandlerMock: { handleHttpError: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    eventMock = {
      getAllEvents: vi.fn(),
      deleteEvent: vi.fn(),
      cancelEvent: vi.fn(),
      cancelRecurringInstance: vi.fn(),
      getEventColor: vi.fn().mockImplementation((type: string) => ({ class: '#3B82F6', exam: '#EF4444', workshop: '#F97316', meeting: '#22C55E', other: '#9CA3AF' }[type] ?? '#9CA3AF')),
      getEventTypeLabel: vi.fn().mockImplementation((type: string) => ({ class: 'Clase', exam: 'Examen', workshop: 'Taller', meeting: 'Reunión', other: 'Otro' }[type] ?? type)),
    };
    errorHandlerMock = { handleHttpError: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: EventService, useValue: eventMock },
        { provide: ErrorHandlerService, useValue: errorHandlerMock },
        provideRouter([]),
      ],
    });
    TestBed.overrideComponent(AdminEventsPage, {
      set: {
        imports: [RouterLink, DatePipe, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(AdminEventsPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load events on ionViewWillEnter', async () => {
    eventMock.getAllEvents.mockResolvedValue([mockEvent, mockRecurringEvent]);

    await component.loadEvents();

    expect(eventMock.getAllEvents).toHaveBeenCalled();
    expect(component.events).toHaveLength(2);
    expect(component.error).toBeNull();
    expect(component.loading).toBe(false);
  });

  it('should handle load error and call error handler', async () => {
    const err = new Error('Network error');
    eventMock.getAllEvents.mockRejectedValue(err);

    await component.loadEvents();

    expect(component.events).toHaveLength(0);
    expect(component.error).toBe(err);
    expect(errorHandlerMock.handleHttpError).toHaveBeenCalledWith(err, expect.any(Function));
    expect(component.loading).toBe(false);
  });

  it('should delete an event', async () => {
    eventMock.getAllEvents.mockResolvedValue([mockEvent]);
    eventMock.deleteEvent.mockResolvedValue(undefined);

    await component.loadEvents();

    component.confirmDelete(mockEvent);
    expect(component.showDeleteAlert).toBe(true);
    expect(component.deleteTarget).toBe(mockEvent);

    await component.deleteAlertButtons[1].handler();

    expect(eventMock.deleteEvent).toHaveBeenCalledWith(mockEvent.id);
    expect(component.events).toHaveLength(0);
    expect(component.showToast).toBe(true);
    expect(component.toastMessage).toBe('Evento eliminado permanentemente');
  });

  it('should cancel a non-recurring event', async () => {
    const eventToCancel = createMockEvent();
    eventMock.getAllEvents.mockResolvedValue([eventToCancel]);
    eventMock.cancelEvent.mockResolvedValue(undefined);

    await component.loadEvents();

    component.confirmCancel(eventToCancel);
    expect(component.showCancelAlert).toBe(true);

    await component.cancelAlertButtons[1].handler();

    expect(eventMock.cancelEvent).toHaveBeenCalledWith(eventToCancel.id);
    expect(eventToCancel.is_cancelled).toBe(true);
    expect(component.toastMessage).toBe('Evento cancelado');
  });

  it('should cancel a recurring instance', async () => {
    eventMock.getAllEvents.mockResolvedValue([mockRecurringEvent]);
    eventMock.cancelRecurringInstance.mockResolvedValue(undefined);

    await component.loadEvents();

    component.confirmCancel(mockRecurringEvent);
    expect(component.showCancelInstanceAction).toBe(true);

    await component.cancelInstanceActions[0].handler!();

    expect(eventMock.cancelRecurringInstance).toHaveBeenCalledWith(mockRecurringEvent.id, mockRecurringEvent.start_time.slice(0, 10));
    expect(component.toastMessage).toBe('Instancia cancelada');
  });

  it('should navigate to edit event', async () => {
    eventMock.getAllEvents.mockResolvedValue([mockEvent]);

    await component.loadEvents();

    const navigateSpy = vi.spyOn(router, 'navigate');
    component.editEventClick(mockEvent);

    expect(navigateSpy).toHaveBeenCalledWith(['/admin/events/edit', mockEvent.id]);
  });

  it('should show edit action sheet for recurring event', async () => {
    eventMock.getAllEvents.mockResolvedValue([mockRecurringEvent]);

    await component.loadEvents();

    const navigateSpy = vi.spyOn(router, 'navigate');
    component.editEventClick(mockRecurringEvent);

    expect(component.showEditAction).toBe(true);
    expect(component.editTarget).toBe(mockRecurringEvent);

    component.editRecurringActions[1].handler!();
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/events/edit', mockRecurringEvent.id]);
  });

  it('should compute event status correctly', () => {
    expect(component.eventStatus(mockEvent).label).toBe('Próximo');
    expect(component.eventStatus({ ...mockEvent, is_cancelled: true }).label).toBe('Cancelado');
  });
});
