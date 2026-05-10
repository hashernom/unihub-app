import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { SupabaseService, type Profile } from './supabase.service';
import type { AuthResponse } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockProfile: Profile = {
  id: 'user-1',
  student_code: 'U20231001',
  full_name: 'Test Student',
  role: 'student',
  avatar_url: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const adminProfile: Profile = { ...mockProfile, role: 'admin' };

function createSupabaseMock() {
  return {
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    fetchProfile: vi.fn(),
    createProfile: vi.fn(),
    get client() {
      return {
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        },
      };
    },
  } as unknown as SupabaseService;
}

describe('AuthService', () => {
  let service: AuthService;
  let supabaseMock: ReturnType<typeof createSupabaseMock>;

  beforeEach(() => {
    supabaseMock = createSupabaseMock();
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

  describe('signUp', () => {
    it('should sign up and create profile', async () => {
      vi.mocked(supabaseMock.signUp).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@test.com' } },
        error: null,
      } as AuthResponse);
      vi.mocked(supabaseMock.createProfile).mockResolvedValue(undefined);

      const user = await firstValueFrom(
        service.signUp('test@test.com', 'password123', 'U20231001', 'Test Student'),
      );

      expect(user.email).toBe('test@test.com');
      expect(user.profile.student_code).toBe('U20231001');
      expect(supabaseMock.createProfile).toHaveBeenCalled();
    });

    it('should throw if signUp fails', async () => {
      vi.mocked(supabaseMock.signUp).mockResolvedValue({
        data: { user: null },
        error: new Error('Email already registered'),
      } as AuthResponse);

      await expect(
        firstValueFrom(service.signUp('test@test.com', 'pw', 'U20231001', 'T')),
      ).rejects.toThrow('already registered');
    });
  });

  describe('signIn', () => {
    it('should sign in and load profile', async () => {
      vi.mocked(supabaseMock.signIn).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@test.com' } },
        error: null,
      } as AuthResponse);
      vi.mocked(supabaseMock.fetchProfile).mockResolvedValue(mockProfile);

      const user = await firstValueFrom(
        service.signIn('test@test.com', 'password123'),
      );

      expect(user.email).toBe('test@test.com');
      expect(user.profile.role).toBe('student');
    });

    it('should throw on invalid credentials', async () => {
      vi.mocked(supabaseMock.signIn).mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid login credentials'),
      } as AuthResponse);

      await expect(
        firstValueFrom(service.signIn('bad@test.com', 'wrong')),
      ).rejects.toThrow('Invalid login credentials');
    });
  });

  describe('signOut', () => {
    it('should sign out and clear state', async () => {
      vi.mocked(supabaseMock.signOut).mockResolvedValue({ error: null });

      await firstValueFrom(service.signOut());
      expect(supabaseMock.signOut).toHaveBeenCalled();
    });
  });

  describe('isAdmin$', () => {
    it('should emit false for student role', async () => {
      vi.mocked(supabaseMock.signIn).mockResolvedValue({
        data: { user: { id: 'user-1', email: 's@t.com' } },
        error: null,
      } as AuthResponse);
      vi.mocked(supabaseMock.fetchProfile).mockResolvedValue(mockProfile);

      await firstValueFrom(service.signIn('s@t.com', 'pw'));
      const isAdmin = await firstValueFrom(service.isAdmin$);
      expect(isAdmin).toBe(false);
    });

    it('should emit true for admin role', async () => {
      vi.mocked(supabaseMock.signIn).mockResolvedValue({
        data: { user: { id: 'user-2', email: 'a@t.com' } },
        error: null,
      } as AuthResponse);
      vi.mocked(supabaseMock.fetchProfile).mockResolvedValue(adminProfile);

      await firstValueFrom(service.signIn('a@t.com', 'pw'));
      const isAdmin = await firstValueFrom(service.isAdmin$);
      expect(isAdmin).toBe(true);
    });
  });
});
