import { Injectable, NgZone, inject, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export interface RealtimeChange<T = Record<string, unknown>> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  new: T;
  old: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private readonly supabase = inject(SupabaseService);
  private readonly zone = inject(NgZone);
  private readonly channels: ReturnType<SupabaseService['client']['channel']>[] = [];
  private readonly subjects = new Map<string, Subject<RealtimeChange>>();

  private readonly broadcastChannel = new BroadcastChannel('unihub-realtime');

  ngOnDestroy(): void {
    this.disconnectAll();
    this.broadcastChannel.close();
  }

  private getSubject(table: string): Subject<RealtimeChange> {
    if (!this.subjects.has(table)) {
      this.subjects.set(table, new Subject<RealtimeChange>());
    }
    return this.subjects.get(table)!;
  }

  onChanges<T = Record<string, unknown>>(table: string): Observable<RealtimeChange<T>> {
    return this.getSubject(table).asObservable() as Observable<RealtimeChange<T>>;
  }

  subscribe(table: string, filter?: string): void {
    const existing = this.channels.find((c) => c.topic === `realtime:${table}`);
    if (existing) return;

    const channel = this.supabase.client
      .channel(table)
      .on(
        'postgres_changes' as never,
        { event: '*', schema: 'public', table, filter },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          this.zone.run(() => {
            const change: RealtimeChange = {
              eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              table,
              new: payload.new as Record<string, unknown>,
              old: payload.old as Record<string, unknown>,
            };
            this.getSubject(table).next(change);
            this.broadcastChannel.postMessage({ table, change });
          });
        },
      )
      .subscribe();

    this.channels.push(channel);
  }

  unsubscribe(table: string): void {
    const idx = this.channels.findIndex((c) => c.topic === `realtime:${table}`);
    if (idx >= 0) {
      this.supabase.client.removeChannel(this.channels[idx]);
      this.channels.splice(idx, 1);
    }
    this.subjects.get(table)?.complete();
    this.subjects.delete(table);
  }

  disconnectAll(): void {
    for (const channel of this.channels) {
      this.supabase.client.removeChannel(channel);
    }
    this.channels.length = 0;
    for (const [, subject] of this.subjects) {
      subject.complete();
    }
    this.subjects.clear();
  }
}
