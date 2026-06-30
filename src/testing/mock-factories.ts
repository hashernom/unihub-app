import { vi } from 'vitest';
import { type SupabaseClient } from '@supabase/supabase-js';
import { type DatabaseService } from '../app/core/storage/database.service';
import { type StorageService } from '../app/core/storage/storage.service';
import { type SupabaseService } from '../app/core/services/supabase.service';
import { type ToastService } from '../app/core/services/toast.service';
import { type Router } from '@angular/router';

/**
 * Creates a chainable Supabase query-builder mock.
 *
 * Non-terminal methods (select, eq, insert, update, delete, order, etc.)
 * return `this` so they can be chained. Terminal methods (`single`,
 * `maybeSingle`) return a Promise resolved with the configured value.
 *
 * The returned object is also `then`-able so that the common
 * `await supabase.from('x').select()` pattern works.
 */
export interface QueryBuilderMockOptions {
  single?: { data: unknown; error: Error | null };
  maybeSingle?: { data: unknown; error: Error | null };
  then?: { data: unknown; error: Error | null };
}

export function createQueryBuilderMock(
  overrides: QueryBuilderMockOptions = {},
): Record<string, ReturnType<typeof vi.fn>> & {
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
} {
  const self = {
    select: vi.fn(() => self),
    eq: vi.fn(() => self),
    neq: vi.fn(() => self),
    gt: vi.fn(() => self),
    gte: vi.fn(() => self),
    lt: vi.fn(() => self),
    lte: vi.fn(() => self),
    like: vi.fn(() => self),
    ilike: vi.fn(() => self),
    in: vi.fn(() => self),
    contains: vi.fn(() => self),
    order: vi.fn(() => self),
    range: vi.fn(() => self),
    limit: vi.fn(() => self),
    single: vi.fn(() =>
      Promise.resolve(overrides.single ?? { data: null, error: null }),
    ),
    maybeSingle: vi.fn(() =>
      Promise.resolve(overrides.maybeSingle ?? { data: null, error: null }),
    ),
    insert: vi.fn(() => self),
    update: vi.fn(() => self),
    delete: vi.fn(() => self),
    upsert: vi.fn(() => self),
    then: vi.fn((resolve: (value: unknown) => unknown) =>
      Promise.resolve(overrides.then ?? { data: null, error: null }).then(
        resolve,
      ),
    ),
  } as unknown as Record<string, ReturnType<typeof vi.fn>> & {
    single: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
  };

  return self;
}

export interface SupabaseServiceMockOptions {
  session?: { access_token: string } | null;
  user?: { id: string; email: string } | null;
  profile?: unknown;
  queryOverrides?: QueryBuilderMockOptions;
}

/**
 * Creates a full mock of `SupabaseService`.
 *
 * All Supabase client methods are stubbed with `vi.fn()` so individual
 * tests can override their return values.
 */
export function createSupabaseServiceMock(
  options: SupabaseServiceMockOptions = {},
): SupabaseService {
  const session = options.session ?? { access_token: 'fake-token' };
  const user = options.user ?? { id: 'user-1', email: 'test@test.com' };
  const defaultQueryMock = createQueryBuilderMock(options.queryOverrides);

  return {
    client: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session } }),
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
        signUp: vi.fn().mockResolvedValue({ data: { user }, error: null }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: { user }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
        updateUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
      from: vi.fn().mockReturnValue(defaultQueryMock),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/avatar.png' } }),
          remove: vi.fn().mockResolvedValue({ data: null, error: null }),
          list: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      },
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn().mockResolvedValue(undefined),
        topic: 'realtime:public:test',
      }),
      removeChannel: vi.fn().mockResolvedValue(undefined),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as unknown as SupabaseClient,
    signUp: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    signIn: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    resetPassword: vi.fn().mockResolvedValue({ error: null }),
    updatePassword: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    fetchProfile: vi.fn().mockResolvedValue(options.profile ?? null),
    createProfile: vi.fn().mockResolvedValue(undefined),
    upsertProfile: vi.fn().mockResolvedValue(undefined),
    promoteToAdmin: vi.fn().mockResolvedValue(undefined),
    uploadAvatar: vi.fn().mockResolvedValue('https://example.com/avatar.png'),
  } as unknown as SupabaseService;
}

/**
 * Creates a mock of `ToastService`.
 */
export function createToastServiceMock(): ToastService {
  return {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  } as unknown as ToastService;
}

/**
 * Creates a mock of `DatabaseService`.
 */
export function createDatabaseServiceMock(): DatabaseService {
  const cache = new Map<string, unknown>();
  const queue: unknown[] = [];

  return {
    getCachedRecords: vi.fn().mockResolvedValue([]),
    setCachedRecords: vi.fn().mockImplementation(async (_entityType, records) => {
      cache.set(_entityType as string, records);
    }),
    upsertCachedRecord: vi.fn().mockResolvedValue(undefined),
    removeCachedRecord: vi.fn().mockResolvedValue(undefined),
    getPendingOperations: vi.fn().mockImplementation(async () => [...queue]),
    enqueueOperation: vi.fn().mockImplementation(async (op) => {
      queue.push(op);
    }),
    dequeueOperation: vi.fn().mockImplementation(async (opId) => {
      const idx = queue.findIndex((o) => (o as { id: string }).id === opId);
      if (idx >= 0) queue.splice(idx, 1);
    }),
    clearQueue: vi.fn().mockResolvedValue(undefined),
  } as unknown as DatabaseService;
}

/**
 * Creates a mock of `StorageService`.
 */
export function createStorageServiceMock(): StorageService {
  const store = new Map<string, unknown>();
  return {
    init: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockImplementation(async (key) => store.get(key) ?? null),
    set: vi.fn().mockImplementation(async (key, value) => {
      store.set(key, value);
    }),
    remove: vi.fn().mockImplementation(async (key) => {
      store.delete(key);
    }),
    clear: vi.fn().mockResolvedValue(undefined),
    getAuthToken: vi.fn().mockResolvedValue(null),
    setAuthToken: vi.fn().mockResolvedValue(undefined),
    getLastSyncTimestamp: vi.fn().mockResolvedValue(null),
    setLastSyncTimestamp: vi.fn().mockResolvedValue(undefined),
  } as unknown as StorageService;
}

/**
 * Creates a mock of Angular `Router`.
 */
export function createRouterMock(): Router {
  return {
    navigate: vi.fn().mockResolvedValue(true),
    navigateByUrl: vi.fn().mockResolvedValue(true),
    parseUrl: vi.fn().mockReturnValue({} as ReturnType<Router['parseUrl']>),
    url: '/',
    events: {} as Router['events'],
  } as unknown as Router;
}
