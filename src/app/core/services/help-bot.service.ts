/* eslint-disable @angular-eslint/prefer-inject */
// Constructor injection is used here to keep the service testable without
// pulling in Angular's TestBed / platform-browser-dynamic testing packages,
// which are not installed in this project.
import { Injectable } from '@angular/core';
import { Subject, Observable, of } from 'rxjs';
import { debounceTime, switchMap, catchError } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { StorageService } from '../storage/storage.service';
import { environment } from '../../../environments/environment';

export interface FaqMatch {
  faq_id: string;
  question: string;
  answer: string;
  category: string;
  language: string;
  relevance_score: number;
}

export interface HelpSearchResponse {
  query: string;
  language: string;
  results: FaqMatch[];
  is_resolved: boolean;
  suggestions?: string[];
  fallback_language?: string;
}

export interface CachedFaq {
  faq_id: string;
  question: string;
  answer: string;
  category: string;
  language: string;
  hit_count: number;
  cached_at: string;
}

export interface HelpBotMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: string;
  results?: FaqMatch[];
  suggestions?: string[];
  isTyping?: boolean;
}

const CACHE_KEY = 'help_bot_faq_cache';
const MAX_CACHED_FAQS = 20;

@Injectable({ providedIn: 'root' })
export class HelpBotService {
  private readonly searchSubject = new Subject<string>();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly storage: StorageService,
  ) {}

  /** Emits search responses while the user is typing (debounced). */
  readonly liveResults$: Observable<HelpSearchResponse | null> = this.searchSubject.pipe(
    debounceTime(500),
    switchMap((query) => this.search(query).then((r) => r).catch(() => null)),
    catchError(() => of(null)),
  );

  /**
   * Searches FAQs via the help-bot-search Edge Function.
   * Falls back to local cache if the network request fails and a cached answer exists.
   */
  async search(query: string, maxResults = 5, language?: string): Promise<HelpSearchResponse> {
    const normalized = query.trim();
    if (!normalized) {
      return { query: '', language: language ?? 'es', results: [], is_resolved: false };
    }

    // 1. Try network
    try {
      const session = await this.supabase.client.auth.getSession();
      const token = session.data.session?.access_token ?? '';
      const user = session.data.session?.user;
      const userId = user?.id ?? '';

      const res = await fetch(`${environment.supabaseUrl}/functions/v1/help-bot-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: normalized,
          user_id: userId,
          max_results: maxResults,
          language,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Search failed');
      }

      const data = (await res.json()) as HelpSearchResponse;
      console.log('[HelpBotService] search response', data);

      // Update cache with returned results
      if (data.results.length > 0) {
        await this.upsertCachedFaqs(data.results);
      }

      return data;
    } catch (err) {
      console.warn('[HelpBotService] Network search failed, trying cache', err);

      // 2. Fallback to cache
      const cached = await this.findCachedAnswer(normalized);
      if (cached) {
        return {
          query: normalized,
          language: cached.language,
          results: [cached],
          is_resolved: true,
        };
      }

      return {
        query: normalized,
        language: language ?? 'es',
        results: [],
        is_resolved: false,
        suggestions: [],
      };
    }
  }

  /**
   * Triggers a debounced search while the user is typing.
   * The page can subscribe to liveResults$ to show suggestions.
   */
  requestSearch(query: string): void {
    this.searchSubject.next(query);
  }

  /** Returns the top N most frequently cached FAQs. */
  async getPopularFaqs(limit = 5): Promise<CachedFaq[]> {
    const cache = await this.getCache();
    return cache
      .sort((a, b) => b.hit_count - a.hit_count)
      .slice(0, limit);
  }

  /** Loads all cached FAQs sorted by popularity. */
  async getCachedFaqs(): Promise<CachedFaq[]> {
    const cache = await this.getCache();
    return cache.sort((a, b) => b.hit_count - a.hit_count);
  }

  /** Searches the local cache for a matching FAQ (trigram-style substring match). */
  private async findCachedAnswer(query: string): Promise<FaqMatch | null> {
    const q = query.toLowerCase();
    const cache = await this.getCache();

    const match = cache.find((f) =>
      f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q),
    );

    if (!match) return null;

    await this.incrementHitCount(match.faq_id);
    return {
      faq_id: match.faq_id,
      question: match.question,
      answer: match.answer,
      category: match.category,
      language: match.language,
      relevance_score: 1,
    };
  }

  private async getCache(): Promise<CachedFaq[]> {
    const raw = await this.storage.get<CachedFaq[]>(CACHE_KEY);
    return raw ?? [];
  }

  private async setCache(cache: CachedFaq[]): Promise<void> {
    await this.storage.set(CACHE_KEY, cache);
  }

  private async upsertCachedFaqs(results: FaqMatch[]): Promise<void> {
    const cache = await this.getCache();
    const now = new Date().toISOString();

    for (const r of results) {
      const existing = cache.find((c) => c.faq_id === r.faq_id);
      if (existing) {
        existing.hit_count += 1;
        existing.cached_at = now;
      } else {
        cache.push({
          faq_id: r.faq_id,
          question: r.question,
          answer: r.answer,
          category: r.category,
          language: r.language,
          hit_count: 1,
          cached_at: now,
        });
      }
    }

    // Keep only top MAX_CACHED_FAQS by hit count
    cache.sort((a, b) => b.hit_count - a.hit_count);
    await this.setCache(cache.slice(0, MAX_CACHED_FAQS));
  }

  private async incrementHitCount(faqId: string): Promise<void> {
    const cache = await this.getCache();
    const item = cache.find((c) => c.faq_id === faqId);
    if (item) {
      item.hit_count += 1;
      await this.setCache(cache);
    }
  }
}
