import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ResetPasswordPage } from './reset-password.page';
import { AuthService, type AuthUser } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import { createRouterMock } from '../../../testing/mock-factories';

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

describe('ResetPasswordPage', () => {
  let component: ResetPasswordPage;
  let fixture: ReturnType<typeof TestBed.createComponent<ResetPasswordPage>>;
  let authMock: ReturnType<typeof createAuthServiceMock>;
  let routerMock: Router;

  beforeEach(async () => {
    authMock = createAuthServiceMock();
    routerMock = createRouterMock();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    });
    TestBed.overrideComponent(ResetPasswordPage, {
      set: {
        imports: [FormsModule, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(ResetPasswordPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show error when password is too short', () => {
    component.password = 'short';
    component.confirmPassword = 'short';
    component.onSubmit();
    expect(component.showToast).toBe(true);
    expect(component.errorMessage).toBe('La contraseña debe tener al menos 8 caracteres');
    expect(authMock.updatePassword).not.toHaveBeenCalled();
  });

  it('should show error when passwords do not match', () => {
    component.password = 'password123';
    component.confirmPassword = 'different123';
    component.onSubmit();
    expect(component.showToast).toBe(true);
    expect(component.errorMessage).toBe('Las contraseñas no coinciden');
    expect(authMock.updatePassword).not.toHaveBeenCalled();
  });

  it('should update password and navigate on valid submit', () => {
    component.password = 'password123';
    component.confirmPassword = 'password123';
    component.onSubmit();
    expect(authMock.updatePassword).toHaveBeenCalledWith('password123');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    expect(component.loading).toBe(false);
  });

  it('should show error when update password fails', () => {
    authMock.updatePassword.mockReturnValue(throwError(() => new Error('Token inválido')));
    component.password = 'password123';
    component.confirmPassword = 'password123';
    component.onSubmit();
    expect(authMock.updatePassword).toHaveBeenCalledWith('password123');
    expect(component.showToast).toBe(true);
    expect(component.errorMessage).toBe('Token inválido');
    expect(component.loading).toBe(false);
  });
});
