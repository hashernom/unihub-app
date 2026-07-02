import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { vi } from 'vitest';
import { BehaviorSubject } from 'rxjs';
import { AdminRegisterPage } from './admin-register.page';
import { AuthService, type AuthUser } from '../../core/services/auth.service';
import { FormValidationService } from '../../core/services/form-validation.service';
import { Router } from '@angular/router';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import { createRouterMock } from '../../../testing/mock-factories';

function createMockAuthUser(): AuthUser {
  return {
    id: 'admin-1',
    email: 'admin@example.com',
    profile: {
      id: 'admin-1',
      student_code: 'A0001',
      full_name: 'Admin User',
      role: 'admin',
      avatar_url: null,
      carrera: 'Administración',
      semestre: '1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  };
}

describe('AdminRegisterPage', () => {
  let component: AdminRegisterPage;
  let fixture: ReturnType<typeof TestBed.createComponent<AdminRegisterPage>>;
  let authMock: {
    currentUser$: BehaviorSubject<AuthUser | null>;
    isAdmin$: ReturnType<BehaviorSubject<boolean>['asObservable']>;
    getAccessToken: ReturnType<typeof vi.fn>;
  };
  let formValidationMock: { getErrorMessage: ReturnType<typeof vi.fn> };
  let routerMock: Router;

  beforeEach(async () => {
    authMock = {
      currentUser$: new BehaviorSubject<AuthUser | null>(createMockAuthUser()),
      isAdmin$: new BehaviorSubject<boolean>(true).asObservable(),
      getAccessToken: vi.fn().mockResolvedValue('fake-token'),
    };
    formValidationMock = { getErrorMessage: vi.fn().mockReturnValue('') };
    routerMock = createRouterMock();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: FormValidationService, useValue: formValidationMock },
        { provide: Router, useValue: routerMock },
      ],
    });
    TestBed.overrideComponent(AdminRegisterPage, {
      set: {
        imports: [FormsModule, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(AdminRegisterPage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show error when fields are empty', async () => {
    component.email = '';
    component.password = '';
    component.fullName = '';
    await component.register();
    expect(component.showToast).toBe(true);
    expect(component.toastMessage).toBe('Todos los campos son obligatorios');
  });

  it('should show error when password is too short', async () => {
    component.email = 'admin@example.com';
    component.password = '1234567';
    component.fullName = 'Admin User';
    await component.register();
    expect(component.showToast).toBe(true);
    expect(component.toastMessage).toBe('La contraseña debe tener al menos 8 caracteres');
  });

  it('should register admin successfully', async () => {
    component.email = 'new@example.com';
    component.password = 'password123';
    component.fullName = 'New Admin';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as Response));

    await component.register();
    expect(authMock.getAccessToken).toHaveBeenCalled();
    expect(component.showToast).toBe(true);
    expect(component.toastMessage).toBe('Admin registrado exitosamente');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('should show error when edge function returns error', async () => {
    component.email = 'new@example.com';
    component.password = 'password123';
    component.fullName = 'New Admin';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'Email already exists' }),
    } as unknown as Response));

    await component.register();
    expect(component.showToast).toBe(true);
    expect(component.toastMessage).toBe('Email already exists');
  });
});
