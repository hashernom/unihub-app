import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface HelpQuery {
  id: string;
  user_id: string | null;
  query_text: string;
  matched_faq_id: string | null;
  resolved: boolean;
  created_at: string;
}

export interface HelpQueryGroup {
  normalized_text: string;
  query_text: string;
  count: number;
  sample_ids: string[];
}

export interface WeeklyResolution {
  week: string;
  total: number;
  resolved: number;
  rate: number;
}

@Injectable({ providedIn: 'root' })
export class HelpQueryService {
  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(private readonly supabase: SupabaseService) {}

  async getUnresolvedQueries(): Promise<HelpQuery[]> {
    const { data, error } = await this.supabase.client
      .from('help_queries')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as HelpQuery[];
  }

  async getGroupedUnresolvedQueries(): Promise<HelpQueryGroup[]> {
    const queries = await this.getUnresolvedQueries();
    const groups = new Map<string, HelpQueryGroup>();

    for (const q of queries) {
      const normalized = this.normalize(q.query_text);
      const existing = groups.get(normalized);

      if (existing) {
        existing.count += 1;
        if (!existing.sample_ids.includes(q.id)) {
          existing.sample_ids.push(q.id);
        }
      } else {
        groups.set(normalized, {
          normalized_text: normalized,
          query_text: q.query_text,
          count: 1,
          sample_ids: [q.id],
        });
      }
    }

    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }

  async markResolved(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('help_queries')
      .update({ resolved: true })
      .eq('id', id);

    if (error) throw error;
  }

  async markAllInGroupResolved(normalizedText: string): Promise<void> {
    const queries = await this.getUnresolvedQueries();
    const ids = queries
      .filter((q) => this.normalize(q.query_text) === normalizedText)
      .map((q) => q.id);

    for (const id of ids) {
      await this.markResolved(id);
    }
  }

  async getWeeklyResolutionStats(weeks = 4): Promise<WeeklyResolution[]> {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    const { data, error } = await this.supabase.client
      .from('help_queries')
      .select('resolved, created_at')
      .gte('created_at', since.toISOString());

    if (error) throw error;

    const stats = new Map<string, { total: number; resolved: number }>();

    for (const row of (data ?? []) as { resolved: boolean; created_at: string }[]) {
      const week = this.getWeekLabel(row.created_at);
      const current = stats.get(week) ?? { total: 0, resolved: 0 };
      current.total += 1;
      if (row.resolved) current.resolved += 1;
      stats.set(week, current);
    }

    return Array.from(stats.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, counts]) => ({
        week,
        total: counts.total,
        resolved: counts.resolved,
        rate: counts.total > 0 ? Math.round((counts.resolved / counts.total) * 100) / 100 : 0,
      }));
  }

  async getTopUnresolvedQueries(limit = 10): Promise<HelpQueryGroup[]> {
    const groups = await this.getGroupedUnresolvedQueries();
    return groups.slice(0, limit);
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private getWeekLabel(isoDate: string): string {
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const weekNumber = Math.ceil(
      ((date.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7,
    );
    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
  }
}
