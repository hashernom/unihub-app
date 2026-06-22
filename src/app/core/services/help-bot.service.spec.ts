import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HelpBotService, type CachedFaq } from './help-bot.service';

describe('HelpBotService', () => {
  let service: HelpBotService;

  const storageData = new Map<string, unknown>();

  const mockStorage = {
    get: vi.fn(async <T>(key: string) => (storageData.get(key) as T) ?? null),
    set: vi.fn(async (key: string, value: unknown) => storageData.set(key, value)),
    remove: vi.fn(async (key: string) => storageData.delete(key)),
  };

  const mockSupabase = {
    client: {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: 'test-token',
              user: { id: 'user-123' },
            },
          },
        }),
      },
    },
  };

  beforeEach(() => {
    storageData.clear();
    service = new HelpBotService(
      mockSupabase as unknown as InstanceType<typeof import('./supabase.service').SupabaseService>,
      mockStorage as unknown as InstanceType<typeof import('../storage/storage.service').StorageService>,
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return empty results for empty query', async () => {
    const result = await service.search('');
    expect(result.results).toEqual([]);
    expect(result.is_resolved).toBe(false);
  });

  it('should fallback to cached FAQ when network fails', async () => {
    const cached: CachedFaq[] = [
      {
        faq_id: 'faq-1',
        question: '¿Cómo me registro?',
        answer: 'Usa tu código estudiantil.',
        category: 'Cuenta',
        language: 'es',
        hit_count: 5,
        cached_at: new Date().toISOString(),
      },
    ];

    await mockStorage.set('help_bot_faq_cache', cached);

    const result = await service.search('registro');

    expect(result.is_resolved).toBe(true);
    expect(result.results.length).toBe(1);
    expect(result.results[0].question).toBe('¿Cómo me registro?');
  });

  it('should increment hit count on cache hit', async () => {
    const cached: CachedFaq[] = [
      {
        faq_id: 'faq-1',
        question: '¿Cómo me registro?',
        answer: 'Usa tu código estudiantil.',
        category: 'Cuenta',
        language: 'es',
        hit_count: 5,
        cached_at: new Date().toISOString(),
      },
    ];

    await mockStorage.set('help_bot_faq_cache', cached);
    await service.search('registro');

    const updated = (await mockStorage.get('help_bot_faq_cache')) as CachedFaq[] | null;
    expect(updated?.[0]?.hit_count).toBe(6);
  });
});
