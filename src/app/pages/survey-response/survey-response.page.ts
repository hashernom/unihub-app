import { Component, OnInit, inject, ChangeDetectorRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent,
  IonSpinner, IonTextarea, IonRadioGroup, IonRadio,
  IonCheckbox, IonItem, IonIcon,
  IonButton, IonToast, IonText, IonList,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import { star, starOutline } from "ionicons/icons";
import { SurveyService, type Survey, type SurveyQuestion } from "../../core/services/survey.service";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-survey-response",
  imports: [
    FormsModule, DatePipe,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton, IonCard,
    IonCardHeader, IonCardTitle, IonCardContent,
    IonSpinner, IonTextarea, IonRadioGroup, IonRadio,
    IonCheckbox, IonItem, IonIcon,
    IonButton, IonToast, IonText, IonList,
  ],
  templateUrl: "./survey-response.page.html",
  styles: [`
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
    }
    .survey-info {
      padding: 0 4px 8px;
    }
    .end-date {
      font-size: 0.85rem;
      color: var(--ion-color-medium);
      margin-top: 4px;
    }
    .question-card {
      margin: 12px 0;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .required-star {
      color: var(--ion-color-danger);
      margin-left: 2px;
    }
    .error-text {
      font-size: 0.8rem;
      margin-bottom: 8px;
    }
    .stars {
      display: flex;
      gap: 8px;
      justify-content: center;
      font-size: 2rem;
      padding: 8px 0;
    }
    .stars ion-icon {
      cursor: pointer;
      color: var(--ion-color-warning);
      transition: transform 0.15s ease;
    }
    .stars ion-icon:hover {
      transform: scale(1.2);
    }
    .stars ion-icon.selected {
      color: var(--ion-color-warning-shade);
    }
    .expired-message {
      text-align: center;
      padding: 48px 16px;
      color: var(--ion-color-medium);
    }
    .expired-message h2 {
      font-size: 1.3rem;
      font-weight: 600;
      color: var(--ion-color-danger);
      margin-bottom: 8px;
    }
    .submit-container {
      padding: 16px 0 32px;
    }
    .checkbox-item {
      --border-style: none;
      --padding-start: 0;
    }
    .radio-item {
      --border-style: none;
      --padding-start: 0;
    }
  `],
})
export class SurveyResponsePage implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly surveyService = inject(SurveyService);
  private readonly auth = inject(AuthService);

  loading = true;
  submitting = false;
  survey: Survey | null = null;
  questions: SurveyQuestion[] = [];
  surveyExpired = false;

  answers: Record<string, string | string[] | number> = {};
  errors: Record<string, string> = {};
  showToast = false;
  toastMessage = "";
  toastColor = "success";
  submitSuccess = false;

  constructor() {
    addIcons({ star, starOutline });
  }

  ngOnInit(): void {
    const surveyId = this.route.snapshot.paramMap.get("id");
    if (surveyId) {
      this.loadSurvey(surveyId);
    }
  }

  private async loadSurvey(surveyId: string): Promise<void> {
    try {
      const result = await this.surveyService.getSurveyWithQuestions(surveyId);
      if (result) {
        this.survey = result.survey;
        this.surveyExpired = !result.survey.is_active || (
          result.survey.end_date !== null &&
          new Date(result.survey.end_date) < new Date()
        );
        this.questions = result.questions;
        if (!this.surveyExpired) {
          this.initAnswers();
        }
      }
    } catch {
      console.warn("[SurveyResponse] Failed to load survey");
    }
    this.loading = false;
    this.cdr.detectChanges();
  }

  private initAnswers(): void {
    for (const q of this.questions) {
      if (q.question_type === "multiple_choice") {
        this.answers[q.id] = [];
      } else if (q.question_type === "rating") {
        this.answers[q.id] = 0;
      } else {
        this.answers[q.id] = "";
      }
    }
  }

  toggleOption(questionId: string, option: string): void {
    const current = this.answers[questionId] as string[];
    const idx = current.indexOf(option);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(option);
    }
    this.clearError(questionId);
  }

  isSelected(questionId: string, option: string): boolean {
    return (this.answers[questionId] as string[])?.includes(option) ?? false;
  }

  setRating(questionId: string, value: number): void {
    this.answers[questionId] = value;
    this.clearError(questionId);
  }

  clearError(questionId: string): void {
    if (this.errors[questionId]) {
      delete this.errors[questionId];
    }
  }

  asNumber(val: string | string[] | number): number {
    return typeof val === "number" ? val : 0;
  }

  async submit(): Promise<void> {
    this.errors = {};
    let hasErrors = false;

    for (const q of this.questions) {
      const value = this.answers[q.id];
      const isEmpty =
        value === "" ||
        value === null ||
        value === undefined ||
        (Array.isArray(value) && value.length === 0) ||
        value === 0;

      if (q.is_required && isEmpty) {
        this.errors[q.id] = "Esta pregunta es obligatoria.";
        hasErrors = true;
      }
    }

    if (hasErrors) {
      this.cdr.detectChanges();
      return;
    }

    this.submitting = true;
    try {
      const user = await firstValueFrom(this.auth.currentUser$);
      if (!user) throw new Error("No authenticated user");

      await this.surveyService.submitResponse({
        surveyId: this.survey!.id,
        userId: user.id,
        answers: this.questions.map(q => ({
          questionId: q.id,
          answerText:
            q.question_type === "text" || q.question_type === "single_choice"
              ? (this.answers[q.id] as string) ?? null
              : null,
          answerOptions:
            q.question_type === "multiple_choice"
              ? (this.answers[q.id] as string[])
              : null,
          answerRating:
            q.question_type === "rating"
              ? (this.answers[q.id] as number)
              : null,
        })),
      });

      this.submitSuccess = true;
      this.toast("Encuesta enviada con éxito", "success");
      setTimeout(() => this.router.navigate(["/tabs/surveys"]), 1500);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "";
      if (msg.includes("uq_survey_user") || msg.includes("duplicate key")) {
        this.toast("Ya has respondido esta encuesta.", "danger");
      } else {
        this.toast("Error al enviar la encuesta. Intenta de nuevo.", "danger");
      }
    }
    this.submitting = false;
  }

  private toast(msg: string, color: string): void {
    this.toastMessage = msg;
    this.toastColor = color;
    this.showToast = true;
  }
}
