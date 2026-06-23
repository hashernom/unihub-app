import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton,
  IonButton, IonIcon, IonBadge,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonAlert,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, pin, pinOutline, create, trash, closeCircle } from 'ionicons/icons';
import { AnnouncementService, type Announcement } from '../../core/services/announcement.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { SkeletonListComponent } from '../../shared/components/skeleton-list/skeleton-list.component';

@Component({
  selector: 'app-admin-announcements',
  imports: [
    RouterLink, DatePipe,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton,
    IonButton, IonIcon, IonBadge,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonAlert,
    EmptyStateComponent, ErrorStateComponent, SkeletonListComponent,
  ],
  templateUrl: './admin-announcements.page.html',
  styles: `
    .admin-card { margin: 8px 0; border-radius: 12px; }
    .admin-card.expired { opacity: 0.6; }
    .pinned-icon { color: var(--ion-color-warning); margin-right: 6px; vertical-align: middle; }
    .card-meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
    .card-date { font-size: 0.8rem; color: var(--ion-color-medium); }
    .card-body { white-space: pre-line; color: var(--ion-color-step-600); }
    .card-actions { display: flex; justify-content: flex-end; gap: 4px; margin-top: 8px; }
    .loading-text { text-align: center; color: var(--ion-color-medium); padding: 32px; }
    .empty-state { text-align: center; padding: 24px; color: var(--ion-color-medium); display: flex; flex-direction: column; align-items: center; gap: 12px; }
  `,
})
export class AdminAnnouncementsPage implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly announcementService = inject(AnnouncementService);
  private readonly errorHandler = inject(ErrorHandlerService);
  readonly router = inject(Router);

  announcements: Announcement[] = [];
  loading = true;
  error: unknown = null;
  deleteTarget: Announcement | null = null;
  showDeleteAlert = false;

  readonly deleteAlertButtons = [
    { text: 'Cancelar', role: 'cancel', handler: () => { this.deleteTarget = null; } },
    { text: 'Eliminar', role: 'destructive', handler: () => this.onDeleteConfirm() },
  ];

  ngOnInit(): void {
    addIcons({ add, pin, pinOutline, create, trash, closeCircle });
  }

  ionViewWillEnter(): void {
    this.loadAnnouncements();
  }

  async loadAnnouncements(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      this.announcements = await this.announcementService.getAllAnnouncements();
    } catch (err) {
      this.announcements = [];
      this.error = err;
      this.errorHandler.handleHttpError(err, () => this.loadAnnouncements());
    }
    this.loading = false;
    this.cdr.detectChanges();
  }

  async togglePin(announcement: Announcement): Promise<void> {
    try {
      await this.announcementService.togglePin(announcement.id, !announcement.is_pinned);
      announcement.is_pinned = !announcement.is_pinned;
    } catch {
      // handle silently
    }
  }

  confirmDelete(announcement: Announcement): void {
    this.deleteTarget = announcement;
    this.showDeleteAlert = true;
  }

  async onDeleteConfirm(): Promise<void> {
    if (!this.deleteTarget) return;
    try {
      await this.announcementService.deleteAnnouncement(this.deleteTarget.id);
      this.announcements = this.announcements.filter((a) => a.id !== this.deleteTarget!.id);
    } catch {
      // handle silently
    }
    this.deleteTarget = null;
  }

  isExpired(announcement: Announcement): boolean {
    if (!announcement.expires_at) return false;
    return new Date(announcement.expires_at) < new Date();
  }
}
