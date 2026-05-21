import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { OfflineManagerService } from './offline-manager.service';
import { RRule, RRuleSet } from 'rrule';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: 'class' | 'exam' | 'meeting' | 'workshop' | 'other';
  classroom_id: string | null;
  classroom_name?: string | null;
  professor_id: string | null;
  professor_name?: string | null;
  start_time: string;
  end_time: string;
  recurring_rule: string | null;
  color: string;
  is_cancelled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface Classroom {
  id: string;
  name: string;
  building: string | null;
  capacity: number | null;
  resources: string[] | null;
  is_active: boolean;
  created_at: string;
}

export interface EventConflict {
  hasConflict: boolean;
  conflictingEvent?: CalendarEvent;
  message?: string;
}

export interface RecurringException {
  id: string;
  event_id: string;
  exception_date: string;
  is_cancelled: boolean;
  new_start_time: string | null;
  new_end_time: string | null;
  title: string | null;
  description: string | null;
}

const EVENT_COLORS: Record<string, string> = {
  class: '#3B82F6',
  exam: '#EF4444',
  meeting: '#22C55E',
  workshop: '#F97316',
  other: '#6B7280',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  class: 'Clase',
  exam: 'Examen',
  meeting: 'Reunión',
  workshop: 'Taller',
  other: 'Otro',
};

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly supabase = inject(SupabaseService);
  private readonly offline = inject(OfflineManagerService);

  getEventColor(eventType: string): string {
    return EVENT_COLORS[eventType] ?? EVENT_COLORS['other'];
  }

  getEventTypeLabel(eventType: string): string {
    return EVENT_TYPE_LABELS[eventType] ?? eventType;
  }

  private mapEvent(e: Record<string, unknown>, classroomName?: string | null): CalendarEvent {
    return {
      id: e['id'] as string,
      title: e['title'] as string,
      description: e['description'] as string | null,
      event_type: e['event_type'] as CalendarEvent['event_type'],
      classroom_id: e['classroom_id'] as string | null,
      classroom_name: classroomName ?? (e['classrooms'] ? (e['classrooms'] as Record<string, unknown>)['name'] as string : null),
      professor_id: e['professor_id'] as string | null,
      professor_name: e['profiles'] ? (e['profiles'] as Record<string, unknown>)['full_name'] as string : null,
      start_time: e['start_time'] as string,
      end_time: e['end_time'] as string,
      recurring_rule: e['recurring_rule'] as string | null,
      color: e['color'] as string,
      is_cancelled: e['is_cancelled'] as boolean,
      created_by: e['created_by'] as string | null,
      created_at: e['created_at'] as string,
      updated_at: e['updated_at'] as string,
    };
  }

  async getUpcomingEvents(): Promise<CalendarEvent[]> {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return this.offline.fetchWithCache<CalendarEvent>(
      'events',
      () => this.fetchAndExpandEvents(now.toISOString(), end.toISOString(), true),
      (item) => `${item.id}_${item.start_time}`,
    ).then(({ data }) => data);
  }

  async getEvents(start: string, end: string): Promise<CalendarEvent[]> {
    return this.fetchAndExpandEvents(start, end, false);
  }

  private async fetchAndExpandEvents(start: string, end: string, cacheOnly: boolean): Promise<CalendarEvent[]> {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const nonRecurringPromise = this.supabase.client
      .from('events')
      .select(`*, classrooms!inner(name)`)
      .eq('is_cancelled', false)
      .is('recurring_rule', null)
      .gte('start_time', start)
      .lte('start_time', end)
      .order('start_time', { ascending: true });

    const recurringPromise = this.supabase.client
      .from('events')
      .select(`*, classrooms(name)`)
      .eq('is_cancelled', false)
      .not('recurring_rule', 'is', null)
      .lte('start_time', end)
      .order('start_time', { ascending: true });

    const [{ data: nonRecurring, error: err1 }, { data: recurring, error: err2 }] = await Promise.all([
      nonRecurringPromise,
      recurringPromise,
    ]);

    if (err1) throw err1;
    if (err2) throw err2;

    const result: CalendarEvent[] = (nonRecurring ?? []).map((e: Record<string, unknown>) =>
      this.mapEvent(e),
    );

    const recurringEvents = (recurring ?? []) as Record<string, unknown>[];

    if (recurringEvents.length > 0) {
      const eventIds = recurringEvents.map((e) => e['id'] as string);
      const { data: exceptions } = await this.supabase.client
        .from('recurring_exceptions')
        .select('*')
        .in('event_id', eventIds)
        .eq('is_cancelled', true);

      const cancelledDates = new Map<string, Set<string>>();
      for (const ex of (exceptions ?? []) as RecurringException[]) {
        if (!cancelledDates.has(ex.event_id)) {
          cancelledDates.set(ex.event_id, new Set());
        }
        cancelledDates.get(ex.event_id)!.add(ex.exception_date);
      }

      for (const e of recurringEvents) {
        const ruleStr = e['recurring_rule'] as string;
        if (!ruleStr) continue;

        try {
          const dtstart = new Date(e['start_time'] as string);
          const duration = new Date(e['end_time'] as string).getTime() - dtstart.getTime();
          const eventId = e['id'] as string;
          const exDates = cancelledDates.get(eventId);

          const rrule = new RRule({
            ...RRule.parseString(ruleStr),
            dtstart,
          });

          const occurrences = rrule.between(startDate, endDate, true);

          for (const occDate of occurrences) {
            const dateKey = occDate.toISOString().slice(0, 10);
            if (exDates?.has(dateKey)) continue;

            const occEnd = new Date(occDate.getTime() + duration);
            result.push(this.mapEvent({
              ...e,
              start_time: occDate.toISOString(),
              end_time: occEnd.toISOString(),
            }, (e['classrooms'] as Record<string, unknown> | null)?.['name'] as string | null));
          }
        } catch {
          if (!cacheOnly) {
            result.push(this.mapEvent(e));
          }
        }
      }
    }

    result.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    return result;
  }

  async getExceptionsForEvent(eventId: string): Promise<RecurringException[]> {
    const { data, error } = await this.supabase.client
      .from('recurring_exceptions')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;
    return (data ?? []) as RecurringException[];
  }

  async cancelRecurringInstance(eventId: string, instanceDate: string): Promise<void> {
    const dateOnly = instanceDate.slice(0, 10);
    const { error } = await this.supabase.client
      .from('recurring_exceptions')
      .upsert({
        event_id: eventId,
        exception_date: dateOnly,
        is_cancelled: true,
      }, { onConflict: 'event_id,exception_date' });

    if (error) throw error;
  }

  async updateRecurringInstance(params: {
    eventId: string;
    instanceDate: string;
    title?: string;
    description?: string;
    newStartTime?: string;
    newEndTime?: string;
  }): Promise<void> {
    const dateOnly = params.instanceDate.slice(0, 10);
    const { error } = await this.supabase.client
      .from('recurring_exceptions')
      .upsert({
        event_id: params.eventId,
        exception_date: dateOnly,
        is_cancelled: false,
        title: params.title ?? null,
        description: params.description ?? null,
        new_start_time: params.newStartTime ?? null,
        new_end_time: params.newEndTime ?? null,
      }, { onConflict: 'event_id,exception_date' });

    if (error) throw error;
  }

  async getEventById(id: string): Promise<CalendarEvent | null> {
    const { data, error } = await this.supabase.client
      .from('events')
      .select(`
        *,
        classrooms(name),
        profiles!events_professor_id_fkey(full_name)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return this.mapEvent(data as Record<string, unknown>);
  }

  async checkConflict(classroomId: string, startTime: string, endTime: string, excludeEventId?: string): Promise<EventConflict> {
    let query = this.supabase.client
      .from('events')
      .select('*')
      .eq('classroom_id', classroomId)
      .eq('is_cancelled', false)
      .lt('start_time', endTime)
      .gt('end_time', startTime);

    if (excludeEventId) {
      query = query.neq('id', excludeEventId);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      return {
        hasConflict: true,
        conflictingEvent: data[0] as unknown as CalendarEvent,
        message: `Conflicto con "${data[0].title}" (${new Date(data[0].start_time).toLocaleTimeString()} - ${new Date(data[0].end_time).toLocaleTimeString()})`,
      };
    }

    return { hasConflict: false };
  }

  async createEvent(data: {
    title: string;
    description: string | null;
    event_type: string;
    classroom_id: string | null;
    professor_id: string | null;
    start_time: string;
    end_time: string;
    recurring_rule: string | null;
    color: string;
    created_by: string;
  }): Promise<string> {
    if (data.classroom_id) {
      const conflict = await this.checkConflict(data.classroom_id, data.start_time, data.end_time);
      if (conflict.hasConflict) {
        throw new Error(conflict.message);
      }
    }

    const { data: result, error } = await this.supabase.client
      .from('events')
      .insert(data)
      .select('id')
      .single();

    if (error) throw error;
    return result.id;
  }

  async updateEvent(id: string, data: Partial<CalendarEvent>): Promise<void> {
    const { error } = await this.supabase.client
      .from('events')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  }

  async cancelEvent(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('events')
      .update({ is_cancelled: true })
      .eq('id', id);
    if (error) throw error;
  }

  async deleteEvent(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('events')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async getAllEvents(): Promise<CalendarEvent[]> {
    const { data, error } = await this.supabase.client
      .from('events')
      .select(`*, classrooms(name)`)
      .order('start_time', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((e: Record<string, unknown>) => this.mapEvent(e));
  }

  async getClassroomAvailability(classroomId: string, weekStart: string, weekEnd: string): Promise<CalendarEvent[]> {
    const { data, error } = await this.supabase.client
      .from('events')
      .select('*')
      .eq('classroom_id', classroomId)
      .eq('is_cancelled', false)
      .gte('start_time', weekStart)
      .lte('start_time', weekEnd)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return (data ?? []) as unknown as CalendarEvent[];
  }

  async getBuildings(): Promise<string[]> {
    const { data, error } = await this.supabase.client
      .from('classrooms')
      .select('building')
      .not('building', 'is', null)
      .order('building', { ascending: true });

    if (error) throw error;
    const buildings = new Set((data ?? []).map((r: Record<string, unknown>) => r['building'] as string));
    return Array.from(buildings);
  }

  async getProfessors(): Promise<{ id: string; full_name: string }[]> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('id, full_name')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async getClassrooms(activeOnly?: boolean): Promise<Classroom[]> {
    let query = this.supabase.client
      .from('classrooms')
      .select('*')
      .order('name', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async createClassroom(data: {
    name: string;
    building: string | null;
    capacity: number | null;
  }): Promise<void> {
    const { error } = await this.supabase.client
      .from('classrooms')
      .insert(data);
    if (error) throw error;
  }

  async updateClassroom(id: string, data: Partial<Classroom>): Promise<void> {
    const { error } = await this.supabase.client
      .from('classrooms')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  }

  async deleteClassroom(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('classrooms')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
}
