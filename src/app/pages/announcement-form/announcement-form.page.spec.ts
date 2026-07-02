import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { AnnouncementFormPage } from './announcement-form.page';
import { AnnouncementService, type Announcement } from '../../core/services/announcement.service';
import { AuthService, type AuthUser } from '../../core/services/auth.service';
import { FormValidationService } from '../../core/services/form-validation.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import { createRouterMock } from '../../../testing/mock-factories';

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'admin@example.com',
  profile: {
    id: 'user-1',
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

const mockAnnouncement: Announcement = {
  id: 'ann-1',
  title: 'Important Update',
  body: 'This is the body of the announcement.',
  category: 'urgent',
  is_pinned: true,
  created_by: 'user-1',
  expires_at: '2026-12-31T23:59:59Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('AnnouncementFormPage', () => {
  let component: AnnouncementFormPage;
  let fixture: ReturnType<typeof TestBed.createComponent<AnnouncementFormPage>>;
  let announcementMock: {
    getAllAnnouncements: ReturnType<typeof vi.fn>;
    createAnnouncement: ReturnType<typeof vi.fn>;
    updateAnnouncement: ReturnType<typeof vi.fn>;
  };
  let authMock: {
    currentUser$: BehaviorSubject<AuthUser | null>;
    isAdmin$: BehaviorSubject<boolean>;
  };
  let routerMock: Router;
  let routeMock: { snapshot: { paramMap: { get: ReturnType<typeof vi.fn> } } };
  let formValidationMock: { getErrorMessage: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    announcementMock = {
      getAllAnnouncements: vi.fn(),
      createAnnouncement: vi.fn(),
      updateAnnouncement: vi.fn(),
    };
    authMock = {
      currentUser$: new BehaviorSubject<AuthUser | null>(mockUser),
      isAdmin$: new BehaviorSubject<boolean>(true),
    };
    routerMock = createRouterMock();
    routeMock = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue(null),
        },
      },
    };
    formValidationMock = { getErrorMessage: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AnnouncementService, useValue: announcementMock },
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock },
        { provide: FormValidationService, useValue: formValidationMock },
      ],
    });
    TestBed.overrideComponent(AnnouncementFormPage, {
      set: {
        imports: [FormsModule, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(AnnouncementFormPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load announcement in edit mode', async () => {
    routeMock.snapshot.paramMap.get.mockReturnValue('ann-1');
    announcementMock.getAllAnnouncements.mockResolvedValue([mockAnnouncement]);

    fixture.detectChanges();
    await vi.waitFor(() => component.title === mockAnnouncement.title);

    expect(component.isEdit).toBe(true);
    expect(component.announcementId).toBe('ann-1');
    expect(component.title).toBe(mockAnnouncement.title);
    expect(component.body).toBe(mockAnnouncement.body);
    expect(component.category).toBe(mockAnnouncement.category);
    expect(component.isPinned).toBe(mockAnnouncement.is_pinned);
    expect(component.expiresAt).toBe(mockAnnouncement.expires_at);
  });

  it('should create a new announcement when saving in create mode', async () => {
    vi.useFakeTimers();
    announcementMock.createAnnouncement.mockResolvedValue(undefined);

    component.title = 'New Announcement';
    component.body = 'New announcement body';
    component.category = 'general';
    component.isPinned = false;
    component.expiresAt = null;

    await component.save();

    expect(announcementMock.createAnnouncement).toHaveBeenCalledWith({
      title: 'New Announcement',
      body: 'New announcement body',
      category: 'general',
      is_pinned: false,
      expires_at: null,
      created_by: mockUser.id,
    });
    expect(component.toastMessage).toBe('Anuncio creado');

    vi.advanceTimersByTime(1000);
    await vi.runOnlyPendingTimersAsync();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/announcements']);

    vi.useRealTimers();
  });

  it('should update an existing announcement when saving in edit mode', async () => {
    vi.useFakeTimers();
    component.isEdit = true;
    component.announcementId = 'ann-1';
    component.title = 'Updated Title';
    component.body = 'Updated body';
    component.category = 'academic';
    component.isPinned = true;
    component.expiresAt = '2026-11-30T00:00:00Z';
    announcementMock.updateAnnouncement.mockResolvedValue(undefined);

    await component.save();

    expect(announcementMock.updateAnnouncement).toHaveBeenCalledWith('ann-1', {
      title: 'Updated Title',
      body: 'Updated body',
      category: 'academic',
      is_pinned: true,
      expires_at: '2026-11-30T00:00:00Z',
    });
    expect(component.toastMessage).toBe('Anuncio actualizado');

    vi.advanceTimersByTime(1000);
    await vi.runOnlyPendingTimersAsync();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/announcements']);

    vi.useRealTimers();
  });

  it('should show a toast when required fields are empty on save', async () => {
    component.title = '';
    component.body = '';

    await component.save();

    expect(announcementMock.createAnnouncement).not.toHaveBeenCalled();
    expect(announcementMock.updateAnnouncement).not.toHaveBeenCalled();
    expect(component.toastMessage).toBe('El título y el contenido son obligatorios');
  });

  it('should show a toast when loading the announcement fails', async () => {
    routeMock.snapshot.paramMap.get.mockReturnValue('ann-1');
    announcementMock.getAllAnnouncements.mockRejectedValue(new Error('load error'));

    fixture.detectChanges();
    await vi.waitFor(() => component.toastMessage === 'Error al cargar el anuncio');

    expect(component.toastMessage).toBe('Error al cargar el anuncio');
  });
});
