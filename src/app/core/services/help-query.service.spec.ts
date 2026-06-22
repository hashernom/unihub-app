import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HelpQueryService, type HelpQuery } from './help-query.service';

function createChainBuilder(response: { data?: unknown; error?: Error }) {
  const builder = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (value: unknown) => unknown) => resolve(response)),
  };
  return builder;
}

describe('HelpQueryService', () => {
  let service: HelpQueryService;
  const now = new Date();
  const iso = now.toISOString();

  const queries: HelpQuery[] = [
    {
      id: 'q1',
      user_id: 'u1',
      query_text: 'no puedo acceder',
      matched_faq_id: null,
      resolved: false,
      created_at: iso,
    },
    {
      id: 'q2',
      user_id: 'u2',
      query_text: 'No puedo acceder',
      matched_faq_id: null,
      resolved: false,
      created_at: iso,
    },
    {
      id: 'q3',
      user_id: 'u3',
      query_text: 'horario de clases',
      matched_faq_id: 'f1',
      resolved: false,
      created_at: iso,
    },
    {
      id: 'q4',
      user_id: 'u4',
      query_text: 'Horario de clases',
      matched_faq_id: null,
      resolved: true,
      created_at: iso,
    },
  ];

  const mockSupabase = {
    client: createChainBuilder({ data: queries, error: undefined }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new HelpQueryService(
      mockSupabase as unknown as InstanceType<typeof import('./supabase.service').SupabaseService>,
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return unresolved queries', async () => {
    const result = await service.getUnresolvedQueries();
    expect(mockSupabase.client.from).toHaveBeenCalledWith('help_queries');
    expect(mockSupabase.client.eq).toHaveBeenCalledWith('resolved', false);
    expect(result.length).toBe(4);
  });

  it('should group similar unresolved queries ignoring case and accents', async () => {
    const result = await service.getGroupedUnresolvedQueries();
    expect(result.length).toBe(2);
    const acceso = result.find((g) => g.normalized_text.includes('acceder'));
    expect(acceso?.count).toBe(2);
    expect(acceso?.sample_ids).toContain('q1');
    expect(acceso?.sample_ids).toContain('q2');
  });

  it('should mark a query resolved', async () => {
    await service.markResolved('q1');
    expect(mockSupabase.client.update).toHaveBeenCalledWith({ resolved: true });
    expect(mockSupabase.client.eq).toHaveBeenCalledWith('id', 'q1');
  });

  it('should mark all queries in a group resolved', async () => {
    await service.markAllInGroupResolved('no puedo acceder');
    expect(mockSupabase.client.update).toHaveBeenCalledTimes(2);
  });

  it('should return top unresolved queries limited', async () => {
    const result = await service.getTopUnresolvedQueries(1);
    expect(result.length).toBe(1);
  });

  it('should compute weekly resolution stats', async () => {
    const result = await service.getWeeklyResolutionStats(4);
    expect(result.length).toBeGreaterThan(0);
    const current = result[result.length - 1];
    expect(current.total).toBe(4);
    expect(current.resolved).toBe(1);
    expect(current.rate).toBe(0.25);
  });
});
