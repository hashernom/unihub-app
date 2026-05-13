import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonBadge, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircle } from 'ionicons/icons';
import type { Notice } from '../../../core/services/notice.service';

@Component({
  selector: 'app-notice-card',
  standalone: true,
  imports: [
    DatePipe,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonBadge, IonIcon,
  ],
  template: `
    <ion-card class="notice-card" [class.notice-high]="notice.priority === 'high'">
      <ion-card-header>
        <ion-card-title>
          @if (notice.priority === 'high') {
            <ion-icon name="alert-circle" class="alert-icon"></ion-icon>
          }
          {{ notice.title }}
        </ion-card-title>
        <div class="card-meta">
          <ion-badge [color]="badgeColor" class="priority-badge">
            {{ priorityLabel }}
          </ion-badge>
          <span class="card-date">{{ notice.created_at | date:'dd/MM/yyyy' }}</span>
        </div>
      </ion-card-header>
      <ion-card-content>
        <p class="card-content">{{ notice.content }}</p>
      </ion-card-content>
    </ion-card>
  `,
  styles: `
    .notice-card {
      margin: 8px 0;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .notice-high {
      border-left: 4px solid var(--ion-color-danger);
    }
    .alert-icon {
      color: var(--ion-color-danger);
      margin-right: 6px;
      vertical-align: middle;
    }
    .card-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
    }
    .priority-badge {
      font-size: 0.75rem;
      padding: 4px 10px;
      border-radius: 20px;
    }
    .card-date {
      font-size: 0.8rem;
      color: var(--ion-color-medium);
    }
    .card-content {
      white-space: pre-line;
      line-height: 1.5;
      color: var(--ion-color-step-600, #666);
    }
  `,
})
export class NoticeCardComponent {
  @Input({ required: true }) notice!: Notice;

  constructor() {
    addIcons({ alertCircle });
  }

  get priorityLabel(): string {
    const labels: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };
    return labels[this.notice.priority] ?? this.notice.priority;
  }

  get badgeColor(): string {
    const colors: Record<string, string> = { low: 'success', medium: 'warning', high: 'danger' };
    return colors[this.notice.priority] ?? 'medium';
  }
}
