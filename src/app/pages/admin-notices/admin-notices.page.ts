import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonLabel, IonButton,
  IonIcon, IonBadge, IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonToggle, IonAlert,
  IonItem,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, trash } from 'ionicons/icons';
import { NoticeService, type Notice } from '../../core/services/notice.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { SkeletonListComponent } from '../../shared/components/skeleton-list/skeleton-list.component';

@Component({
  selector: 'app-admin-notices',
  imports: [
    RouterLink, DatePipe,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton, IonLabel, IonButton,
    IonIcon, IonBadge, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonToggle, IonAlert,
    IonItem,
    EmptyStateComponent, ErrorStateComponent, SkeletonListComponent,
  ],
  templateUrl: './admin-notices.page.html',
  styles: `
    .admin-card { margin: 8px 0; border-radius: 12px; }
    .card-meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
    .card-date { font-size: 0.8rem; color: var(--ion-color-medium); }
    .card-content { white-space: pre-line; color: var(--ion-color-step-600); }
    .card-actions { display: flex; justify-content: flex-end; gap: 4px; margin-top: 8px; }
    .inactive { opacity: 0.5; }
    .loading-text { text-align: center; color: var(--ion-color-medium); padding: 32px; }
    .empty-state { text-align: center; padding: 24px; color: var(--ion-color-medium); display: flex; flex-direction: column; align-items: center; gap: 12px; }
  `,
})
export class AdminNoticesPage implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly noticeService = inject(NoticeService);
  readonly router = inject(Router);
  private readonly errorHandler = inject(ErrorHandlerService);

  notices: Notice[] = [];
  loading = true;
  error: unknown = null;
  deleteTarget: Notice | null = null;
  showDeleteAlert = false;

  readonly deleteAlertButtons = [
    { text: 'Cancelar', role: 'cancel', handler: () => { this.deleteTarget = null; } },
    { text: 'Eliminar', role: 'destructive', handler: () => this.onDeleteConfirm() },
  ];

  ngOnInit(): void {
    addIcons({ add, create, trash });
  }

  ionViewWillEnter(): void {
    this.loadNotices();
  }

  async loadNotices(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      this.notices = await this.noticeService.getAllNotices();
    } catch (err) {
      this.notices = [];
      this.error = err;
      this.errorHandler.handleHttpError(err, () => this.loadNotices());
    }
    this.loading = false;
    this.cdr.detectChanges();
  }

  async toggleActive(notice: Notice): Promise<void> {
    try {
      await this.noticeService.toggleActive(notice.id, !notice.is_active);
      notice.is_active = !notice.is_active;
    } catch {
      // handle silently
    }
  }

  confirmDelete(notice: Notice): void {
    this.deleteTarget = notice;
    this.showDeleteAlert = true;
  }

  async onDeleteConfirm(): Promise<void> {
    if (!this.deleteTarget) return;
    try {
      await this.noticeService.deleteNotice(this.deleteTarget.id);
      this.notices = this.notices.filter((n) => n.id !== this.deleteTarget!.id);
    } catch {
      // handle silently
    }
    this.deleteTarget = null;
  }

  badgeColor(priority: string): string {
    const colors: Record<string, string> = { low: 'success', medium: 'warning', high: 'danger' };
    return colors[priority] ?? 'medium';
  }

  priorityLabel(priority: string): string {
    const labels: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };
    return labels[priority] ?? priority;
  }
}
