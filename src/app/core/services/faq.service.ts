import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_active: boolean;
  language: 'es' | 'en';
  created_at: string;
  updated_at: string;
}

export interface FaqFilters {
  category?: string;
  language?: string;
  search?: string;
  activeOnly?: boolean;
}

@Injectable({ providedIn: 'root' })
export class FaqService {
  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(private readonly supabase: SupabaseService) {}

  async getFaqs(filters?: FaqFilters): Promise<FaqEntry[]> {
    let query = this.supabase.client
      .from('faq_entries')
      .select('*')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });

    if (filters?.activeOnly) {
      query = query.eq('is_active', true);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.language) {
      query = query.eq('language', filters.language);
    }

    const { data, error } = await query;
    if (error) throw error;

    let result = (data ?? []) as FaqEntry[];

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q),
      );
    }

    return result;
  }

  async getFaqById(id: string): Promise<FaqEntry | null> {
    const { data, error } = await this.supabase.client
      .from('faq_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as FaqEntry;
  }

  async getCategories(): Promise<string[]> {
    const { data, error } = await this.supabase.client
      .from('faq_entries')
      .select('category')
      .order('category', { ascending: true });

    if (error) throw error;

    const categories = new Set((data ?? []).map((r) => (r as FaqEntry).category));
    return Array.from(categories);
  }

  async getActiveCategories(): Promise<string[]> {
    const { data, error } = await this.supabase.client
      .from('faq_entries')
      .select('category')
      .eq('is_active', true)
      .order('category', { ascending: true });

    if (error) throw error;

    const categories = new Set((data ?? []).map((r) => (r as FaqEntry).category));
    return Array.from(categories);
  }

  async createFaq(data: {
    question: string;
    answer: string;
    category: string;
    language: 'es' | 'en';
    sort_order?: number;
    is_active?: boolean;
  }): Promise<void> {
    const { error } = await this.supabase.client.from('faq_entries').insert({
      question: data.question.trim(),
      answer: data.answer.trim(),
      category: data.category.trim(),
      language: data.language,
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
    });

    if (error) throw error;
  }

  async updateFaq(
    id: string,
    data: Partial<Omit<FaqEntry, 'id' | 'created_at' | 'updated_at'>>,
  ): Promise<void> {
    const updateData: Record<string, unknown> = {};

    if (data.question !== undefined) updateData['question'] = data.question.trim();
    if (data.answer !== undefined) updateData['answer'] = data.answer.trim();
    if (data.category !== undefined) updateData['category'] = data.category.trim();
    if (data.language !== undefined) updateData['language'] = data.language;
    if (data.sort_order !== undefined) updateData['sort_order'] = data.sort_order;
    if (data.is_active !== undefined) updateData['is_active'] = data.is_active;

    const { error } = await this.supabase.client
      .from('faq_entries')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteFaq(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('faq_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await this.updateFaq(id, { is_active: isActive });
  }

  async reorderCategory(category: string, orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.updateFaq(orderedIds[i], { sort_order: i });
    }
  }
}
