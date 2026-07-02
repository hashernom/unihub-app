import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';
import { NoticeFormPage } from './notice-form.page';
import { NoticeService, type Notice } from '../../core/services/notice.service';
import { AuthService, type AuthUser } from '../../core/services/auth.service';
import { FormValidationService } from '../../core/services/form-validation.service';
import { Router } from '@angular/router';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import { createRouterMock } from '../../../testing/mock-factories';

const mockNotice: Notice = {
  id: 'notice-1',
  title: 'Aviso de prueba',
  content: 'Contenido del aviso',
  priority: 'high',
  created_by: 'user-1',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

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

describe('NoticeFormPage', () => {
  let component: NoticeFormPage;
  let fixture: ReturnType<typeof TestBed.createComponent<NoticeFormPage>>;
  let noticeMock: {
    getAllNotices: ReturnType<typeof vi.fn>;
    createNotice: ReturnType<typeof vi.fn>;
    updateNotice: ReturnType<typeof vi.fn>;
  };
  let routerMock: Router;
  let authMock: ReturnType<typeof createAuthServiceMock>;
  let routeMock: { snapshot: { paramMap: { get: ReturnType<typeof vi.fn> } } };

  beforeEach(async () => {
    noticeMock = {
      getAllNotices: vi.fn().mockResolvedValue([mockNotice]),
      createNotice: vi.fn().mockResolvedValue(undefined),
      updateNotice: vi.fn().mockResolvedValue(undefined),
    };
    routerMock = createRouterMock();
    authMock = createAuthServiceMock();
    routeMock = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue(null),
        },
      },
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: NoticeService, useValue: noticeMock },
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock },
        FormValidationService,
      ],
    });
    TestBed.overrideComponent(NoticeFormPage, {
      set: {
        imports: [FormsModule, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(NoticeFormPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load notice in edit mode on init', async () => {
    routeMock.snapshot.paramMap.get.mockReturnValue('notice-1');
    fixture.detectChanges();
    await vi.waitFor(() => component.title === mockNotice.title);
    expect(component.isEdit).toBe(true);
    expect(component.noticeId).toBe('notice-1');
    expect(component.title).toBe(mockNotice.title);
    expect(component.content).toBe(mockNotice.content);
    expect(component.priority).toBe(mockNotice.priority);
    expect(component.isActive).toBe(mockNotice.is_active);
  });

  it('should show toast when saving with empty fields', async () => {
    component.title = '   ';
    component.content = '';
    await component.save();
    expect(component.showToast).toBe(true);
    expect(component.toastMessage).toBe('El título y el contenido son obligatorios');
    expect(noticeMock.createNotice).not.toHaveBeenCalled();
    expect(noticeMock.updateNotice).not.toHaveBeenCalled();
  });

  it('should create a new notice on valid save', async () => {
    vi.useFakeTimers();
    component.title = 'Nuevo aviso';
    component.content = 'Nuevo contenido';
    component.priority = 'high';
    component.isActive = true;
    await component.save();
    expect(noticeMock.createNotice).toHaveBeenCalledWith({
      title: 'Nuevo aviso',
      content: 'Nuevo contenido',
      priority: 'high',
      is_active: true,
      created_by: 'user-1',
    });
    expect(component.toastMessage).toBe('Aviso creado');
    vi.advanceTimersByTime(1000);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/notices']);
    vi.useRealTimers();
  });

  it('should update an existing notice on valid save in edit mode', async () => {
    component.isEdit = true;
    component.noticeId = 'notice-1';
    component.title = 'Aviso editado';
    component.content = 'Contenido editado';
    component.priority = 'medium';
    component.isActive = false;
    await component.save();
    expect(noticeMock.updateNotice).toHaveBeenCalledWith('notice-1', {
      title: 'Aviso editado',
      content: 'Contenido editado',
      priority: 'medium',
      is_active: false,
    });
    expect(component.toastMessage).toBe('Aviso actualizado');
  });

  it('should show toast on load error', async () => {
    routeMock.snapshot.paramMap.get.mockReturnValue('notice-1');
    noticeMock.getAllNotices.mockRejectedValue(new Error('network error'));
    fixture.detectChanges();
    await vi.waitFor(() => component.showToast);
    expect(component.toastMessage).toBe('Error al cargar el aviso');
  });
});
