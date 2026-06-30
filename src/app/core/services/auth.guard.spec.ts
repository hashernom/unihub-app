import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { AuthGuard, AdminGuard, NoAuthGuard } from './auth.guard';
import { AuthService, type AuthUser } from './auth.service';
import { createRouterMock } from '../../../testing/mock-factories';

function createAuthUser(role: 'student' | 'admin'): AuthUser {
  return {
    id: 'user-1',
    email: 'test@test.com',
    profile: {
      id: 'user-1',
      student_code: 'U20231001',
      full_name: 'Test',
      role,
      avatar_url: null,
      carrera: 'Ingeniería',
      semestre: '5',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  };
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authMock: {
    isAuthenticated$: BehaviorSubject<boolean>;
    currentUser$: BehaviorSubject<AuthUser | null>;
    isAdmin$: BehaviorSubject<boolean>;
  };
  let routerMock: Router;

  beforeEach(() => {
    authMock = {
      isAuthenticated$: new BehaviorSubject(false),
      currentUser$: new BehaviorSubject<AuthUser | null>(null),
      isAdmin$: new BehaviorSubject(false),
    };
    routerMock = createRouterMock();

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    });
    guard = TestBed.inject(AuthGuard);
  });

  it('should allow activation when authenticated', async () => {
    authMock.isAuthenticated$.next(true);
    const result = await firstValueFrom(guard.canActivate());
    expect(result).toBe(true);
  });

  it('should redirect to login when not authenticated', async () => {
    authMock.isAuthenticated$.next(false);
    await firstValueFrom(guard.canActivate());
    expect(routerMock.parseUrl).toHaveBeenCalledWith('/login');
  });
});

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let authMock: {
    isAuthenticated$: BehaviorSubject<boolean>;
    currentUser$: BehaviorSubject<AuthUser | null>;
    isAdmin$: BehaviorSubject<boolean>;
  };
  let routerMock: Router;

  beforeEach(() => {
    authMock = {
      isAuthenticated$: new BehaviorSubject(false),
      currentUser$: new BehaviorSubject<AuthUser | null>(null),
      isAdmin$: new BehaviorSubject(false),
    };
    routerMock = createRouterMock();

    TestBed.configureTestingModule({
      providers: [
        AdminGuard,
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    });
    guard = TestBed.inject(AdminGuard);
  });

  it('should allow activation when admin', async () => {
    authMock.isAdmin$.next(true);
    const result = await firstValueFrom(guard.canActivate());
    expect(result).toBe(true);
  });

  it('should redirect to dashboard when not admin', async () => {
    authMock.isAdmin$.next(false);
    await firstValueFrom(guard.canActivate());
    expect(routerMock.parseUrl).toHaveBeenCalledWith('/tabs/dashboard');
  });
});

describe('NoAuthGuard', () => {
  let guard: NoAuthGuard;
  let authMock: {
    isAuthenticated$: BehaviorSubject<boolean>;
    currentUser$: BehaviorSubject<AuthUser | null>;
    isAdmin$: BehaviorSubject<boolean>;
  };
  let routerMock: Router;

  beforeEach(() => {
    authMock = {
      isAuthenticated$: new BehaviorSubject(false),
      currentUser$: new BehaviorSubject<AuthUser | null>(null),
      isAdmin$: new BehaviorSubject(false),
    };
    routerMock = createRouterMock();

    TestBed.configureTestingModule({
      providers: [
        NoAuthGuard,
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    });
    guard = TestBed.inject(NoAuthGuard);
  });

  it('should allow activation when not authenticated', async () => {
    authMock.isAuthenticated$.next(false);
    const result = await firstValueFrom(guard.canActivate());
    expect(result).toBe(true);
  });

  it('should redirect admin to admin dashboard', async () => {
    authMock.isAuthenticated$.next(true);
    authMock.currentUser$.next(createAuthUser('admin'));
    await firstValueFrom(guard.canActivate());
    expect(routerMock.parseUrl).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('should redirect student to tabs dashboard', async () => {
    authMock.isAuthenticated$.next(true);
    authMock.currentUser$.next(createAuthUser('student'));
    await firstValueFrom(guard.canActivate());
    expect(routerMock.parseUrl).toHaveBeenCalledWith('/tabs/dashboard');
  });
});
