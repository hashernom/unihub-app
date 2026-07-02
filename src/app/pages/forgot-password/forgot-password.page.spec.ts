import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BehaviorSubject, throwError, from } from 'rxjs';
import { vi } from 'vitest';
import { ForgotPasswordPage } from './forgot-password.page';
import { AuthService, type AuthUser } from '../../core/services/auth.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import { createActivatedRouteMock, createRouterMock } from '../../../testing/mock-factories';

describe('ForgotPasswordPage', () => {
  let component: ForgotPasswordPage;
  let fixture: ReturnType<typeof TestBed.createComponent<ForgotPasswordPage>>;
  let authMock: {
    resetPassword: ReturnType<typeof vi.fn>;
    currentUser$: BehaviorSubject<AuthUser | null>;
    isAdmin$: BehaviorSubject<boolean>;
  };
  let routerMock: Router;

  beforeEach(async () => {
    authMock = {
      resetPassword: vi.fn().mockReturnValue(from(Promise.resolve(undefined))),
      currentUser$: new BehaviorSubject<AuthUser | null>(null),
      isAdmin$: new BehaviorSubject<boolean>(false),
    };
    routerMock = createRouterMock();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: createActivatedRouteMock() },
      ],
    });
    TestBed.overrideComponent(ForgotPasswordPage, {
      set: {
        imports: [FormsModule, RouterLink, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have empty email initially', () => {
    expect(component.email).toBe('');
    expect(component.sent).toBe(false);
    expect(component.loading).toBe(false);
  });

  it('should submit and set sent on success', async () => {
    component.email = 'test@test.com';
    component.onSubmit();
    expect(component.loading).toBe(true);
    await vi.waitFor(() => component.sent === true);
    expect(authMock.resetPassword).toHaveBeenCalledWith('test@test.com');
    expect(component.loading).toBe(false);
    expect(component.sent).toBe(true);
  });

  it('should show error on submit failure', async () => {
    authMock.resetPassword.mockReturnValue(throwError(() => new Error('network')));
    component.email = 'test@test.com';
    component.onSubmit();
    await vi.waitFor(() => component.showToast === true);
    expect(authMock.resetPassword).toHaveBeenCalledWith('test@test.com');
    expect(component.loading).toBe(false);
    expect(component.showToast).toBe(true);
    expect(component.toastMessage).toBe('Error de conexion. Intenta nuevamente.');
  });

  it('should not submit when email is empty', () => {
    component.onSubmit();
    expect(authMock.resetPassword).not.toHaveBeenCalled();
    expect(component.loading).toBe(false);
  });

  it('should navigate to login', () => {
    const navigateSpy = vi.spyOn(routerMock, 'navigate');
    component.goToLogin();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
