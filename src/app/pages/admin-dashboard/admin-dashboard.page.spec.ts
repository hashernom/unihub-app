import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';
import { AdminDashboardPage } from './admin-dashboard.page';
import { AuthService, type AuthUser } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import {
  createSupabaseServiceMock,
  createQueryBuilderMock,
} from '../../../testing/mock-factories';
import type { QueryBuilderMock } from '../../../testing/mock-factories';

function createMockAuthUser(role: 'student' | 'admin' = 'admin'): AuthUser {
  return {
    id: 'admin-1',
    email: 'admin@example.com',
    profile: {
      id: 'admin-1',
      student_code: 'A0001',
      full_name: 'Admin User',
      role,
      avatar_url: null,
      carrera: 'Administración',
      semestre: '1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  };
}

describe('AdminDashboardPage', () => {
  let component: AdminDashboardPage;
  let fixture: ReturnType<typeof TestBed.createComponent<AdminDashboardPage>>;
  let authMock: {
    currentUser$: BehaviorSubject<AuthUser | null>;
    isAdmin$: ReturnType<BehaviorSubject<boolean>['asObservable']>;
    signOut: ReturnType<typeof vi.fn>;
  };
  let supabaseMock: SupabaseService;
  let profilesMock: QueryBuilderMock;
  let surveysMock: QueryBuilderMock;
  let eventsMock: QueryBuilderMock;
  let errorHandlerMock: { handleHttpError: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authMock = {
      currentUser$: new BehaviorSubject<AuthUser | null>(createMockAuthUser()),
      isAdmin$: new BehaviorSubject<boolean>(true).asObservable(),
      signOut: vi.fn().mockReturnValue(of(undefined)),
    };

    profilesMock = createQueryBuilderMock({ then: { count: 42, error: null } });
    surveysMock = createQueryBuilderMock({ then: { count: 7, error: null } });
    eventsMock = createQueryBuilderMock({ then: { count: 15, error: null } });
    supabaseMock = createSupabaseServiceMock();
    (supabaseMock.client.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'profiles') return profilesMock;
      if (table === 'surveys') return surveysMock;
      if (table === 'events') return eventsMock;
      return createQueryBuilderMock();
    });

    errorHandlerMock = { handleHttpError: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: ErrorHandlerService, useValue: errorHandlerMock },
      ],
    });
    TestBed.overrideComponent(AdminDashboardPage, {
      set: {
        imports: [...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(AdminDashboardPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load metrics on init', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loadMetricsSpy = vi.spyOn(component as any, 'loadMetrics');
    fixture.detectChanges();
    expect(loadMetricsSpy).toHaveBeenCalled();
    await loadMetricsSpy.mock.results[0].value;
    expect(component.userCount).toBe(42);
    expect(component.surveyCount).toBe(7);
    expect(component.eventCount).toBe(15);
    expect(profilesMock.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    expect(surveysMock.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    expect(surveysMock.eq).toHaveBeenCalledWith('is_active', true);
    expect(eventsMock.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    expect(eventsMock.gte).toHaveBeenCalledWith('start_time', expect.any(String));
  });

  it('should handle metrics errors via error handler', async () => {
    const err = new Error('profiles error');
    profilesMock.then = vi.fn((_resolve: unknown, reject: (reason: unknown) => void) => reject(err));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loadMetricsSpy = vi.spyOn(component as any, 'loadMetrics');
    fixture.detectChanges();
    expect(loadMetricsSpy).toHaveBeenCalled();
    await loadMetricsSpy.mock.results[0].value;
    expect(errorHandlerMock.handleHttpError).toHaveBeenCalledWith(err);
  });

  it('should call auth.signOut on logout', () => {
    component.onLogout();
    expect(authMock.signOut).toHaveBeenCalled();
  });

  it('should expose admin navigation cards', () => {
    expect(component.adminCards.length).toBeGreaterThan(0);
    expect(component.adminCards.some((c) => c.route === '/admin/announcements')).toBe(true);
    expect(component.adminCards.some((c) => c.route === '/admin/classrooms')).toBe(true);
  });
});
