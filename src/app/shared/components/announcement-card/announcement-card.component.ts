import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonBadge, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { pin } from 'ionicons/icons';
import type { Announcement } from '../../../core/services/announcement.service';

@Component({
  selector: 'app-announcement-card',
  standalone: true,
  imports: [
    DatePipe,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonBadge, IonIcon,
  ],
  template: `
    <ion-card class="announcement-card">
      <ion-card-header>
        <ion-card-title>
          @if (announcement.is_pinned) {
            <ion-icon name="pin" class="pinned-icon"></ion-icon>
          }
          {{ announcement.title }}
        </ion-card-title>
        <div class="card-meta">
          <ion-badge [color]="badgeColor" class="category-badge">
            {{ categoryLabel }}
          </ion-badge>
          <span class="card-date">{{ announcement.created_at | date:'dd/MM/yyyy' }}</span>
        </div>
      </ion-card-header>
      <ion-card-content>
        <p class="card-body">{{ announcement.body }}</p>
      </ion-card-content>
    </ion-card>
  `,
  styles: `
    .announcement-card {
      margin: 8px 0;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .pinned-icon {
      color: var(--ion-color-warning);
      margin-right: 6px;
      vertical-align: middle;
    }
    .card-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
    }
    .category-badge {
      font-size: 0.75rem;
      padding: 4px 10px;
      border-radius: 20px;
    }
    .card-date {
      font-size: 0.8rem;
      color: var(--ion-color-medium);
    }
    .card-body {
      white-space: pre-line;
      line-height: 1.5;
      color: var(--ion-color-step-600, #666);
    }
  `,
})
export class AnnouncementCardComponent {
  @Input({ required: true }) announcement!: Announcement;

  constructor() {
    addIcons({ pin });
  }

  get categoryLabel(): string {
    const labels: Record<string, string> = {
      general: 'General',
      academic: 'Académico',
      event: 'Evento',
      urgent: 'Urgente',
    };
    return labels[this.announcement.category] ?? this.announcement.category;
  }

  get badgeColor(): string {
    const colors: Record<string, string> = {
      general: 'medium',
      academic: 'primary',
      event: 'tertiary',
      urgent: 'danger',
    };
    return colors[this.announcement.category] ?? 'medium';
  }
}
