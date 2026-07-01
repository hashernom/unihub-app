import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';
import { ProfilePage } from './profile.page';
import { AuthService, type AuthUser } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { ToastService } from '../../core/services/toast.service';
import { ThemeService } from '../../core/services/theme.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import {
  createSupabaseServiceMock,
  createToastServiceMock,
  createQueryBuilderMock,
} from '../../../testing/mock-factories';
import type { QueryBuilderMock } from '../../../testing/mock-factories';

function createMockUser(role: 'student' | 'admin' = 'student', avatarUrl: string | null = null): AuthUser {
  return {
    id: 'user-1',
    email: 'test@example.com',
    profile: {
      id: 'user-1',
      student_code: 'U20231001',
      full_name: 'Juan Pérez',
      role,
      avatar_url: avatarUrl,
      carrera: 'Ingeniería',
      semestre: '5',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  };
}

describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ReturnType<typeof TestBed.createComponent<ProfilePage>>;
  let authMock: {
    currentUser$: BehaviorSubject<AuthUser | null>;
    signOut: ReturnType<typeof vi.fn>;
  };
  let supabaseMock: SupabaseService;
  let queryMock: QueryBuilderMock;
  let toastMock: ToastService;
  let themeMock: {
    currentMode: ReturnType<typeof vi.fn>;
    setTheme: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authMock = {
      currentUser$: new BehaviorSubject<AuthUser | null>(createMockUser()),
      signOut: vi.fn().mockReturnValue(of(undefined)),
    };
    queryMock = createQueryBuilderMock({ then: { data: null, error: null } });
    supabaseMock = createSupabaseServiceMock();
    (supabaseMock.client.from as ReturnType<typeof vi.fn>).mockReturnValue(queryMock);
    toastMock = createToastServiceMock();
    themeMock = {
      currentMode: vi.fn().mockReturnValue('system'),
      setTheme: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: ToastService, useValue: toastMock },
        { provide: ThemeService, useValue: themeMock },
      ],
    });
    TestBed.overrideComponent(ProfilePage, {
      set: {
        imports: [FormsModule, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.unstubAllGlobals();
  });

  it('should create and load the current user', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.user).toEqual(createMockUser());
    expect(component.userLoading).toBe(false);
    expect(component.editName).toBe('Juan Pérez');
  });

  it('should use /tabs/dashboard as defaultHref for students', () => {
    fixture.detectChanges();
    expect(component.defaultHref).toBe('/tabs/dashboard');
  });

  it('should use /admin/dashboard as defaultHref for admins', () => {
    authMock.currentUser$.next(createMockUser('admin'));
    fixture.detectChanges();
    expect(component.defaultHref).toBe('/admin/dashboard');
  });

  it('should change theme and update themeMode', async () => {
    await component.onThemeChange('dark');
    expect(themeMock.setTheme).toHaveBeenCalledWith('dark');
    expect(component.themeMode).toBe('dark');
  });

  it('should toggle editing and reset editName', () => {
    fixture.detectChanges();
    component.editing = false;
    component.editName = 'Changed Name';
    component.toggleEdit();
    expect(component.editing).toBe(true);
    expect(component.editName).toBe('Juan Pérez');
    component.toggleEdit();
    expect(component.editing).toBe(false);
    expect(component.editName).toBe('Juan Pérez');
  });

  it('should save profile and show success toast', async () => {
    fixture.detectChanges();
    component.editName = 'New Name';
    await component.saveProfile();
    expect(queryMock.update).toHaveBeenCalledWith({ full_name: 'New Name' });
    expect(queryMock.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(toastMock.success).toHaveBeenCalledWith('Perfil actualizado');
    expect(component.user?.profile.full_name).toBe('New Name');
    expect(component.editing).toBe(false);
  });

  it('should warn when avatar file exceeds 5MB', async () => {
    const file = new File(['x'], 'large.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 5242881 });
    await component.onAvatarSelected({ target: { files: [file] } } as unknown as Event);
    expect(toastMock.warning).toHaveBeenCalledWith('La imagen no puede superar los 5MB');
    expect(supabaseMock.uploadAvatar).not.toHaveBeenCalled();
  });

  it('should warn when avatar file type is unsupported', async () => {
    const file = new File(['x'], 'bad.txt', { type: 'text/plain' });
    await component.onAvatarSelected({ target: { files: [file] } } as unknown as Event);
    expect(toastMock.warning).toHaveBeenCalledWith('Formato no soportado. Usa PNG, JPG, GIF o WebP');
    expect(supabaseMock.uploadAvatar).not.toHaveBeenCalled();
  });

  it('should upload a valid avatar and update the user', async () => {
    vi.stubGlobal(
      'FileReader',
      class MockFileReader {
        onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
        onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
        result: string | ArrayBuffer | null = null;
        readAsDataURL(_file: Blob): void {
          void _file;
          setTimeout(() => {
            this.result = 'data:image/png;base64,abc123';
            if (this.onload) this.onload({} as ProgressEvent<FileReader>);
          }, 0);
        }
      } as unknown as typeof FileReader,
    );

    const file = new File(['x'], 'avatar.png', { type: 'image/png' });
    await component.onAvatarSelected({ target: { files: [file] } } as unknown as Event);
    expect(supabaseMock.uploadAvatar).toHaveBeenCalledWith('user-1', 'data:image/png;base64,abc123');
    expect(toastMock.success).toHaveBeenCalledWith('Foto actualizada');
    expect(component.user?.profile.avatar_url).toBe('https://example.com/avatar.png');
  });

  it('should call auth.signOut on logout', () => {
    component.onLogout();
    expect(authMock.signOut).toHaveBeenCalled();
  });

  it('should build initials avatar when no avatar_url is set', () => {
    fixture.detectChanges();
    const url = component.avatarUrl;
    expect(url).toContain('data:image/svg+xml;utf8,');
    expect(url).toContain('JP');
  });
});
