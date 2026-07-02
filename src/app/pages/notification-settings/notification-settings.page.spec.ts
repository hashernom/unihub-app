import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';
import { NotificationSettingsPage } from './notification-settings.page';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService, type AuthUser } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import {
  createSupabaseServiceMock,
  createToastServiceMock,
  createQueryBuilderMock,
} from '../../../testing/mock-factories';
import type { QueryBuilderMock } from '../../../testing/mock-factories';

function createMockUser(): AuthUser {
  return {
    id: 'user-1',
    email: 'test@example.com',
    profile: {
      id: 'user-1',
      student_code: 'U20231001',
      full_name: 'Juan Pérez',
      role: 'student',
      avatar_url: null,
      carrera: 'Ingeniería',
      semestre: '5',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  };
}

function createAuthServiceMock(user: AuthUser | null = createMockUser()) {
  const currentUser$ = new BehaviorSubject<AuthUser | null>(user);
  const isAdmin$ = new BehaviorSubject<boolean>(user?.profile.role === 'admin');
  return {
    currentUser$,
    isAdmin$,
    updatePassword: vi.fn().mockReturnValue(of(undefined)),
  };
}

describe('NotificationSettingsPage', () => {
  let component: NotificationSettingsPage;
  let fixture: ReturnType<typeof TestBed.createComponent<NotificationSettingsPage>>;
  let supabaseMock: SupabaseService;
  let queryMock: QueryBuilderMock;
  let authMock: ReturnType<typeof createAuthServiceMock>;
  let toastMock: ToastService;
  let errorHandlerMock: { handleHttpError: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    queryMock = createQueryBuilderMock({
      single: {
        data: {
          user_id: 'user-1',
          event_reminder_1h: false,
          event_reminder_15m: false,
          survey_reminders: false,
          announcement_notifications: false,
        },
        error: null,
      },
    });
    supabaseMock = createSupabaseServiceMock();
    (supabaseMock.client.from as ReturnType<typeof vi.fn>).mockReturnValue(queryMock);
    authMock = createAuthServiceMock();
    toastMock = createToastServiceMock();
    errorHandlerMock = { handleHttpError: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: AuthService, useValue: authMock },
        { provide: ToastService, useValue: toastMock },
        { provide: ErrorHandlerService, useValue: errorHandlerMock },
      ],
    });
    TestBed.overrideComponent(NotificationSettingsPage, {
      set: {
        imports: [...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(NotificationSettingsPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load settings on init', async () => {
    fixture.detectChanges();
    await vi.waitUntil(() => !component.loading);

    expect(component.settings.event_reminder_1h).toBe(false);
    expect(component.settings.event_reminder_15m).toBe(false);
    expect(component.settings.survey_reminders).toBe(false);
    expect(component.settings.announcement_notifications).toBe(false);
    expect(component.noUser).toBe(false);
    expect(component.error).toBe(false);
  });

  it('should show no user state when user is null', async () => {
    authMock.currentUser$.next(null);
    fixture.detectChanges();
    await vi.waitUntil(() => component.noUser);

    expect(component.loading).toBe(false);
    expect(component.error).toBe(false);
  });

  it('should toggle a setting and save it', async () => {
    fixture.detectChanges();
    await vi.waitUntil(() => !component.loading);

    component.settings.event_reminder_1h = false;
    await component.onToggleChange('event_reminder_1h');

    expect(queryMock.upsert).toHaveBeenCalledWith(
      {
        user_id: 'user-1',
        event_reminder_1h: false,
        event_reminder_15m: false,
        survey_reminders: false,
        announcement_notifications: false,
      },
      { onConflict: 'user_id' },
    );
    expect(toastMock.success).toHaveBeenCalledWith('Preferencia actualizada');
  });

  it('should revert setting on toggle error', async () => {
    fixture.detectChanges();
    await vi.waitUntil(() => !component.loading);

    queryMock.upsert.mockResolvedValue({ data: null, error: new Error('network error') });
    const previousValue = component.settings.survey_reminders;
    await component.onToggleChange('survey_reminders');

    expect(component.settings.survey_reminders).toBe(!previousValue);
    expect(errorHandlerMock.handleHttpError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Function),
    );
  });
});
