import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonButton, IonIcon, IonBadge,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonAlert, IonToast, IonActionSheet,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, trash, closeCircle } from 'ionicons/icons';
import { EventService, type CalendarEvent } from '../../core/services/event.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { SkeletonListComponent } from '../../shared/components/skeleton-list/skeleton-list.component';

@Component({
  selector: 'app-admin-events',
  imports: [
    RouterLink, DatePipe,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton, IonButton, IonIcon, IonBadge,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonAlert, IonToast, IonActionSheet,
    EmptyStateComponent, ErrorStateComponent, SkeletonListComponent,
  ],
  templateUrl: './admin-events.page.html',
  styleUrl: './admin-events.page.scss',
})
export class AdminEventsPage implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly eventService = inject(EventService);
  readonly router = inject(Router);
  private readonly errorHandler = inject(ErrorHandlerService);

  events: CalendarEvent[] = [];
  loading = true;
  error: unknown = null;
  deleteTarget: CalendarEvent | null = null;
  showDeleteAlert = false;
  showCancelAlert = false;
  cancelTarget: CalendarEvent | null = null;
  showCancelInstanceAction = false;
  cancelInstanceTarget: CalendarEvent | null = null;
  showToast = false;
  toastMessage = '';

  readonly deleteAlertButtons = [
    { text: 'Cancelar', role: 'cancel', handler: () => { this.deleteTarget = null; } },
    { text: 'Eliminar', role: 'destructive', handler: () => this.onDeleteConfirm() },
  ];

  readonly cancelAlertButtons = [
    { text: 'No', role: 'cancel', handler: () => { this.cancelTarget = null; } },
    { text: 'Sí, cancelar todo', handler: () => this.onCancelConfirmAll() },
  ];

  readonly cancelInstanceActions = [
    { text: 'Solo esta instancia', handler: () => this.onCancelInstance() },
    { text: 'Toda la serie', handler: () => this.onCancelConfirmAll() },
    { text: 'Cancelar', role: 'cancel' },
  ];

  readonly editRecurringActions = [
    { text: 'Solo esta instancia', handler: () => this.onEditInstance() },
    { text: 'Toda la serie', handler: () => this.onEditAll() },
    { text: 'Cancelar', role: 'cancel' },
  ];

  selectedInstanceDate = '';

  ngOnInit(): void {
    addIcons({ add, create, trash, closeCircle });
  }

  ionViewWillEnter(): void {
    this.loadEvents();
  }

  async loadEvents(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      this.events = await this.eventService.getAllEvents();
    } catch (err) {
      this.events = [];
      this.error = err;
      this.errorHandler.handleHttpError(err, () => this.loadEvents());
    }
    this.loading = false;
    this.cdr.detectChanges();
  }

  confirmDelete(event: CalendarEvent): void {
    this.deleteTarget = event;
    this.showDeleteAlert = true;
  }

  async onDeleteConfirm(): Promise<void> {
    if (!this.deleteTarget) return;
    try {
      await this.eventService.deleteEvent(this.deleteTarget.id);
      this.events = this.events.filter((e) => e.id !== this.deleteTarget!.id);
      this.toast('Evento eliminado permanentemente');
    } catch {
      this.toast('Error al eliminar evento');
    }
    this.deleteTarget = null;
  }

  confirmCancel(event: CalendarEvent): void {
    this.cancelTarget = event;
    this.selectedInstanceDate = event.start_time.slice(0, 10);
    if (event.recurring_rule) {
      this.showCancelInstanceAction = true;
    } else {
      this.showCancelAlert = true;
    }
  }

  async onCancelConfirmAll(): Promise<void> {
    if (!this.cancelTarget) return;
    try {
      await this.eventService.cancelEvent(this.cancelTarget.id);
      this.cancelTarget.is_cancelled = true;
      this.toast('Evento cancelado');
    } catch {
      this.toast('Error al cancelar evento');
    }
    this.cancelTarget = null;
  }

  async onCancelInstance(): Promise<void> {
    if (!this.cancelTarget || !this.selectedInstanceDate) return;
    try {
      await this.eventService.cancelRecurringInstance(this.cancelTarget.id, this.selectedInstanceDate);
      this.toast('Instancia cancelada');
    } catch {
      this.toast('Error al cancelar instancia');
    }
    this.cancelTarget = null;
    this.selectedInstanceDate = '';
  }

  showEditAction = false;
  editTarget: CalendarEvent | null = null;
  editInstanceDate = '';

  editEventClick(event: CalendarEvent): void {
    if (event.recurring_rule) {
      this.editTarget = event;
      this.editInstanceDate = event.start_time.slice(0, 10);
      this.showEditAction = true;
    } else {
      this.router.navigate(['/admin/events/edit', event.id]);
    }
  }

  onEditAll(): void {
    if (this.editTarget) {
      this.router.navigate(['/admin/events/edit', this.editTarget.id]);
    }
    this.editTarget = null;
    this.showEditAction = false;
  }

  onEditInstance(): void {
    this.toast('Para editar una instancia individual, cancélala y crea un nuevo evento en esa fecha.');
    this.editTarget = null;
    this.showEditAction = false;
  }

  getEventTypeLabel(type: string): string {
    return this.eventService.getEventTypeLabel(type);
  }

  getEventColor(type: string): string {
    return this.eventService.getEventColor(type);
  }

  private toast(msg: string): void {
    this.toastMessage = msg;
    this.showToast = true;
  }

  isUpcoming(event: CalendarEvent): boolean {
    return new Date(event.start_time) > new Date();
  }

  isOngoing(event: CalendarEvent): boolean {
    const now = new Date();
    return new Date(event.start_time) <= now && new Date(event.end_time) >= now;
  }

  isPast(event: CalendarEvent): boolean {
    return new Date(event.end_time) < new Date();
  }

  eventStatus(event: CalendarEvent): { label: string; color: string } {
    if (event.is_cancelled) return { label: 'Cancelado', color: 'medium' };
    if (this.isOngoing(event)) return { label: 'En curso', color: 'success' };
    if (this.isUpcoming(event)) return { label: 'Próximo', color: 'tertiary' };
    return { label: 'Finalizado', color: 'dark' };
  }
}
