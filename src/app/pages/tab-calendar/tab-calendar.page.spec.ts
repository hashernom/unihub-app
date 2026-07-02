import { TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { vi } from 'vitest';
import type { EventClickArg, DatesSetArg } from '@fullcalendar/core/index.js';
import { TabCalendarPage } from './tab-calendar.page';
import { EventService, type CalendarEvent, type Classroom } from '../../core/services/event.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';

const mockClassroom: Classroom = {
  id: 'room-1',
  name: 'Aula 101',
  building: 'Edificio A',
  capacity: 30,
  resources: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

const mockEvent: CalendarEvent = {
  id: 'event-1',
  title: 'Math Class',
  description: null,
  event_type: 'class',
  classroom_id: 'room-1',
  classroom_name: 'Aula 101',
  professor_id: null,
  professor_name: 'Prof. X',
  start_time: '2026-06-30T10:00:00Z',
  end_time: '2026-06-30T12:00:00Z',
  recurring_rule: null,
  color: '#3B82F6',
  is_cancelled: false,
  created_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockExam: CalendarEvent = {
  id: 'event-2',
  title: 'Final Exam',
  description: null,
  event_type: 'exam',
  classroom_id: null,
  classroom_name: null,
  professor_id: null,
  professor_name: null,
  start_time: '2026-07-02T14:00:00Z',
  end_time: '2026-07-02T16:00:00Z',
  recurring_rule: null,
  color: '#EF4444',
  is_cancelled: false,
  created_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockRecurring: CalendarEvent = {
  ...mockEvent,
  id: 'event-3',
  title: 'Weekly Meeting',
  event_type: 'meeting',
  classroom_id: 'room-1',
  recurring_rule: 'FREQ=WEEKLY',
  color: '',
};

describe('TabCalendarPage', () => {
  let component: TabCalendarPage;
  let fixture: ReturnType<typeof TestBed.createComponent<TabCalendarPage>>;
  let eventMock: {
    getClassrooms: ReturnType<typeof vi.fn>;
    getEvents: ReturnType<typeof vi.fn>;
    getEventColor: ReturnType<typeof vi.fn>;
    getEventTypeLabel: ReturnType<typeof vi.fn>;
  };
  let errorHandlerMock: { handleHttpError: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    eventMock = {
      getClassrooms: vi.fn(),
      getEvents: vi.fn(),
      getEventColor: vi.fn().mockImplementation((type: string) => ({ class: '#3B82F6', exam: '#EF4444' }[type] ?? '#9CA3AF')),
      getEventTypeLabel: vi.fn().mockImplementation((type: string) => ({ class: 'Clase', exam: 'Examen' }[type] ?? type)),
    };
    errorHandlerMock = { handleHttpError: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: EventService, useValue: eventMock },
        { provide: ErrorHandlerService, useValue: errorHandlerMock },
      ],
    });
    TestBed.overrideComponent(TabCalendarPage, {
      set: {
        imports: [DatePipe, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(TabCalendarPage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load events and classrooms on init', async () => {
    eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
    eventMock.getEvents.mockResolvedValue([mockEvent, mockExam]);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);
    expect(component.events.length).toBe(2);
    expect(component.allClassrooms.length).toBe(1);
  });

  it('should handle classroom load error', async () => {
    eventMock.getClassrooms.mockRejectedValue(new Error('network'));
    eventMock.getEvents.mockResolvedValue([mockEvent]);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);
    expect(errorHandlerMock.handleHttpError).toHaveBeenCalled();
    expect(component.allClassrooms).toEqual([]);
  });

  it('should handle events load error', async () => {
    eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
    eventMock.getEvents.mockRejectedValue(new Error('network'));
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);
    expect(component.error).toBe(true);
    expect(component.events).toEqual([]);
    expect(errorHandlerMock.handleHttpError).toHaveBeenCalled();
  });

  it('should filter events by type', async () => {
    eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
    eventMock.getEvents.mockResolvedValue([mockEvent, mockExam]);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);
    component.filterByType('exam');
    expect(component.calendarOptions.events).toHaveLength(1);
    expect((component.calendarOptions.events as { id: string }[])[0].id).toBe('event-2');
  });

  it('should filter events by classroom', async () => {
    eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
    eventMock.getEvents.mockResolvedValue([mockEvent, mockExam]);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);
    component.filterByClassroom('room-1');
    expect(component.calendarOptions.events).toHaveLength(1);
    expect((component.calendarOptions.events as { id: string }[])[0].id).toBe('event-1');
  });

  it('should apply combined filters and render recurring events with fallback color', async () => {
    eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
    eventMock.getEvents.mockResolvedValue([mockEvent, mockExam, mockRecurring]);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    component.filterByType('meeting');
    component.filterByClassroom('room-1');

    const events = component.calendarOptions.events as { id: string; title: string; backgroundColor: string }[];
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('event-3');
    expect(events[0].title).toContain('⟳');
    expect(events[0].backgroundColor).toBe('#9CA3AF');
  });

  it('should clear filters', async () => {
    eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
    eventMock.getEvents.mockResolvedValue([mockEvent, mockExam]);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);
    component.filterByType('exam');
    component.clearFilters();
    expect(component.activeFilter).toBeNull();
    expect(component.activeClassroomFilter).toBeNull();
    expect(component.calendarOptions.events).toHaveLength(2);
  });

  it('should report active filters', () => {
    expect(component.hasActiveFilters()).toBe(false);
    component.activeFilter = 'exam';
    expect(component.hasActiveFilters()).toBe(true);
    component.activeFilter = null;
    component.activeClassroomFilter = 'room-1';
    expect(component.hasActiveFilters()).toBe(true);
  });

  it('should show empty state when no events', async () => {
    eventMock.getClassrooms.mockResolvedValue([]);
    eventMock.getEvents.mockResolvedValue([]);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);
    fixture.detectChanges();
    expect(component.events.length).toBe(0);
    const empty = fixture.nativeElement.querySelector('app-empty-state');
    expect(empty).toBeTruthy();
  });

  it('should handle event click and load classroom details', async () => {
    eventMock.getClassrooms.mockResolvedValue([]);
    eventMock.getEvents.mockResolvedValue([mockEvent]);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);
    eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
    const clickArg = {
      event: { id: 'event-1' },
      el: document.createElement('div'),
      jsEvent: new MouseEvent('click'),
      view: { calendar: {} },
    } as unknown as EventClickArg;
    component.onEventClick(clickArg);
    await vi.waitFor(() => component.selectedEventClassroom !== null);
    expect(component.selectedEvent?.id).toBe('event-1');
    expect(component.showModal).toBe(true);
    expect(component.selectedEventClassroom?.id).toBe('room-1');
  });

  it('should ignore event click when event is not found', async () => {
    eventMock.getClassrooms.mockResolvedValue([]);
    eventMock.getEvents.mockResolvedValue([mockEvent]);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    const clickArg = {
      event: { id: 'unknown' },
      el: document.createElement('div'),
      jsEvent: new MouseEvent('click'),
      view: { calendar: {} },
    } as unknown as EventClickArg;
    component.onEventClick(clickArg);

    expect(component.selectedEvent).toBeNull();
    expect(component.showModal).toBe(false);
  });

  it('should use cached classroom when event classroom is already loaded', async () => {
    eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
    eventMock.getEvents.mockResolvedValue([mockEvent]);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    const clickArg = {
      event: { id: 'event-1' },
      el: document.createElement('div'),
      jsEvent: new MouseEvent('click'),
      view: { calendar: {} },
    } as unknown as EventClickArg;
    component.onEventClick(clickArg);

    expect(component.selectedEventClassroom?.id).toBe('room-1');
    expect(eventMock.getClassrooms).toHaveBeenCalledTimes(1);
  });

  it('should clear classroom when event has no classroom', async () => {
    eventMock.getClassrooms.mockResolvedValue([]);
    eventMock.getEvents.mockResolvedValue([mockExam]);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    const clickArg = {
      event: { id: 'event-2' },
      el: document.createElement('div'),
      jsEvent: new MouseEvent('click'),
      view: { calendar: {} },
    } as unknown as EventClickArg;
    component.onEventClick(clickArg);

    expect(component.selectedEventClassroom).toBeNull();
  });

  it('should handle classroom lookup error gracefully', async () => {
    eventMock.getClassrooms.mockResolvedValue([]);
    eventMock.getEvents.mockResolvedValue([mockEvent]);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);
    eventMock.getClassrooms.mockRejectedValue(new Error('network'));

    const clickArg = {
      event: { id: 'event-1' },
      el: document.createElement('div'),
      jsEvent: new MouseEvent('click'),
      view: { calendar: {} },
    } as unknown as EventClickArg;
    component.onEventClick(clickArg);
    await vi.waitFor(() => component.selectedEvent !== null);

    expect(component.selectedEventClassroom).toBeNull();
  });

  it('should dismiss modal', async () => {
    component.selectedEvent = mockEvent;
    component.showModal = true;
    component.selectedEventClassroom = mockClassroom;
    component.dismissModal();
    expect(component.showModal).toBe(false);
    expect(component.selectedEvent).toBeNull();
    expect(component.selectedEventClassroom).toBeNull();
  });

  it('should refresh events', async () => {
    eventMock.getClassrooms.mockResolvedValue([]);
    eventMock.getEvents.mockResolvedValue([mockEvent]);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);
    const refresher = { complete: vi.fn() } as unknown as HTMLIonRefresherElement;
    await component.doRefresh({ target: refresher } as unknown as CustomEvent);
    expect(eventMock.getEvents).toHaveBeenCalledTimes(2);
    expect(refresher.complete).toHaveBeenCalled();
  });

  it('should change calendar view', () => {
    const changeViewSpy = vi.fn();
    component.calendarComponent = {
      getApi: () => ({ changeView: changeViewSpy, today: vi.fn(), prev: vi.fn(), next: vi.fn() }),
    } as unknown as NonNullable<typeof component.calendarComponent>;

    component.onCalendarViewChange(undefined);
    component.onCalendarViewChange('timeGridWeek');
    expect(component.currentView).toBe('timeGridWeek');
    expect(changeViewSpy).toHaveBeenCalledWith('timeGridWeek');
  });

  it('should navigate calendar dates', () => {
    const todaySpy = vi.fn();
    const prevSpy = vi.fn();
    const nextSpy = vi.fn();
    component.calendarComponent = {
      getApi: () => ({ changeView: vi.fn(), today: todaySpy, prev: prevSpy, next: nextSpy }),
    } as unknown as NonNullable<typeof component.calendarComponent>;

    component.goToToday();
    expect(todaySpy).toHaveBeenCalled();

    component.navigateDate(-1);
    expect(prevSpy).toHaveBeenCalled();

    component.navigateDate(1);
    expect(nextSpy).toHaveBeenCalled();

    component.calendarComponent = undefined;
    component.navigateDate(-1);
    component.goToToday();
  });

  it('should update month label on dates set', () => {
    const arg = { view: { title: 'Julio 2026' } } as unknown as DatesSetArg;
    (component as unknown as { onDatesSet: (arg: DatesSetArg) => void }).onDatesSet(arg);
    expect(component.currentMonthLabel).toBe('Julio 2026');
  });

  it('should highlight clicked day', () => {
    const dayEl = document.createElement('div');
    dayEl.classList.add('fc-daygrid-day');
    document.body.appendChild(dayEl);

    (component as unknown as { onDateClick: (dateStr: string, dayEl: HTMLElement) => void }).onDateClick('2026-07-01', dayEl);
    expect(dayEl.classList.contains('fc-day-selected')).toBe(true);

    document.body.removeChild(dayEl);
  });

  it('should count events by type and classroom', () => {
    component.events = [mockEvent, mockExam];
    expect(component.getEventCountByType('class')).toBe(1);
    expect(component.getEventCountByType('exam')).toBe(1);
    expect(component.getEventCountByType('workshop')).toBe(0);
    expect(component.getEventCountByClassroom('room-1')).toBe(1);
    expect(component.getEventCountByClassroom('room-2')).toBe(0);
  });
});
