import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonButton, IonIcon, IonBadge,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonAlert, IonToggle, IonToast,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, trash, checkmarkCircle, closeCircle, barChart } from 'ionicons/icons';
import { SurveyService, type Survey } from '../../core/services/survey.service';

@Component({
  selector: 'app-admin-surveys',
  imports: [
    RouterLink, DatePipe,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton, IonButton, IonIcon, IonBadge,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonAlert, IonToggle, IonToast,
  ],
  templateUrl: './admin-surveys.page.html',
  styles: `
    .admin-card { margin: 8px 0; border-radius: 12px; }
    .admin-card.inactive { opacity: 0.6; }
    .card-meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
    .card-date { font-size: 0.8rem; color: var(--ion-color-medium); }
    .card-body { white-space: pre-line; color: var(--ion-color-step-600); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .card-actions { display: flex; justify-content: flex-end; gap: 4px; margin-top: 8px; align-items: center; }
    .toggle-label { font-size: 0.8rem; margin-right: 4px; }
    .loading-text { text-align: center; color: var(--ion-color-medium); padding: 32px; }
    .empty-state { text-align: center; padding: 24px; color: var(--ion-color-medium); display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .response-count { font-size: 0.8rem; color: var(--ion-color-medium); }
  `,
})
export class AdminSurveysPage implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly surveyService = inject(SurveyService);

  surveys: (Survey & { response_count: number })[] = [];
  loading = true;
  deleteTarget: Survey | null = null;
  showDeleteAlert = false;
  showToast = false;
  toastMessage = '';

  readonly deleteAlertButtons = [
    { text: 'Cancelar', role: 'cancel', handler: () => { this.deleteTarget = null; } },
    { text: 'Eliminar', role: 'destructive', handler: () => this.onDeleteConfirm() },
  ];

  ngOnInit(): void {
    addIcons({ add, create, trash, checkmarkCircle, closeCircle, barChart });
    this.loadSurveys();
  }

  async loadSurveys(): Promise<void> {
    this.loading = true;
    try {
      this.surveys = await this.surveyService.getAllWithResponseCounts();
    } catch {
      this.surveys = [];
    }
    this.loading = false;
    this.cdr.detectChanges();
  }

  async toggleActive(survey: Survey): Promise<void> {
    try {
      if (!survey.is_active) {
        const { questions } = (await this.surveyService.getSurveyWithQuestions(survey.id)) ?? {};
        if (!questions || questions.length === 0) {
          this.toast('No se puede activar: la encuesta no tiene preguntas.');
          return;
        }
      }
      await this.surveyService.updateSurvey(survey.id, { is_active: !survey.is_active } as Partial<Survey>);
      survey.is_active = !survey.is_active;
    } catch {
      this.toast('Error al cambiar estado.');
    }
  }

  private toast(msg: string): void {
    this.toastMessage = msg;
    this.showToast = true;
  }

  confirmDelete(survey: Survey): void {
    this.deleteTarget = survey;
    this.showDeleteAlert = true;
  }

  async onDeleteConfirm(): Promise<void> {
    if (!this.deleteTarget) return;
    try {
      await this.surveyService.deleteSurvey(this.deleteTarget.id);
      this.surveys = this.surveys.filter((s) => s.id !== this.deleteTarget!.id);
    } catch {
      // handle silently
    }
    this.deleteTarget = null;
  }

  isExpired(survey: Survey): boolean {
    if (!survey.end_date) return false;
    return new Date(survey.end_date) < new Date();
  }

  isUpcoming(survey: Survey): boolean {
    if (!survey.start_date) return false;
    return new Date(survey.start_date) > new Date();
  }

  surveyStatus(survey: Survey): string {
    if (!survey.is_active) return 'Inactiva';
    if (this.isExpired(survey)) return 'Finalizada';
    if (this.isUpcoming(survey)) return 'Programada';
    return 'Activa';
  }

  statusColor(survey: Survey): string {
    if (!survey.is_active) return 'medium';
    if (this.isExpired(survey)) return 'danger';
    if (this.isUpcoming(survey)) return 'tertiary';
    return 'success';
  }
}
