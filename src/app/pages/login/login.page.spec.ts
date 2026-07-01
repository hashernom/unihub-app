import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { LoginPage } from './login.page';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { FormValidationService } from '../../core/services/form-validation.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import {
  createSupabaseServiceMock,
  createToastServiceMock,
} from '../../../testing/mock-factories';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ReturnType<typeof TestBed.createComponent<LoginPage>>;
  let authMock: { signIn: ReturnType<typeof vi.fn> };
  let toastMock: ReturnType<typeof createToastServiceMock>;
  let router: Router;

  beforeEach(async () => {
    authMock = {
      signIn: vi.fn().mockReturnValue(
        new BehaviorSubject({
          email: 'test@test.com',
          profile: {
            role: 'student',
            full_name: 'Test',
            student_code: 'U1',
            id: '1',
            avatar_url: null,
            carrera: '',
            semestre: '',
          },
        }),
      ),
    };
    toastMock = createToastServiceMock();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: SupabaseService, useValue: createSupabaseServiceMock() },
        { provide: ToastService, useValue: toastMock },
        FormValidationService,
        provideRouter([
          { path: 'register', redirectTo: '', pathMatch: 'full' },
          { path: 'forgot-password', redirectTo: '', pathMatch: 'full' },
        ]),
      ],
    });
    TestBed.overrideComponent(LoginPage, {
      set: {
        imports: [FormsModule, RouterLink, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // AC1: LoginPage renders form with email and password
  it('should render at least 2 ion-input elements (email + password)', () => {
    const inputs = fixture.nativeElement.querySelectorAll('ion-input');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it('should have empty email and password initially', () => {
    expect(component.email).toBe('');
    expect(component.password).toBe('');
  });

  // AC3: Invalid form shows errors
  it('should show error when submitting with empty fields', async () => {
    await component.onLogin();
    expect(component.errorMessage).not.toBe('');
    expect(component.showToast).toBe(true);
    expect(toastMock.error).toHaveBeenCalled();
  });

  it('should not call auth.signIn when fields are empty', async () => {
    await component.onLogin();
    expect(authMock.signIn).not.toHaveBeenCalled();
  });

  it('should call auth.signIn with trimmed email on valid submit', async () => {
    component.email = '  test@test.com  ';
    component.password = 'password123';
    await component.onLogin();
    expect(authMock.signIn).toHaveBeenCalledWith('test@test.com', 'password123');
  });

  it('should set loading=false after successful login', async () => {
    component.email = 'test@test.com';
    component.password = 'password123';
    await component.onLogin();
    expect(component.loading).toBe(false);
  });

  it('should show "Credenciales inválidas" on invalid credentials error', async () => {
    authMock.signIn.mockReturnValue(
      throwError(() => new Error('Invalid login credentials')),
    );
    component.email = 'bad@test.com';
    component.password = 'wrong';
    await component.onLogin();
    expect(component.errorMessage).toContain('Credenciales inválidas');
  });

  it('should show "Correo no verificado" on email not confirmed error', async () => {
    authMock.signIn.mockReturnValue(
      throwError(() => new Error('Email not confirmed')),
    );
    component.email = 't@t.com';
    component.password = 'pw';
    await component.onLogin();
    expect(component.errorMessage).toContain('no verificado');
  });

  it('should navigate to register page', () => {
    vi.spyOn(router, 'navigate');
    component.goToRegister();
    expect(router.navigate).toHaveBeenCalledWith(['/register']);
  });

  it('should navigate to forgot-password page', () => {
    vi.spyOn(router, 'navigate');
    component.goToForgotPassword();
    expect(router.navigate).toHaveBeenCalledWith(['/forgot-password']);
  });

  it('should reset state on ionViewWillEnter', () => {
    component.loading = true;
    component.errorMessage = 'error';
    component.showToast = true;
    component.ionViewWillEnter();
    expect(component.loading).toBe(false);
    expect(component.errorMessage).toBe('');
    expect(component.showToast).toBe(false);
  });

  it('should not throw on ngOnDestroy', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
