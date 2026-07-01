import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { RegisterPage } from './register.page';
import { AuthService, type AuthUser } from '../../core/services/auth.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'U20231001@mail.udes.edu.co',
  profile: {
    id: 'user-1',
    student_code: 'U20231001',
    full_name: 'Test Student',
    role: 'student',
    avatar_url: null,
    carrera: 'Ingeniería de Sistemas',
    semestre: '5',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
};

describe('RegisterPage', () => {
  let component: RegisterPage;
  let fixture: ReturnType<typeof TestBed.createComponent<RegisterPage>>;
  let authMock: {
    signUp: ReturnType<typeof vi.fn>;
    setCurrentUser: ReturnType<typeof vi.fn>;
    currentUser$: BehaviorSubject<AuthUser | null>;
  };
  let router: Router;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    authMock = {
      signUp: vi.fn(),
      setCurrentUser: vi.fn(),
      currentUser$: new BehaviorSubject<AuthUser | null>(null),
    };
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: vi.fn().mockResolvedValue({ valid: true }),
    } as unknown as Response);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authMock },
        provideRouter([{ path: 'tabs/dashboard', redirectTo: '', pathMatch: 'full' }]),
      ],
    });
    TestBed.overrideComponent(RegisterPage, {
      set: {
        imports: [FormsModule, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(RegisterPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate all required fields', async () => {
    await component.onRegister();
    expect(component.errorMessage).toBe('Todos los campos son obligatorios');
  });

  it('should validate institutional email', async () => {
    component.email = 'bad@gmail.com';
    component.fullName = 'Test';
    component.password = 'password123';
    component.confirmPassword = 'password123';
    component.carrera = 'Ingeniería de Sistemas';
    component.semestre = '5';
    await component.onRegister();
    expect(component.errorMessage).toContain('correo institucional');
  });

  it('should validate password length', async () => {
    component.email = 'U20231001@mail.udes.edu.co';
    component.fullName = 'Test';
    component.password = 'short';
    component.confirmPassword = 'short';
    component.carrera = 'Ingeniería de Sistemas';
    component.semestre = '5';
    await component.onRegister();
    expect(component.errorMessage).toContain('8 caracteres');
  });

  it('should validate password match', async () => {
    component.email = 'U20231001@mail.udes.edu.co';
    component.fullName = 'Test';
    component.password = 'password123';
    component.confirmPassword = 'different';
    component.carrera = 'Ingeniería de Sistemas';
    component.semestre = '5';
    await component.onRegister();
    expect(component.errorMessage).toBe('Las contraseñas no coinciden');
  });

  it('should register and navigate on success', async () => {
    component.email = 'U20231001@mail.udes.edu.co';
    component.fullName = 'Test Student';
    component.password = 'password123';
    component.confirmPassword = 'password123';
    component.carrera = 'Ingeniería de Sistemas';
    component.semestre = '5';
    authMock.signUp.mockReturnValue(of(mockUser));
    const navigateSpy = vi.spyOn(router, 'navigate');
    await component.onRegister();
    expect(authMock.signUp).toHaveBeenCalledWith(
      'U20231001@mail.udes.edu.co',
      'password123',
      'Test Student',
      'Ingeniería de Sistemas',
      '5',
    );
    expect(authMock.setCurrentUser).toHaveBeenCalledWith(mockUser);
    expect(navigateSpy).toHaveBeenCalledWith(['/tabs/dashboard']);
  });

  it('should show invalid student code error', async () => {
    component.email = 'U20231001@mail.udes.edu.co';
    component.fullName = 'Test';
    component.password = 'password123';
    component.confirmPassword = 'password123';
    component.carrera = 'Ingeniería de Sistemas';
    component.semestre = '5';
    fetchSpy.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ valid: false, message: 'Código no existe' }),
    } as unknown as Response);
    await component.onRegister();
    expect(component.errorMessage).toBe('Código no existe');
  });

  it('should show rate limit error', async () => {
    component.email = 'U20231001@mail.udes.edu.co';
    component.fullName = 'Test';
    component.password = 'password123';
    component.confirmPassword = 'password123';
    component.carrera = 'Ingeniería de Sistemas';
    component.semestre = '5';
    authMock.signUp.mockReturnValue(throwError(() => ({ msg: 'rate limit' })));
    await component.onRegister();
    expect(component.errorMessage).toContain('Demasiados intentos');
  });

  it('should show duplicate email error', async () => {
    component.email = 'U20231001@mail.udes.edu.co';
    component.fullName = 'Test';
    component.password = 'password123';
    component.confirmPassword = 'password123';
    component.carrera = 'Ingeniería de Sistemas';
    component.semestre = '5';
    authMock.signUp.mockReturnValue(throwError(() => ({ message: 'already registered' })));
    await component.onRegister();
    expect(component.errorMessage).toBe('Este correo ya está registrado.');
  });

  it('should navigate to login', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.goToLogin();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
