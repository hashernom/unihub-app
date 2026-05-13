import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { OfflineManagerService } from './offline-manager.service';

export interface Notice {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface NoticeFilters {
  priority?: 'low' | 'medium' | 'high';
  search?: string;
}

const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

@Injectable({ providedIn: 'root' })
export class NoticeService {
  private readonly supabase = inject(SupabaseService);
  private readonly offline = inject(OfflineManagerService);

  async getNotices(filters?: NoticeFilters): Promise<{ data: Notice[]; count: number }> {
    return this.offline.fetchWithCache<Notice>(
      'notices',
      async () => {
        const { data, error } = await this.supabase.client
          .from('notices')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data ?? [];
      },
      (item) => item.id,
    ).then(({ data }) => {
      let filtered = data.filter((n) => n.is_active === true);

      if (filters?.priority) {
        filtered = filtered.filter((n) => n.priority === filters.priority);
      }

      if (filters?.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(
          (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
        );
      }

      filtered.sort((a, b) => {
        const pa = priorityOrder[a.priority] ?? 99;
        const pb = priorityOrder[b.priority] ?? 99;
        if (pa !== pb) return pa - pb;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      return { data: filtered, count: filtered.length };
    });
  }

  async getAllNotices(): Promise<Notice[]> {
    const { data, error } = await this.supabase.client
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async createNotice(data: {
    title: string;
    content: string;
    priority: string;
    is_active: boolean;
    created_by: string;
  }): Promise<void> {
    const { error } = await this.supabase.client
      .from('notices')
      .insert(data);
    if (error) throw error;
  }

  async updateNotice(id: string, data: Partial<Notice>): Promise<void> {
    const { error } = await this.supabase.client
      .from('notices')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  }

  async deleteNotice(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('notices')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await this.updateNotice(id, { is_active: isActive } as Partial<Notice>);
  }

  async getNoticesPaginated(
    page: number,
    pageSize: number,
    filters?: NoticeFilters,
  ): Promise<{ data: Notice[]; count: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase.client
      .from('notices')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  }
}
