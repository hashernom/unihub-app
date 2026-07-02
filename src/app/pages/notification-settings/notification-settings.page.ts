import { Component, OnInit, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonItem, IonLabel,
  IonToggle, IonList, IonListHeader,
  IonNote, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notifications, calendar, checkbox, megaphone, time } from 'ionicons/icons';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { SkeletonListComponent } from '../../shared/components/skeleton-list/skeleton-list.component';

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
    IonToggle, IonList, IonListHeader,
    IonNote, IonIcon,
    EmptyStateComponent, ErrorStateComponent, SkeletonListComponent,
  ],
  templateUrl: './notification-settings.page.html',
  styleUrl: './notification-settings.page.scss',
})
export class NotificationSettingsPage implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly errorHandler = inject(ErrorHandlerService);

  settings: NotificationSettings = {
    event_reminder_1h: true,
    event_reminder_15m: true,
    survey_reminders: true,
    announcement_notifications: true,
  };
  loading = true;
  saving = false;
  error = false;
  noUser = false;

  readonly settingsItems = [
    { key: 'event_reminder_1h' as const, label: 'Recordatorio 1 hora antes', description: 'Notificar 1 hora antes de un evento', icon: 'calendar' },
    { key: 'event_reminder_15m' as const, label: 'Recordatorio 15 minutos antes', description: 'Notificar 15 minutos antes de un evento', icon: 'time' },
    { key: 'survey_reminders' as const, label: 'Recordatorio de encuestas', description: 'Notificar cuando una encuesta está por vencer', icon: 'checkbox' },
    { key: 'announcement_notifications' as const, label: 'Nuevos anuncios', description: 'Notificar cuando haya un nuevo anuncio', icon: 'megaphone' },
  ];

  ngOnInit(): void {
    addIcons({ notifications, calendar, checkbox, megaphone, time });
    this.loadSettings();
  }

  async loadSettings(): Promise<void> {
    this.loading = true;
    this.error = false;
    this.noUser = false;
    try {
      const user = await firstValueFrom(this.auth.currentUser$);
      if (!user) {
        this.noUser = true;
        return;
      }

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
    } catch (err) {
      this.error = true;
      this.errorHandler.handleHttpError(err, () => this.loadSettings());
    } finally {
      this.loading = false;
    }
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
      await this.toastService.success('Preferencia actualizada');
    } catch (err) {
      this.errorHandler.handleHttpError(err, () => this.onToggleChange(key));
      this.settings[key] = !this.settings[key];
    }
    this.saving = false;
  }
}
