import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FaqService, type FaqEntry } from './faq.service';

function createChainBuilder(response: { data?: unknown; error?: Error }) {
  const builder = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(response),
    insert: vi.fn().mockResolvedValue(response),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (value: unknown) => unknown) => resolve(response)),
  };
  return builder;
}

describe('FaqService', () => {
  let service: FaqService;
  const faqs: FaqEntry[] = [
    {
      id: '1',
      question: '¿Cómo me registro?',
      answer: 'Usa tu código estudiantil.',
      category: 'Cuenta',
      sort_order: 0,
      is_active: true,
      language: 'es',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: '2',
      question: 'How do I reset my password?',
      answer: 'Use the forgot password link.',
      category: 'Cuenta',
      sort_order: 1,
      is_active: false,
      language: 'en',
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    },
  ];

  const mockSupabase = {
    client: createChainBuilder({ data: faqs, error: undefined }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FaqService(
      mockSupabase as unknown as InstanceType<typeof import('./supabase.service').SupabaseService>,
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return all FAQs ordered', async () => {
    const result = await service.getFaqs();
    expect(mockSupabase.client.from).toHaveBeenCalledWith('faq_entries');
    expect(result).toEqual(faqs);
  });

  it('should filter active FAQs', async () => {
    await service.getFaqs({ activeOnly: true });
    expect(mockSupabase.client.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('should filter by language', async () => {
    await service.getFaqs({ language: 'en' });
    expect(mockSupabase.client.eq).toHaveBeenCalledWith('language', 'en');
  });

  it('should client-side search question and answer', async () => {
    const result = await service.getFaqs({ search: 'password' });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('2');
  });

  it('should return FAQ by id', async () => {
    mockSupabase.client.single.mockResolvedValueOnce({ data: faqs[0], error: undefined });
    const result = await service.getFaqById('1');
    expect(result?.question).toBe('¿Cómo me registro?');
  });

  it('should return null when FAQ not found', async () => {
    mockSupabase.client.single.mockResolvedValueOnce({ data: null, error: new Error('not found') });
    const result = await service.getFaqById('99');
    expect(result).toBeNull();
  });

  it('should return unique categories', async () => {
    const result = await service.getCategories();
    expect(result).toEqual(['Cuenta']);
  });

  it('should create FAQ with defaults', async () => {
    await service.createFaq({
      question: '¿Pregunta?',
      answer: 'Respuesta.',
      category: 'General',
      language: 'es',
    });
    expect(mockSupabase.client.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        question: '¿Pregunta?',
        answer: 'Respuesta.',
        category: 'General',
        language: 'es',
        sort_order: 0,
        is_active: true,
      }),
    );
  });

  it('should update FAQ with trimmed values', async () => {
    await service.updateFaq('1', { question: ' New ', answer: 'Answer ', category: 'Gen' });
    expect(mockSupabase.client.update).toHaveBeenCalledWith({
      question: 'New',
      answer: 'Answer',
      category: 'Gen',
    });
  });

  it('should delete FAQ by id', async () => {
    await service.deleteFaq('1');
    expect(mockSupabase.client.delete).toHaveBeenCalled();
  });

  it('should toggle active state', async () => {
    await service.toggleActive('1', false);
    expect(mockSupabase.client.update).toHaveBeenCalledWith({ is_active: false });
  });

  it('should reorder category by updating sort_order', async () => {
    await service.reorderCategory('Gen', ['2', '1']);
    expect(mockSupabase.client.update).toHaveBeenCalledTimes(2);
    expect(mockSupabase.client.update).toHaveBeenNthCalledWith(1, { sort_order: 0 });
    expect(mockSupabase.client.update).toHaveBeenNthCalledWith(2, { sort_order: 1 });
  });
});
