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
  styleUrl: './notice-card.component.scss',
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
