import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonItem, IonLabel,
  IonInput, IonTextarea, IonSelect, IonSelectOption,
  IonButton, IonToast, IonNote, IonSpinner,
  IonList, IonListHeader, IonIcon, IonToggle,
  IonSegment, IonSegmentButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircle, checkmarkCircle, mail } from 'ionicons/icons';
import { EventService, type CalendarEvent, type Classroom } from '../../core/services/event.service';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { environment } from '../../../environments/environment';
import { FormValidationService } from '../../core/services/form-validation.service';

@Component({
  selector: 'app-event-form',
  imports: [
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton, IonItem, IonLabel,
    IonInput, IonTextarea, IonSelect, IonSelectOption,
    IonButton, IonToast, IonNote, IonSpinner,
    IonList, IonListHeader, IonIcon, IonToggle,
    IonSegment, IonSegmentButton,
  ],
  templateUrl: './event-form.page.html',
  styleUrl: './event-form.page.scss',
})
export class EventFormPage implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly formValidation = inject(FormValidationService);

  isEdit = false;
  eventId: string | null = null;
  title = '';
  description = '';
  eventType = 'class';
  classroomId: string | null = null;
  startDate = '';
  endDate = '';
  startTime = '';
  endTime = '';
  startHour = 7;
  startMinute = 0;
  startPeriod: 'AM' | 'PM' = 'AM';
  endHour = 8;
  endMinute = 0;
  endPeriod: 'AM' | 'PM' = 'AM';
  recurringRule: string | null = null;
  saving = false;
  showToast = false;
  toastMessage = '';
  classrooms: Classroom[] = [];
  professors: { id: string; full_name: string }[] = [];
  professorId: string | null = null;
  conflictWarning = '';
  availabilityPreview: string[] = [];
  checkingAvailability = false;
  sendEmailNotification = false;
  submitSuccess = false;

  readonly eventTypes = [
    { value: 'class', label: 'Clase' },
    { value: 'exam', label: 'Examen' },
    { value: 'meeting', label: 'Reunión' },
    { value: 'workshop', label: 'Taller' },
    { value: 'other', label: 'Otro' },
  ];

  readonly recurrenceOptions = [
    { value: null, label: 'No repetir' },
    { value: 'FREQ=DAILY', label: 'Diario' },
    { value: 'FREQ=WEEKLY', label: 'Semanal' },
    { value: 'FREQ=WEEKLY;BYDAY=MO,WE,FR', label: 'Lun-Mi-Vie' },
    { value: 'FREQ=WEEKLY;BYDAY=TU,TH', label: 'Mar-Jue' },
    { value: 'FREQ=MONTHLY', label: 'Mensual' },
  ];

  readonly hours = Array.from({ length: 12 }, (_, i) => i + 1);
  readonly minutes = [0, 15, 30, 45];

  padMinute(m: number): string {
    return m.toString().padStart(2, '0');
  }

  onSegmentChange(which: 'start' | 'end', value: unknown): void {
    if (typeof value !== 'string' || (value !== 'AM' && value !== 'PM')) return;
    if (which === 'start') this.startPeriod = value;
    else this.endPeriod = value;
    this.syncTimeToStorage(which);
    this.checkAvailabilityInline();
  }

  ngOnInit(): void {
    addIcons({ alertCircle, checkmarkCircle, mail });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.eventId = id;
      this.loadEvent(id);
    }
    this.loadClassrooms();
    this.loadProfessors();
  }

  private async loadClassrooms(): Promise<void> {
    try {
      this.classrooms = await this.eventService.getClassrooms(true);
    } catch {
      this.classrooms = [];
    }
  }

  private async loadProfessors(): Promise<void> {
    try {
      this.professors = await this.eventService.getProfessors();
    } catch {
      this.professors = [];
    }
  }

  private async loadEvent(id: string): Promise<void> {
    try {
      const event = await this.eventService.getEventById(id);
      if (event) {
        this.title = event.title;
        this.description = event.description ?? '';
        this.eventType = event.event_type;
        this.classroomId = event.classroom_id;
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);
        this.startDate = start.toISOString().slice(0, 10);
        this.endDate = end.toISOString().slice(0, 10);
        this.startTime = start.toTimeString().slice(0, 5);
        this.endTime = end.toTimeString().slice(0, 5);
        this.syncTimeToDisplay('start');
        this.syncTimeToDisplay('end');
        this.recurringRule = event.recurring_rule;
        this.professorId = event.professor_id;
      }
    } catch {
      this.toast('Error al cargar el evento');
    }
  }

  private syncTimeToDisplay(which: 'start' | 'end'): void {
    const t = which === 'start' ? this.startTime : this.endTime;
    const [h24, m] = t.split(':').map(Number);
    const h12 = h24 % 12 || 12;
    if (which === 'start') {
      this.startHour = h12;
      this.startMinute = m;
      this.startPeriod = h24 < 12 ? 'AM' : 'PM';
    } else {
      this.endHour = h12;
      this.endMinute = m;
      this.endPeriod = h24 < 12 ? 'AM' : 'PM';
    }
  }

  syncTimeToStorage(which: 'start' | 'end'): void {
    const h = which === 'start' ? this.startHour : this.endHour;
    const m = which === 'start' ? this.startMinute : this.endMinute;
    const p = which === 'start' ? this.startPeriod : this.endPeriod;
    const h24 = p === 'AM' ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
    if (which === 'start') {
      this.startTime = `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    } else {
      this.endTime = `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  async save(): Promise<void> {
    if (!this.title.trim()) {
      this.toast('El título es obligatorio');
      return;
    }

    if (!this.startDate || !this.endDate) {
      this.toast('Selecciona fecha de inicio y fin');
      return;
    }

    this.syncTimeToStorage('start');
    this.syncTimeToStorage('end');
    const startDateTime = this.combineDateTime(this.startDate, this.startTime || '00:00');
    const endDateTime = this.combineDateTime(this.endDate, this.endTime || '23:59');

    if (new Date(endDateTime) <= new Date(startDateTime)) {
      this.toast('La fecha de fin debe ser posterior a la de inicio');
      return;
    }

    this.saving = true;
    this.conflictWarning = '';

    if (this.classroomId) {
      try {
        const conflict = await this.eventService.checkConflict(this.classroomId, startDateTime, endDateTime, this.eventId ?? undefined);
        if (conflict.hasConflict) {
          this.conflictWarning = conflict.message ?? 'Conflicto de horario detectado';
          this.toast('Conflicto de horario: ' + this.conflictWarning);
          this.saving = false;
          return;
        }
      } catch {
        // continue saving even if conflict check fails
      }
    }

    try {
      const user = await firstValueFrom(this.auth.currentUser$);
      const userId = user?.id ?? '';
      const color = this.eventService.getEventColor(this.eventType);

      if (this.isEdit && this.eventId) {
        await this.eventService.updateEvent(this.eventId, {
          title: this.title.trim(),
          description: this.description.trim() || null,
          event_type: this.eventType as CalendarEvent['event_type'],
          classroom_id: this.classroomId,
          start_time: startDateTime,
          end_time: endDateTime,
          recurring_rule: this.recurringRule,
          color,
        } as Partial<CalendarEvent>);
        this.submitSuccess = true;
        this.toast('Evento actualizado');
      } else {
        const newEventId = await this.eventService.createEvent({
          title: this.title.trim(),
          description: this.description.trim() || null,
          event_type: this.eventType,
          classroom_id: this.classroomId,
          professor_id: this.professorId,
          start_time: startDateTime,
          end_time: endDateTime,
          recurring_rule: this.recurringRule,
          color,
          created_by: userId,
        });
        this.submitSuccess = true;
        this.toast('Evento creado');

        if (this.sendEmailNotification) {
          this.eventId = newEventId;
          this.sendInvitations().catch(() => {
            this.toast('Evento creado pero no se pudieron enviar las invitaciones por email');
          });
        }
      }
      setTimeout(() => this.router.navigate(['/admin/events']), 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el evento';
      this.toast(msg);
    }
    this.saving = false;
  }

  private combineDateTime(date: string, time: string): string {
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return d.toISOString();
  }

  private async sendInvitations(): Promise<void> {
    if (!this.eventId) return;
    try {
      const session = await this.supabase.client.auth.getSession();
      const token = session.data.session?.access_token ?? '';

      await fetch(
        `${environment.supabaseUrl}/functions/v1/send-event-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ event_id: this.eventId }),
        },
      );
    } catch {
      console.warn('[EventForm] Failed to send invitations');
    }
  }

  async checkAvailabilityInline(): Promise<void> {
    this.availabilityPreview = [];
    if (!this.classroomId || !this.startDate) return;

    this.checkingAvailability = true;
    try {
      const startDateTime = this.combineDateTime(this.startDate, this.startTime || '00:00');
      const endDateTime = this.combineDateTime(this.endDate || this.startDate, this.endTime || '23:59');

      const session = await this.supabase.client.auth.getSession();
      const token = session.data.session?.access_token ?? '';

      const res = await fetch(
        `${environment.supabaseUrl}/functions/v1/check-classroom-availability`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            classroom_id: this.classroomId,
            start_time: startDateTime,
            end_time: endDateTime,
            exclude_event_id: this.eventId ?? undefined,
          }),
        },
      );

      if (!res.ok) {
        this.availabilityPreview = [];
        return;
      }

      const result = await res.json();
      if (result.available) {
        this.availabilityPreview = ['Aula disponible en este horario'];
      } else {
        const conflictMsg = result.conflicts?.[0]
          ? `Ocupado: "${result.conflicts[0].title}" (${new Date(result.conflicts[0].start_time).toLocaleTimeString()} - ${new Date(result.conflicts[0].end_time).toLocaleTimeString()})`
          : 'Aula ocupada en este horario';
        this.availabilityPreview = [conflictMsg];
      }
    } catch {
      this.availabilityPreview = [];
    }
    this.checkingAvailability = false;
  }

  private toast(msg: string): void {
    this.toastMessage = msg;
    this.showToast = true;
  }
}
