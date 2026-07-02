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
  styleUrl: './announcement-card.component.scss',
  templateUrl: './announcement-card.component.html',
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
