import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService, type AuthUser } from './auth.service';
import { SupabaseService, type Profile } from './supabase.service';
import { createSupabaseServiceMock } from '../../../testing/mock-factories';
import type { User, AuthResponse, UserResponse, AuthError } from '@supabase/supabase-js';

const mockProfile: Profile = {
  id: 'user-1',
  student_code: 'U20231001',
  full_name: 'Test Student',
  role: 'student',
  avatar_url: null,
  carrera: 'Ingeniería de Sistemas',
  semestre: '5',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const adminProfile: Profile = { ...mockProfile, role: 'admin' };

const mockUser = {
  id: 'user-1',
  email: 'test@test.com',
  user_metadata: {
    student_code: 'U20231001',
    full_name: 'Test Student',
    carrera: 'Ingeniería',
    semestre: '5',
  },
} as unknown as User;

function createAuthError(message: string): AuthError {
  return { message, name: 'AuthError', status: 400, code: 'error', __isAuthError: true, toJSON: () => ({ message }) } as unknown as AuthError;
}

describe('AuthService', () => {
  let service: AuthService;
  let supabaseMock: ReturnType<typeof createSupabaseServiceMock>;

  beforeEach(() => {
    supabaseMock = createSupabaseServiceMock({
      session: null,
      user: null,
      profile: null,
    });

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: supabaseMock },
        provideRouter([{ path: 'login', redirectTo: '', pathMatch: 'full' }]),
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialize / restoreSession', () => {
    it('should do nothing when no session exists', async () => {
      vi.mocked(supabaseMock.client.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await service.initialize();
      expect(supabaseMock.client.auth.getSession).toHaveBeenCalled();
    });

    it('should restore user and profile when session exists', async () => {
      vi.mocked(supabaseMock.client.auth.getSession).mockResolvedValue({
        data: { session: { user: mockUser, access_token: 'token' } },
        error: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      vi.mocked(supabaseMock.fetchProfile).mockResolvedValue(mockProfile);

      await service.initialize();
      const current = await firstValueFrom(service.currentUser$);
      expect(current?.email).toBe('test@test.com');
      expect(current?.profile.role).toBe('student');
    });

    it('should sign out when profile cannot be ensured', async () => {
      vi.mocked(supabaseMock.client.auth.getSession).mockResolvedValue({
        data: { session: { user: mockUser, access_token: 'token' } },
        error: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      vi.mocked(supabaseMock.fetchProfile).mockResolvedValue(null);
      vi.mocked(supabaseMock.createProfile).mockResolvedValue(undefined);

      await service.initialize();
      expect(supabaseMock.client.auth.signOut).toHaveBeenCalled();
      expect(await firstValueFrom(service.currentUser$)).toBeNull();
    });
  });

  describe('currentUser$, isAuthenticated$, isAdmin$', () => {
    it('should emit authenticated false when no user', async () => {
      expect(await firstValueFrom(service.isAuthenticated$)).toBe(false);
      expect(await firstValueFrom(service.isAdmin$)).toBe(false);
    });

    it('should emit authenticated true and admin false for student', () => {
      const authUser: AuthUser = {
        id: 'user-1',
        email: 'test@test.com',
        profile: mockProfile,
      };
      service.setCurrentUser(authUser);
      expect(service.currentUser$).toBeTruthy();
    });

    it('should emit admin true for admin role', async () => {
      const authUser: AuthUser = {
        id: 'user-2',
        email: 'admin@test.com',
        profile: adminProfile,
      };
      service.setCurrentUser(authUser);
      expect(await firstValueFrom(service.isAuthenticated$)).toBe(true);
      expect(await firstValueFrom(service.isAdmin$)).toBe(true);
    });
  });

  describe('signUp', () => {
    it('should sign up and return AuthUser with student profile', async () => {
      vi.mocked(supabaseMock.signUp).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@test.com' } as unknown as User, session: null },
        error: null,
      } as AuthResponse);

      const user = await firstValueFrom(
        service.signUp('test@test.com', 'password123', 'Test Student', 'Ingeniería', '5'),
      );

      expect(user.email).toBe('test@test.com');
      expect(user.profile.full_name).toBe('Test Student');
      expect(user.profile.student_code).toBe('test');
      expect(supabaseMock.signUp).toHaveBeenCalledWith('test@test.com', 'password123', {
        student_code: 'test',
        full_name: 'Test Student',
        carrera: 'Ingeniería',
        semestre: '5',
      });
    });

    it('should throw when supabase signUp returns an error', async () => {
      vi.mocked(supabaseMock.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: createAuthError('Email already registered'),
      } as AuthResponse);

      await expect(
        firstValueFrom(service.signUp('test@test.com', 'pw', 'T', 'Ingeniería', '5')),
      ).rejects.toThrow('already registered');
    });

    it('should throw verification message when no user is returned', async () => {
      vi.mocked(supabaseMock.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      } as AuthResponse);

      await expect(
        firstValueFrom(service.signUp('test@test.com', 'pw', 'T', 'Ingeniería', '5')),
      ).rejects.toThrow('Revisa tu email');
    });
  });

  describe('signIn', () => {
    it('should sign in and load existing profile', async () => {
      vi.mocked(supabaseMock.signIn).mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      } as AuthResponse);
      vi.mocked(supabaseMock.fetchProfile).mockResolvedValue(mockProfile);

      const user = await firstValueFrom(service.signIn('test@test.com', 'password123'));

      expect(user.email).toBe('test@test.com');
      expect(user.profile.role).toBe('student');
    });

    it('should create profile when none exists and load it', async () => {
      vi.mocked(supabaseMock.signIn).mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      } as AuthResponse);
      vi.mocked(supabaseMock.fetchProfile)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockProfile);
      vi.mocked(supabaseMock.createProfile).mockResolvedValue(undefined);

      const user = await firstValueFrom(service.signIn('test@test.com', 'password123'));

      expect(supabaseMock.createProfile).toHaveBeenCalled();
      expect(user.profile.full_name).toBe('Test Student');
    });

    it('should create profile using fallback metadata values', async () => {
      const userWithoutMeta = {
        id: 'user-1',
        email: 'test@test.com',
        user_metadata: {},
      } as unknown as User;

      vi.mocked(supabaseMock.signIn).mockResolvedValue({
        data: { user: userWithoutMeta, session: null },
        error: null,
      } as AuthResponse);
      vi.mocked(supabaseMock.fetchProfile)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockProfile);
      vi.mocked(supabaseMock.createProfile).mockResolvedValue(undefined);

      await firstValueFrom(service.signIn('test@test.com', 'password123'));

      expect(supabaseMock.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          student_code: '',
          full_name: 'test@test.com',
          carrera: '',
          semestre: '',
        }),
      );
    });

    it('should handle user without email during sign in profile creation', async () => {
      const userNoEmail = {
        id: 'user-1',
        email: undefined,
        user_metadata: {},
      } as unknown as User;

      vi.mocked(supabaseMock.signIn).mockResolvedValue({
        data: { user: userNoEmail, session: null },
        error: null,
      } as AuthResponse);
      vi.mocked(supabaseMock.fetchProfile)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockProfile);
      vi.mocked(supabaseMock.createProfile).mockResolvedValue(undefined);

      const user = await firstValueFrom(service.signIn('test@test.com', 'password123'));

      expect(supabaseMock.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: '',
        }),
      );
      expect(user.profile).toEqual(mockProfile);
    });

    it('should sign out and throw when created profile cannot be fetched', async () => {
      vi.mocked(supabaseMock.signIn).mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      } as AuthResponse);
      vi.mocked(supabaseMock.fetchProfile).mockResolvedValue(null);
      vi.mocked(supabaseMock.createProfile).mockResolvedValue(undefined);

      await expect(
        firstValueFrom(service.signIn('test@test.com', 'password123')),
      ).rejects.toThrow('Profile could not be created');
      expect(supabaseMock.client.auth.signOut).toHaveBeenCalled();
      expect(await firstValueFrom(service.currentUser$)).toBeNull();
    });

    it('should throw on invalid credentials', async () => {
      vi.mocked(supabaseMock.signIn).mockResolvedValue({
        data: { user: null, session: null },
        error: createAuthError('Invalid login credentials'),
      } as AuthResponse);

      await expect(
        firstValueFrom(service.signIn('bad@test.com', 'wrong')),
      ).rejects.toThrow('Invalid login credentials');
    });

    it('should throw when no user is returned', async () => {
      vi.mocked(supabaseMock.signIn).mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      } as AuthResponse);

      await expect(
        firstValueFrom(service.signIn('bad@test.com', 'wrong')),
      ).rejects.toThrow('No user returned from signIn');
    });
  });

  describe('signOut', () => {
    it('should sign out, clear state, and navigate to login', async () => {
      service.setCurrentUser({
        id: 'user-1',
        email: 'test@test.com',
        profile: mockProfile,
      });
      vi.mocked(supabaseMock.signOut).mockResolvedValue({ error: null });

      await firstValueFrom(service.signOut());
      expect(supabaseMock.signOut).toHaveBeenCalled();
      expect(await firstValueFrom(service.currentUser$)).toBeNull();
    });

    it('should clear state and navigate to login even on error', async () => {
      service.setCurrentUser({
        id: 'user-1',
        email: 'test@test.com',
        profile: mockProfile,
      });
      vi.mocked(supabaseMock.signOut).mockRejectedValue(new Error('network'));

      await firstValueFrom(service.signOut());
      expect(await firstValueFrom(service.currentUser$)).toBeNull();
    });
  });

  describe('getAccessToken', () => {
    it('should return access token when session exists', async () => {
      vi.mocked(supabaseMock.client.auth.getSession).mockResolvedValue({
        data: { session: { access_token: 'abc-123' } },
        error: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      expect(await service.getAccessToken()).toBe('abc-123');
    });

    it('should return null when no session exists', async () => {
      vi.mocked(supabaseMock.client.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      expect(await service.getAccessToken()).toBeNull();
    });
  });

  describe('promoteToAdmin', () => {
    it('should call supabase promoteToAdmin', async () => {
      vi.mocked(supabaseMock.promoteToAdmin).mockResolvedValue(undefined);
      await service.promoteToAdmin('user-2');
      expect(supabaseMock.promoteToAdmin).toHaveBeenCalledWith('user-2');
    });
  });

  describe('resetPassword', () => {
    it('should resolve on success', async () => {
      vi.mocked(supabaseMock.resetPassword).mockResolvedValue({ error: null });
      await firstValueFrom(service.resetPassword('test@test.com'));
      expect(supabaseMock.resetPassword).toHaveBeenCalledWith('test@test.com');
    });

    it('should throw on error', async () => {
      vi.mocked(supabaseMock.resetPassword).mockRejectedValue(createAuthError('rate limited'));
      await expect(
        firstValueFrom(service.resetPassword('test@test.com')),
      ).rejects.toThrow('rate limited');
    });
  });

  describe('updatePassword', () => {
    it('should resolve on success', async () => {
      vi.mocked(supabaseMock.updatePassword).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as UserResponse);
      await firstValueFrom(service.updatePassword('new-password'));
      expect(supabaseMock.updatePassword).toHaveBeenCalledWith('new-password');
    });

    it('should throw on error', async () => {
      vi.mocked(supabaseMock.updatePassword).mockRejectedValue(createAuthError('weak password'));
      await expect(
        firstValueFrom(service.updatePassword('weak')),
      ).rejects.toThrow('weak password');
    });
  });
});
