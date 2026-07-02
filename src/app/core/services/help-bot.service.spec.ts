import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { HelpBotService, type CachedFaq, type FaqMatch } from './help-bot.service';
import { SupabaseService } from './supabase.service';
import { StorageService } from '../storage/storage.service';
import { createSupabaseServiceMock, createStorageServiceMock } from '../../../testing/mock-factories';

describe('HelpBotService', () => {
  let service: HelpBotService;
  let supabaseMock: ReturnType<typeof createSupabaseServiceMock>;
  let storageMock: ReturnType<typeof createStorageServiceMock>;
  let fetchMock: ReturnType<typeof vi.fn>;

  const cachedFaq: CachedFaq = {
    faq_id: 'faq-1',
    question: '¿Cómo me registro?',
    answer: 'Usa tu código estudiantil.',
    category: 'Cuenta',
    language: 'es',
    hit_count: 5,
    cached_at: '2026-01-01T00:00:00Z',
  };

  const networkFaq: FaqMatch = {
    faq_id: 'faq-2',
    question: '¿Cómo recupero mi contraseña?',
    answer: 'Usa el enlace de recuperación.',
    category: 'Cuenta',
    language: 'es',
    relevance_score: 0.95,
  };

  beforeEach(() => {
    supabaseMock = createSupabaseServiceMock({
      session: { access_token: 'test-token', user: { id: 'user-123', email: 'test@test.com' } } as unknown as NonNullable<Parameters<typeof createSupabaseServiceMock>[0]>['session'],
    });
    storageMock = createStorageServiceMock();
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    TestBed.configureTestingModule({
      providers: [
        HelpBotService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: StorageService, useValue: storageMock },
      ],
    });
    service = TestBed.inject(HelpBotService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('search', () => {
    it('should return empty results for empty query', async () => {
      const result = await service.search('   ');
      expect(result.results).toEqual([]);
      expect(result.is_resolved).toBe(false);
      expect(result.query).toBe('');
    });

    it('should return network results and update cache', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ query: 'registro', language: 'es', results: [networkFaq], is_resolved: true }),
      });

      const result = await service.search('registro');

      expect(result.is_resolved).toBe(true);
      expect(result.results[0].faq_id).toBe('faq-2');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/help-bot-search'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('registro'),
        }),
      );

      const cache = await storageMock.get<CachedFaq[]>('help_bot_faq_cache');
      expect(cache?.length).toBe(1);
      expect(cache?.[0].faq_id).toBe('faq-2');
    });

    it('should handle network success with no results', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ query: 'xyz', language: 'es', results: [], is_resolved: false }),
      });

      const result = await service.search('xyz');

      expect(result.results).toEqual([]);
      expect(result.is_resolved).toBe(false);
      const cache = await storageMock.get<CachedFaq[]>('help_bot_faq_cache');
      expect(cache?.length ?? 0).toBe(0);
    });

    it('should fallback to cache when network returns non-ok response', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'service unavailable' }),
      });
      await storageMock.set('help_bot_faq_cache', [{ ...cachedFaq }]);

      const result = await service.search('registro');

      expect(result.is_resolved).toBe(true);
      expect(result.results[0].faq_id).toBe('faq-1');
    });

    it('should fallback to cache when fetch throws', async () => {
      fetchMock.mockRejectedValue(new Error('network error'));
      await storageMock.set('help_bot_faq_cache', [{ ...cachedFaq }]);

      const result = await service.search('registro');

      expect(result.is_resolved).toBe(true);
      expect(result.results[0].question).toBe('¿Cómo me registro?');
    });

    it('should return empty unresolved response when network and cache fail', async () => {
      fetchMock.mockRejectedValue(new Error('network error'));

      const result = await service.search('registro', 5, 'en');

      expect(result.is_resolved).toBe(false);
      expect(result.results).toEqual([]);
      expect(result.language).toBe('en');
    });

    it('should pass language and max_results to edge function', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ query: 'test', language: 'en', results: [], is_resolved: false }),
      });

      await service.search('test', 10, 'en');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.max_results).toBe(10);
      expect(body.language).toBe('en');
      expect(body.user_id).toBe('user-123');
    });
  });

  describe('requestSearch / liveResults$', () => {
    it('should emit debounced search results', async () => {
      vi.useFakeTimers();
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ query: 'registro', language: 'es', results: [networkFaq], is_resolved: true }),
      });

      const promise = firstValueFrom(service.liveResults$);
      service.requestSearch('registro');

      await vi.advanceTimersByTimeAsync(600);
      const result = await promise;

      expect((result as { is_resolved: boolean } | null)?.is_resolved).toBe(true);
    });

    it('should emit null from catchError when search throws synchronously', async () => {
      vi.useFakeTimers();
      vi.spyOn(service, 'search').mockImplementation(() => {
        throw new Error('sync error');
      });

      const promise = firstValueFrom(service.liveResults$);
      service.requestSearch('registro');

      await vi.advanceTimersByTimeAsync(600);
      const result = await promise;

      expect(result).toBeNull();
    });
  });

  describe('getPopularFaqs', () => {
    it('should return top faqs by hit_count', async () => {
      const faqs: CachedFaq[] = [
        { ...cachedFaq, faq_id: '1', hit_count: 10 },
        { ...cachedFaq, faq_id: '2', hit_count: 20 },
        { ...cachedFaq, faq_id: '3', hit_count: 5 },
      ];
      await storageMock.set('help_bot_faq_cache', faqs);

      const result = await service.getPopularFaqs(2);

      expect(result.length).toBe(2);
      expect(result[0].faq_id).toBe('2');
      expect(result[1].faq_id).toBe('1');
    });

    it('should return empty array when no cache', async () => {
      const result = await service.getPopularFaqs();
      expect(result).toEqual([]);
    });
  });

  describe('getCachedFaqs', () => {
    it('should return all cached faqs sorted by hit_count', async () => {
      const faqs: CachedFaq[] = [
        { ...cachedFaq, faq_id: '1', hit_count: 1 },
        { ...cachedFaq, faq_id: '2', hit_count: 5 },
      ];
      await storageMock.set('help_bot_faq_cache', faqs);

      const result = await service.getCachedFaqs();

      expect(result[0].faq_id).toBe('2');
      expect(result[1].faq_id).toBe('1');
    });
  });

  describe('cache behavior', () => {
    it('should increment hit count on cache hit', async () => {
      fetchMock.mockRejectedValue(new Error('network error'));
      await storageMock.set('help_bot_faq_cache', [{ ...cachedFaq }]);

      await service.search('registro');

      const cache = await storageMock.get<CachedFaq[]>('help_bot_faq_cache');
      expect(cache?.[0].hit_count).toBe(6);
    });

    it('should update existing cached faq on network result', async () => {
      const existing: CachedFaq = { ...cachedFaq, faq_id: networkFaq.faq_id, hit_count: 2 };
      await storageMock.set('help_bot_faq_cache', [existing]);
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ query: 'test', language: 'es', results: [networkFaq], is_resolved: true }),
      });

      await service.search('test');

      const cache = await storageMock.get<CachedFaq[]>('help_bot_faq_cache');
      expect(cache?.[0].hit_count).toBe(3);
    });

    it('should add new cached faq and keep top MAX_CACHED_FAQS', async () => {
      const existing: CachedFaq[] = Array.from({ length: 20 }, (_, i) => ({
        ...cachedFaq,
        faq_id: `faq-${i}`,
        hit_count: i + 1,
      }));
      await storageMock.set('help_bot_faq_cache', existing);
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ query: 'test', language: 'es', results: [networkFaq], is_resolved: true }),
      });

      await service.search('test');

      const cache = await storageMock.get<CachedFaq[]>('help_bot_faq_cache');
      expect(cache?.length).toBe(20);
      expect(cache?.some((f) => f.faq_id === networkFaq.faq_id)).toBe(true);
    });

    it('should not find cache answer when no match exists', async () => {
      fetchMock.mockRejectedValue(new Error('network error'));
      await storageMock.set('help_bot_faq_cache', [{ ...cachedFaq }]);

      const result = await service.search('xyznotfound');

      expect(result.is_resolved).toBe(false);
      expect(result.results).toEqual([]);
    });
  });
});
