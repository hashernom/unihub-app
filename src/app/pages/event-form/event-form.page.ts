import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonItem, IonLabel,
  IonInput, IonTextarea, IonSelect, IonSelectOption,
  IonButton, IonDatetime, IonToast, IonNote,
  IonList, IonListHeader, IonIcon, IonToggle,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircle, checkmarkCircle, mail } from 'ionicons/icons';
import { EventService, type CalendarEvent, type Classroom } from '../../core/services/event.service';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-event-form',
  imports: [
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton, IonItem, IonLabel,
    IonInput, IonTextarea, IonSelect, IonSelectOption,
    IonButton, IonDatetime, IonToast, IonNote,
    IonList, IonListHeader, IonIcon, IonToggle,
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

  isEdit = false;
  eventId: string | null = null;
  title = '';
  description = '';
  eventType: string = 'class';
  classroomId: string | null = null;
  startDate = '';
  endDate = '';
  startTime = '';
  endTime = '';
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
        this.startDate = start.toISOString();
        this.endDate = end.toISOString();
        this.startTime = start.toTimeString().slice(0, 5);
        this.endTime = end.toTimeString().slice(0, 5);
        this.recurringRule = event.recurring_rule;
        this.professorId = event.professor_id;
      }
    } catch {
      this.toast('Error al cargar el evento');
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
        this.toast('Evento creado');

        if (this.sendEmailNotification) {
          this.eventId = newEventId;
          this.sendInvitations().catch(() => {});
        }
      }
      setTimeout(() => this.router.navigate(['/admin/events']), 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el evento';
      this.toast(msg);
    }
    this.saving = false;
  }

  private combineDateTime(date: string, time: string): string {
    const d = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    d.setHours(hours, minutes, 0, 0);
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
