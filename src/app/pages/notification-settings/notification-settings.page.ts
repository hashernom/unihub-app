import { Component, OnInit, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonItem, IonLabel,
  IonToggle, IonList, IonListHeader, IonToast,
  IonNote, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notifications, calendar, checkbox, megaphone } from 'ionicons/icons';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../core/services/auth.service';

interface NotificationSettings {
  event_reminder_1h: boolean;
  event_reminder_15m: boolean;
  survey_reminders: boolean;
  announcement_notifications: boolean;
}

@Component({
  selector: 'app-notification-settings',
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton, IonItem, IonLabel,
    IonToggle, IonList, IonListHeader, IonToast,
    IonNote, IonIcon,
  ],
  templateUrl: './notification-settings.page.html',
  styleUrl: './notification-settings.page.scss',
})
export class NotificationSettingsPage implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  settings: NotificationSettings = {
    event_reminder_1h: true,
    event_reminder_15m: true,
    survey_reminders: true,
    announcement_notifications: true,
  };
  loading = true;
  saving = false;
  showToast = false;
  toastMessage = '';

  readonly settingsItems = [
    { key: 'event_reminder_1h' as const, label: 'Recordatorio 1 hora antes', description: 'Notificar 1 hora antes de un evento', icon: 'calendar' },
    { key: 'event_reminder_15m' as const, label: 'Recordatorio 15 minutos antes', description: 'Notificar 15 minutos antes de un evento', icon: 'time' },
    { key: 'survey_reminders' as const, label: 'Recordatorio de encuestas', description: 'Notificar cuando una encuesta está por vencer', icon: 'checkbox' },
    { key: 'announcement_notifications' as const, label: 'Nuevos anuncios', description: 'Notificar cuando haya un nuevo anuncio', icon: 'megaphone' },
  ];

  ngOnInit(): void {
    addIcons({ notifications, calendar, checkbox, megaphone });
    this.loadSettings();
  }

  private async loadSettings(): Promise<void> {
    this.loading = true;
    try {
      const user = await firstValueFrom(this.auth.currentUser$);
      if (!user) return;

      const { data, error } = await this.supabase.client
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        this.settings = {
          event_reminder_1h: data.event_reminder_1h ?? true,
          event_reminder_15m: data.event_reminder_15m ?? true,
          survey_reminders: data.survey_reminders ?? true,
          announcement_notifications: data.announcement_notifications ?? true,
        };
      }
    } catch {
      this.settings = {
        event_reminder_1h: true,
        event_reminder_15m: true,
        survey_reminders: true,
        announcement_notifications: true,
      };
    }
    this.loading = false;
  }

  async onToggleChange(key: keyof NotificationSettings): Promise<void> {
    this.saving = true;
    try {
      const user = await firstValueFrom(this.auth.currentUser$);
      if (!user) return;

      const { error } = await this.supabase.client
        .from('user_notification_settings')
        .upsert({
          user_id: user.id,
          ...this.settings,
        }, { onConflict: 'user_id' });

      if (error) throw error;
      this.toast('Preferencia actualizada');
    } catch {
      this.settings[key] = !this.settings[key];
      this.toast('Error al guardar preferencia');
    }
    this.saving = false;
  }

  private toast(msg: string): void {
    this.toastMessage = msg;
    this.showToast = true;
  }
}
