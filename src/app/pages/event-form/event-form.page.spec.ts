import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { EventFormPage } from './event-form.page';
import { EventService, type CalendarEvent, type Classroom } from '../../core/services/event.service';
import { AuthService, type AuthUser } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { FormValidationService } from '../../core/services/form-validation.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import { createSupabaseServiceMock, createRouterMock, createActivatedRouteMock } from '../../../testing/mock-factories';

const mockClassroom: Classroom = {
  id: 'room-1',
  name: 'Aula 101',
  building: 'Edificio A',
  capacity: 30,
  resources: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

const mockProfessor = { id: 'prof-1', full_name: 'Prof. X' };

const mockEvent: CalendarEvent = {
  id: 'event-1',
  title: 'Math Class',
  description: null,
  event_type: 'class',
  classroom_id: 'room-1',
  classroom_name: 'Aula 101',
  professor_id: 'prof-1',
  professor_name: 'Prof. X',
  start_time: '2026-07-01T10:00:00.000Z',
  end_time: '2026-07-01T11:00:00.000Z',
  recurring_rule: null,
  color: '#3B82F6',
  is_cancelled: false,
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'test@test.com',
  profile: {
    id: 'user-1',
    student_code: 'U20231001',
    full_name: 'Test',
    role: 'student',
    avatar_url: null,
    carrera: 'Ingeniería',
    semestre: '5',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
};

describe('EventFormPage', () => {
  let eventMock: {
    getClassrooms: ReturnType<typeof vi.fn>;
    getProfessors: ReturnType<typeof vi.fn>;
    getEventById: ReturnType<typeof vi.fn>;
    checkConflict: ReturnType<typeof vi.fn>;
    createEvent: ReturnType<typeof vi.fn>;
    updateEvent: ReturnType<typeof vi.fn>;
    getEventColor: ReturnType<typeof vi.fn>;
  };
  let authMock: {
    currentUser$: BehaviorSubject<AuthUser | null>;
    isAdmin$: BehaviorSubject<boolean>;
  };
  let formValidationMock: { getErrorMessage: ReturnType<typeof vi.fn> };
  let routerMock: Router;
  let supabaseMock: SupabaseService;

  beforeEach(() => {
    eventMock = {
      getClassrooms: vi.fn(),
      getProfessors: vi.fn(),
      getEventById: vi.fn(),
      checkConflict: vi.fn().mockResolvedValue({ hasConflict: false }),
      createEvent: vi.fn().mockResolvedValue('event-2'),
      updateEvent: vi.fn().mockResolvedValue(undefined),
      getEventColor: vi.fn().mockReturnValue('#3B82F6'),
    };
    authMock = {
      currentUser$: new BehaviorSubject<AuthUser | null>(mockUser),
      isAdmin$: new BehaviorSubject<boolean>(false),
    };
    formValidationMock = { getErrorMessage: vi.fn((field: string) => `${field} es obligatorio`) };
    routerMock = createRouterMock();
    supabaseMock = createSupabaseServiceMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function configureTestBed(routeParams: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      providers: [
        { provide: EventService, useValue: eventMock },
        { provide: AuthService, useValue: authMock },
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: createActivatedRouteMock(routeParams) },
        { provide: FormValidationService, useValue: formValidationMock },
      ],
    });
    TestBed.overrideComponent(EventFormPage, {
      set: {
        imports: [FormsModule, ...IONIC_STUBS],
      },
    });
  }

  describe('create mode', () => {
    let component: EventFormPage;
    let fixture: ReturnType<typeof TestBed.createComponent<EventFormPage>>;

    beforeEach(async () => {
      configureTestBed();
      await TestBed.compileComponents();

      fixture = TestBed.createComponent(EventFormPage);
      component = fixture.componentInstance;
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should pad minutes with leading zero', () => {
      expect(component.padMinute(5)).toBe('05');
      expect(component.padMinute(15)).toBe('15');
    });

    it('should ignore invalid segment values', () => {
      component.startPeriod = 'AM';
      component.onSegmentChange('start', 'PM');
      expect(component.startPeriod).toBe('PM');

      component.onSegmentChange('start', 123);
      expect(component.startPeriod).toBe('PM');

      component.onSegmentChange('start', 'INVALID');
      expect(component.startPeriod).toBe('PM');
    });

    it('should update end period on segment change', () => {
      component.endPeriod = 'AM';
      component.onSegmentChange('end', 'PM');
      expect(component.endPeriod).toBe('PM');
    });

    it('should sync display and storage times', () => {
      const page = component as unknown as {
        syncTimeToDisplay: (which: 'start' | 'end') => void;
        syncTimeToStorage: (which: 'start' | 'end') => void;
      };

      component.startTime = '14:30';
      page.syncTimeToDisplay('start');
      expect(component.startHour).toBe(2);
      expect(component.startMinute).toBe(30);
      expect(component.startPeriod).toBe('PM');

      component.startHour = 12;
      component.startMinute = 0;
      component.startPeriod = 'AM';
      page.syncTimeToStorage('start');
      expect(component.startTime).toBe('00:00');

      component.endHour = 12;
      component.endMinute = 0;
      component.endPeriod = 'PM';
      page.syncTimeToStorage('end');
      expect(component.endTime).toBe('12:00');
    });

    it('should load classrooms and professors on init', async () => {
      eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
      eventMock.getProfessors.mockResolvedValue([mockProfessor]);
      fixture.detectChanges();
      await vi.waitFor(() => component.classrooms.length > 0 && component.professors.length > 0);
      expect(component.classrooms).toEqual([mockClassroom]);
      expect(component.professors).toEqual([mockProfessor]);
    });

    it('should handle failures when loading classrooms or professors', async () => {
      eventMock.getClassrooms.mockRejectedValue(new Error('fail'));
      eventMock.getProfessors.mockRejectedValue(new Error('fail'));
      fixture.detectChanges();
      await vi.waitFor(() => fixture.isStable());
      expect(component.classrooms).toEqual([]);
      expect(component.professors).toEqual([]);
    });

    it('should create an event on save', async () => {
      eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
      eventMock.getProfessors.mockResolvedValue([mockProfessor]);
      fixture.detectChanges();
      await vi.waitFor(() => component.classrooms.length > 0);

      component.title = 'New Event';
      component.startDate = '2026-07-01';
      component.endDate = '2026-07-01';
      component.startHour = 10;
      component.startMinute = 0;
      component.startPeriod = 'AM';
      component.endHour = 11;
      component.endMinute = 0;
      component.endPeriod = 'AM';
      component.classroomId = 'room-1';
      component.professorId = 'prof-1';

      await component.save();
      expect(component.saving).toBe(false);
      expect(component.submitSuccess).toBe(true);
      expect(eventMock.createEvent).toHaveBeenCalled();
      expect(component.toastMessage).toBe('Evento creado');
    });

    it('should show validation error when title is empty', async () => {
      fixture.detectChanges();
      await component.save();
      expect(component.toastMessage).toBe('El título es obligatorio');
      expect(eventMock.createEvent).not.toHaveBeenCalled();
    });

    it('should show validation error when dates are missing', async () => {
      fixture.detectChanges();
      component.title = 'Event';
      await component.save();
      expect(component.toastMessage).toBe('Selecciona fecha de inicio y fin');
    });

    it('should show validation error when end is not after start', async () => {
      fixture.detectChanges();
      component.title = 'Event';
      component.startDate = '2026-07-01';
      component.endDate = '2026-07-01';
      component.startHour = 10;
      component.startMinute = 0;
      component.startPeriod = 'AM';
      component.endHour = 9;
      component.endMinute = 0;
      component.endPeriod = 'AM';
      await component.save();
      expect(component.toastMessage).toBe('La fecha de fin debe ser posterior a la de inicio');
    });

    it('should warn and stop saving when a conflict is detected', async () => {
      eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
      eventMock.getProfessors.mockResolvedValue([mockProfessor]);
      eventMock.checkConflict.mockResolvedValue({ hasConflict: true, message: 'Aula ocupada' });
      fixture.detectChanges();
      await vi.waitFor(() => component.classrooms.length > 0);

      component.title = 'Conflicting Event';
      component.startDate = '2026-07-01';
      component.endDate = '2026-07-01';
      component.startHour = 10;
      component.startMinute = 0;
      component.startPeriod = 'AM';
      component.endHour = 11;
      component.endMinute = 0;
      component.endPeriod = 'AM';
      component.classroomId = 'room-1';

      await component.save();
      expect(component.conflictWarning).toBe('Aula ocupada');
      expect(component.toastMessage).toBe('Conflicto de horario: Aula ocupada');
      expect(eventMock.createEvent).not.toHaveBeenCalled();
      expect(component.saving).toBe(false);
    });

    it('should continue saving when conflict check fails', async () => {
      eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
      eventMock.getProfessors.mockResolvedValue([mockProfessor]);
      eventMock.checkConflict.mockRejectedValue(new Error('check error'));
      fixture.detectChanges();
      await vi.waitFor(() => component.classrooms.length > 0);

      component.title = 'Event';
      component.startDate = '2026-07-01';
      component.endDate = '2026-07-01';
      component.startHour = 10;
      component.startMinute = 0;
      component.startPeriod = 'AM';
      component.endHour = 11;
      component.endMinute = 0;
      component.endPeriod = 'AM';
      component.classroomId = 'room-1';

      await component.save();
      expect(eventMock.createEvent).toHaveBeenCalled();
    });

    it('should send invitations when email notification is enabled', async () => {
      eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
      eventMock.getProfessors.mockResolvedValue([mockProfessor]);
      fixture.detectChanges();
      await vi.waitFor(() => component.classrooms.length > 0);

      component.title = 'Event';
      component.startDate = '2026-07-01';
      component.endDate = '2026-07-01';
      component.startHour = 10;
      component.startMinute = 0;
      component.startPeriod = 'AM';
      component.endHour = 11;
      component.endMinute = 0;
      component.endPeriod = 'AM';
      component.classroomId = 'room-1';
      component.sendEmailNotification = true;

      const fetchMock = vi.fn().mockResolvedValue({ ok: true } as unknown as Response);
      vi.stubGlobal('fetch', fetchMock);

      await component.save();
      await vi.waitFor(() => eventMock.createEvent.mock.calls.length > 0);

      expect(eventMock.createEvent).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalled();
      const [url] = fetchMock.mock.calls[0];
      expect(String(url)).toContain('send-event-invitation');
    });

    it('should warn when sending invitations fails', async () => {
      eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
      eventMock.getProfessors.mockResolvedValue([mockProfessor]);
      fixture.detectChanges();
      await vi.waitFor(() => component.classrooms.length > 0);

      component.title = 'Event';
      component.startDate = '2026-07-01';
      component.endDate = '2026-07-01';
      component.startHour = 10;
      component.startMinute = 0;
      component.startPeriod = 'AM';
      component.endHour = 11;
      component.endMinute = 0;
      component.endPeriod = 'AM';
      component.classroomId = 'room-1';
      component.sendEmailNotification = true;

      const page = component as unknown as { sendInvitations: () => Promise<void> };
      vi.spyOn(page, 'sendInvitations').mockRejectedValue(new Error('mail fail'));

      await component.save();
      expect(component.toastMessage).toBe('Evento creado pero no se pudieron enviar las invitaciones por email');
    });

    it('should log warning when sendInvitations fetch fails', async () => {
      const page = component as unknown as { sendInvitations: () => Promise<void>; eventId: string | null };
      page.eventId = 'event-2';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('mail fail')));
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      await page.sendInvitations();

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should show error toast when saving fails', async () => {
      eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
      eventMock.getProfessors.mockResolvedValue([mockProfessor]);
      eventMock.createEvent.mockRejectedValue(new Error('create failed'));
      fixture.detectChanges();
      await vi.waitFor(() => component.classrooms.length > 0);

      component.title = 'Event';
      component.startDate = '2026-07-01';
      component.endDate = '2026-07-01';
      component.startHour = 10;
      component.startMinute = 0;
      component.startPeriod = 'AM';
      component.endHour = 11;
      component.endMinute = 0;
      component.endPeriod = 'AM';

      await component.save();
      expect(component.toastMessage).toBe('create failed');
      expect(component.saving).toBe(false);
    });

    it('should do nothing when checking availability without classroom or date', async () => {
      fixture.detectChanges();
      await component.checkAvailabilityInline();
      expect(component.availabilityPreview).toEqual([]);
      expect(component.checkingAvailability).toBe(false);
    });

    it('should show availability when classroom is available', async () => {
      eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
      eventMock.getProfessors.mockResolvedValue([mockProfessor]);
      fixture.detectChanges();
      await vi.waitFor(() => component.classrooms.length > 0);

      component.classroomId = 'room-1';
      component.startDate = '2026-07-01';
      component.endDate = '2026-07-01';
      component.startTime = '10:00';
      component.endTime = '11:00';

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ available: true }),
      } as unknown as Response);
      vi.stubGlobal('fetch', fetchMock);

      await component.checkAvailabilityInline();
      expect(component.availabilityPreview).toEqual(['Aula disponible en este horario']);
      expect(component.checkingAvailability).toBe(false);
    });

    it('should show conflict when classroom is occupied', async () => {
      eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
      eventMock.getProfessors.mockResolvedValue([mockProfessor]);
      fixture.detectChanges();
      await vi.waitFor(() => component.classrooms.length > 0);

      component.classroomId = 'room-1';
      component.startDate = '2026-07-01';
      component.endDate = '2026-07-01';
      component.startTime = '10:00';
      component.endTime = '11:00';

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          available: false,
          conflicts: [{ title: 'Otro evento', start_time: '2026-07-01T10:00:00Z', end_time: '2026-07-01T11:00:00Z' }],
        }),
      } as unknown as Response);
      vi.stubGlobal('fetch', fetchMock);

      await component.checkAvailabilityInline();
      expect(component.availabilityPreview[0]).toContain('Ocupado');
    });

    it('should clear availability preview when availability check fails', async () => {
      eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
      eventMock.getProfessors.mockResolvedValue([mockProfessor]);
      fixture.detectChanges();
      await vi.waitFor(() => component.classrooms.length > 0);

      component.classroomId = 'room-1';
      component.startDate = '2026-07-01';
      component.availabilityPreview = ['prev'];

      const fetchMock = vi.fn().mockResolvedValue({ ok: false } as unknown as Response);
      vi.stubGlobal('fetch', fetchMock);

      await component.checkAvailabilityInline();
      expect(component.availabilityPreview).toEqual([]);
    });

    it('should clear availability preview when availability check throws', async () => {
      eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
      eventMock.getProfessors.mockResolvedValue([mockProfessor]);
      fixture.detectChanges();
      await vi.waitFor(() => component.classrooms.length > 0);

      component.classroomId = 'room-1';
      component.startDate = '2026-07-01';
      component.availabilityPreview = ['prev'];

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));

      await component.checkAvailabilityInline();
      expect(component.availabilityPreview).toEqual([]);
      expect(component.checkingAvailability).toBe(false);
    });
  });

  describe('edit mode', () => {
    let component: EventFormPage;
    let fixture: ReturnType<typeof TestBed.createComponent<EventFormPage>>;

    beforeEach(async () => {
      configureTestBed({ id: 'event-1' });
      await TestBed.compileComponents();

      fixture = TestBed.createComponent(EventFormPage);
      component = fixture.componentInstance;
    });

    it('should load event data in edit mode', async () => {
      eventMock.getClassrooms.mockResolvedValue([]);
      eventMock.getProfessors.mockResolvedValue([]);
      eventMock.getEventById.mockResolvedValue(mockEvent);
      fixture.detectChanges();
      await vi.waitFor(() => component.title === mockEvent.title);
      expect(component.isEdit).toBe(true);
      expect(component.eventId).toBe('event-1');
      expect(component.title).toBe(mockEvent.title);
      expect(component.eventType).toBe(mockEvent.event_type);
      expect(component.classroomId).toBe(mockEvent.classroom_id);
      expect(component.professorId).toBe(mockEvent.professor_id);
    });

    it('should be in edit mode when route has id', () => {
      fixture.detectChanges();
      expect(component.isEdit).toBe(true);
      expect(component.eventId).toBe('event-1');
    });

    it('should update an event in edit mode', async () => {
      eventMock.getClassrooms.mockResolvedValue([mockClassroom]);
      eventMock.getProfessors.mockResolvedValue([mockProfessor]);
      eventMock.getEventById.mockResolvedValue(mockEvent);
      fixture.detectChanges();
      await vi.waitFor(() => component.title === mockEvent.title);

      component.title = 'Updated Event';
      component.startDate = '2026-07-02';
      component.endDate = '2026-07-02';
      component.startHour = 9;
      component.startMinute = 0;
      component.startPeriod = 'AM';
      component.endHour = 10;
      component.endMinute = 0;
      component.endPeriod = 'AM';

      await component.save();
      expect(eventMock.updateEvent).toHaveBeenCalled();
      expect(component.submitSuccess).toBe(true);
      expect(component.toastMessage).toBe('Evento actualizado');
    });

    it('should show error toast when event loading fails', async () => {
      eventMock.getClassrooms.mockResolvedValue([]);
      eventMock.getProfessors.mockResolvedValue([]);
      eventMock.getEventById.mockRejectedValue(new Error('load error'));
      fixture.detectChanges();
      await vi.waitFor(() => fixture.isStable());
      expect(component.toastMessage).toBe('Error al cargar el evento');
    });
  });
});
