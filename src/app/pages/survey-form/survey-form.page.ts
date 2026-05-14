import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonItem, IonLabel,
  IonInput, IonTextarea, IonSelect, IonSelectOption,
  IonButton, IonToggle, IonDatetime, IonToast,
  IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonRadioGroup, IonRadio, IonCheckbox,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, remove, arrowUp, arrowDown, eye, eyeOff } from 'ionicons/icons';
import { SurveyService } from '../../core/services/survey.service';
import { AuthService } from '../../core/services/auth.service';

interface QuestionFormItem {
  tempId: string;
  question_text: string;
  question_type: 'text' | 'single_choice' | 'multiple_choice' | 'rating';
  options: string[];
  is_required: boolean;
}

@Component({
  selector: 'app-survey-form',
  imports: [
    FormsModule, DatePipe,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton, IonItem, IonLabel,
    IonInput, IonTextarea, IonSelect, IonSelectOption,
    IonButton, IonToggle, IonDatetime, IonToast,
    IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonRadioGroup, IonRadio, IonCheckbox,
  ],
  templateUrl: './survey-form.page.html',
  styles: [`
    .section-title { font-size: 1.1rem; font-weight: 600; margin: 16px 0 8px; color: var(--ion-color-primary); }
    .question-card { margin: 12px 0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .question-header { display: flex; align-items: center; gap: 8px; }
    .question-number { font-weight: 600; color: var(--ion-color-primary); min-width: 24px; }
    .drag-handle { cursor: move; color: var(--ion-color-medium); font-size: 1.2rem; }
    .question-actions { display: flex; justify-content: flex-end; gap: 4px; margin-top: 8px; }
    .option-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
    .option-row ion-input { flex: 1; }
    .add-option-btn { margin-top: 8px; }
    .form-actions { padding: 16px 0; display: flex; gap: 8px; }
    .preview-container { background: var(--ion-color-light); border-radius: 12px; padding: 16px; margin: 12px 0; }
    .preview-question { margin: 12px 0; }
    .preview-question h4 { font-size: 1rem; font-weight: 500; margin-bottom: 8px; }
    .preview-stars { font-size: 1.5rem; color: var(--ion-color-warning); display: flex; gap: 4px; }
    .form-header-actions { display: flex; gap: 4px; }
    .required-star { color: var(--ion-color-danger); margin-left: 2px; }
  `],
})
export class SurveyFormPage implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly surveyService = inject(SurveyService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  isEdit = false;
  surveyId: string | null = null;
  title = '';
  description = '';
  isActive = false;
  startDate: string | null = null;
  endDate: string | null = null;
  questions: QuestionFormItem[] = [];
  saving = false;
  showToast = false;
  toastMessage = '';
  previewMode = false;
  private nextTempId = 1;

  readonly questionTypes = [
    { value: 'text', label: 'Texto libre' },
    { value: 'single_choice', label: 'Opción única' },
    { value: 'multiple_choice', label: 'Opción múltiple' },
    { value: 'rating', label: 'Valoración (1-5)' },
  ] as const;

  ngOnInit(): void {
    addIcons({ add, remove, arrowUp, arrowDown, eye, eyeOff });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.surveyId = id;
      this.loadSurvey(id);
    } else {
      this.addQuestion();
    }
  }

  private async loadSurvey(id: string): Promise<void> {
    try {
      const result = await this.surveyService.getSurveyWithQuestions(id);
      if (result) {
        this.title = result.survey.title;
        this.description = result.survey.description ?? '';
        this.isActive = result.survey.is_active;
        this.startDate = result.survey.start_date;
        this.endDate = result.survey.end_date;
        this.questions = result.questions.map(q => ({
          tempId: 'q_' + (this.nextTempId++),
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options ?? [],
          is_required: q.is_required,
        }));
      }
    } catch {
      this.toast('Error al cargar la encuesta');
    }
    this.cdr.detectChanges();
  }

  addQuestion(): void {
    this.questions.push({
      tempId: 'q_' + (this.nextTempId++),
      question_text: '',
      question_type: 'text',
      options: [],
      is_required: true,
    });
  }

  removeQuestion(index: number): void {
    this.questions.splice(index, 1);
  }

  moveUp(index: number): void {
    if (index <= 0) return;
    [this.questions[index], this.questions[index - 1]] = [this.questions[index - 1], this.questions[index]];
  }

  moveDown(index: number): void {
    if (index >= this.questions.length - 1) return;
    [this.questions[index], this.questions[index + 1]] = [this.questions[index + 1], this.questions[index]];
  }

  addOption(question: QuestionFormItem): void {
    question.options.push('');
  }

  removeOption(question: QuestionFormItem, index: number): void {
    question.options.splice(index, 1);
  }

  trackQuestion(_index: number, q: QuestionFormItem): string {
    return q.tempId;
  }

  async save(): Promise<void> {
    if (!this.title.trim()) {
      this.toast('El título es obligatorio');
      return;
    }
    const validQuestions = this.questions.filter(q => q.question_text.trim());
    if (validQuestions.length === 0) {
      this.toast('Debes agregar al menos una pregunta');
      return;
    }
    for (const q of validQuestions) {
      if ((q.question_type === 'single_choice' || q.question_type === 'multiple_choice') && q.options.filter(o => o.trim()).length < 2) {
        this.toast(`La pregunta "${q.question_text || '(sin título)'}" debe tener al menos 2 opciones`);
        return;
      }
    }

    this.saving = true;
    try {
      const user = await firstValueFrom(this.auth.currentUser$);
      const userId = user?.id ?? '';

      await this.surveyService.saveSurveyWithQuestions({
        survey: {
          title: this.title.trim(),
          description: this.description.trim() || null,
          is_active: this.isActive,
          start_date: this.startDate,
          end_date: this.endDate,
          allow_multiple_responses: false,
          created_by: userId,
        },
        questions: validQuestions.map((q, i) => ({
          question_text: q.question_text.trim(),
          question_type: q.question_type,
          options: q.question_type === 'single_choice' || q.question_type === 'multiple_choice'
            ? q.options.filter(o => o.trim())
            : null,
          is_required: q.is_required,
          sort_order: i,
        })),
        editingId: this.surveyId ?? undefined,
      });
      this.toast(this.isEdit ? 'Encuesta actualizada' : 'Encuesta creada');
      setTimeout(() => this.router.navigate(['/admin/surveys']), 1000);
    } catch {
      this.toast('Error al guardar la encuesta');
    }
    this.saving = false;
  }

  private toast(msg: string): void {
    this.toastMessage = msg;
    this.showToast = true;
  }
}
