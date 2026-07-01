import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SupabaseService, SUPABASE_CLIENT, type Profile } from './supabase.service';

const mockProfile: Profile = {
  id: 'user-1',
  student_code: 'U20231001',
  full_name: 'Test Student',
  role: 'student',
  avatar_url: null,
  carrera: 'Ingeniería',
  semestre: '5',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const createMockClient = () => ({
  auth: {
    signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
  }),
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'user-1/avatar.png' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/avatar.png' } }),
    }),
  },
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
});

describe('SupabaseService', () => {
  let service: SupabaseService;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(async () => {
    mockClient = createMockClient();

    TestBed.configureTestingModule({
      providers: [
        SupabaseService,
        { provide: SUPABASE_CLIENT, useValue: mockClient },
      ],
    });
    service = TestBed.inject(SupabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose the client', () => {
    expect(service.client).toBe(mockClient);
  });

  describe('signUp', () => {
    it('should call auth.signUp with email, password and metadata', async () => {
      await service.signUp('test@test.com', 'password123', { full_name: 'Test' });
      expect(mockClient.auth.signUp).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
        options: { data: { full_name: 'Test' } },
      });
    });
  });

  describe('signIn', () => {
    it('should call auth.signInWithPassword', async () => {
      await service.signIn('test@test.com', 'password123');
      expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
      });
    });
  });

  describe('signOut', () => {
    it('should call auth.signOut', async () => {
      await service.signOut();
      expect(mockClient.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should call resetPasswordForEmail with redirectTo', async () => {
      await service.resetPassword('test@test.com');
      expect(mockClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@test.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/reset-password'),
        }),
      );
    });
  });

  describe('updatePassword', () => {
    it('should call auth.updateUser', async () => {
      await service.updatePassword('newpassword123');
      expect(mockClient.auth.updateUser).toHaveBeenCalledWith({ password: 'newpassword123' });
    });
  });

  describe('fetchProfile', () => {
    it('should return profile data', async () => {
      const profile = await service.fetchProfile('user-1');
      expect(profile).toEqual(mockProfile);
    });
  });

  describe('createProfile', () => {
    it('should insert profile', async () => {
      await service.createProfile(mockProfile);
      expect(mockClient.from).toHaveBeenCalledWith('profiles');
    });
  });

  describe('upsertProfile', () => {
    it('should upsert profile', async () => {
      await service.upsertProfile(mockProfile);
      const chain = mockClient.from('profiles');
      expect(chain.upsert).toHaveBeenCalledWith(
        mockProfile,
        expect.objectContaining({ onConflict: 'id' }),
      );
    });
  });

  describe('promoteToAdmin', () => {
    it('should call promote_to_admin rpc', async () => {
      await service.promoteToAdmin('user-1');
      expect(mockClient.rpc).toHaveBeenCalledWith('promote_to_admin', {
        target_user_id: 'user-1',
      });
    });

    it('should throw on rpc error', async () => {
      mockClient.rpc.mockResolvedValue({ data: null, error: new Error('Denied') });
      await expect(service.promoteToAdmin('user-1')).rejects.toThrow('Denied');
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar and return public url', async () => {
      const base64 = 'data:image/png;base64,iVBORw0KGgo=';
      const url = await service.uploadAvatar('user-1', base64);
      expect(mockClient.storage.from).toHaveBeenCalledWith('avatars');
      expect(url).toBe('https://example.com/avatar.png');
    });

    it('should throw FILE_TOO_LARGE when file > 5MB', async () => {
      const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(7_000_000);
      await expect(service.uploadAvatar('user-1', largeBase64)).rejects.toThrow(
        'FILE_TOO_LARGE',
      );
    });
  });
});
