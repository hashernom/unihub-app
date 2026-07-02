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
  templateUrl: './notice-card.component.html',
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
