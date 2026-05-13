import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { OfflineManagerService } from './offline-manager.service';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: 'general' | 'academic' | 'event' | 'urgent';
  is_pinned: boolean;
  created_by: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface AnnouncementFilters {
  category?: 'general' | 'academic' | 'event' | 'urgent';
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  private readonly supabase = inject(SupabaseService);
  private readonly offline = inject(OfflineManagerService);

  async getAnnouncements(filters?: AnnouncementFilters): Promise<{ data: Announcement[]; count: number }> {
    return this.offline.fetchWithCache<Announcement>(
      'announcements',
      async () => {
        let query = this.supabase.client
          .from('announcements')
          .select('*')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false });

        if (filters?.category) {
          query = query.eq('category', filters.category);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data ?? [];
      },
      (item) => item.id,
    ).then(({ data }) => {
      const now = new Date().toISOString();
      let filtered = data.filter(
        (a) => a.expires_at === null || a.expires_at > now,
      );

      if (filters?.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(
          (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q),
        );
      }

      return { data: filtered, count: filtered.length };
    });
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    const { data, error } = await this.supabase.client
      .from('announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async createAnnouncement(data: {
    title: string;
    body: string;
    category: string;
    is_pinned: boolean;
    expires_at: string | null;
    created_by: string;
  }): Promise<void> {
    const { error } = await this.supabase.client
      .from('announcements')
      .insert(data);
    if (error) throw error;
  }

  async updateAnnouncement(id: string, data: Partial<Announcement>): Promise<void> {
    const { error } = await this.supabase.client
      .from('announcements')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('announcements')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async togglePin(id: string, isPinned: boolean): Promise<void> {
    await this.updateAnnouncement(id, { is_pinned: isPinned } as Partial<Announcement>);
  }

  async getAnnouncementsPaginated(
    page: number,
    pageSize: number,
    filters?: AnnouncementFilters,
  ): Promise<{ data: Announcement[]; count: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase.client
      .from('announcements')
      .select('*', { count: 'exact' })
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  }
}
