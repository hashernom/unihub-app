import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
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
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { SkeletonListComponent } from '../../shared/components/skeleton-list/skeleton-list.component';

@Component({
  selector: 'app-admin-surveys',
  imports: [
    RouterLink, DatePipe,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton, IonButton, IonIcon, IonBadge,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonAlert, IonToggle, IonToast,
    EmptyStateComponent, ErrorStateComponent, SkeletonListComponent,
  ],
  templateUrl: './admin-surveys.page.html',
  styleUrl: './admin-surveys.page.scss',
})
export class AdminSurveysPage implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly surveyService = inject(SurveyService);
  readonly router = inject(Router);
  private readonly errorHandler = inject(ErrorHandlerService);

  surveys: (Survey & { response_count: number })[] = [];
  loading = true;
  error: unknown = null;
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
  }

  ionViewWillEnter(): void {
    this.loadSurveys();
  }

  async loadSurveys(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      this.surveys = await this.surveyService.getAllWithResponseCounts();
    } catch (err) {
      this.surveys = [];
      this.error = err;
      this.errorHandler.handleHttpError(err, () => this.loadSurveys());
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
