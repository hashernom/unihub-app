import { Component, OnInit, inject, ChangeDetectorRef } from "@angular/core";
import { Router } from "@angular/router";
import { DatePipe } from "@angular/common";
import { firstValueFrom } from "rxjs";
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonRefresher, IonRefresherContent,
  IonBadge,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList,
} from "@ionic/angular/standalone";
import { AuthService } from "../../core/services/auth.service";
import { SurveyService, type SurveyWithStatus } from "../../core/services/survey.service";
import { ErrorHandlerService } from "../../core/services/error-handler.service";
import { EmptyStateComponent } from "../../shared/components/empty-state/empty-state.component";
import { ErrorStateComponent } from "../../shared/components/error-state/error-state.component";
import { SkeletonListComponent } from "../../shared/components/skeleton-list/skeleton-list.component";

@Component({
  selector: "app-tab-surveys",
  imports: [
    DatePipe,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonListComponent,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonRefresher, IonRefresherContent,
    IonBadge,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList,
  ],
  templateUrl: "./tab-surveys.page.html",
  styleUrls: ["./tab-surveys.page.scss"],
})
export class TabSurveysPage implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly auth = inject(AuthService);
  private readonly surveyService = inject(SurveyService);
  private readonly router = inject(Router);
  private readonly errorHandler = inject(ErrorHandlerService);

  loading = true;
  error: unknown = null;
  surveys: SurveyWithStatus[] = [];

  ngOnInit(): void {
    this.loadSurveys();
  }

  ionViewWillEnter(): void {
    this.loadSurveys();
  }

  async loadSurveys(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const user = await firstValueFrom(this.auth.currentUser$);
      if (user) {
        this.surveys = await this.surveyService.getActiveSurveys(user.id);
      }
    } catch (err) {
      this.error = err;
      this.errorHandler.handleHttpError(err, () => this.loadSurveys());
    }
    this.loading = false;
    this.cdr.detectChanges();
  }

  async doRefresh(event: CustomEvent): Promise<void> {
    await this.loadSurveys();
    (event.target as HTMLIonRefresherElement).complete();
  }

  openSurvey(survey: SurveyWithStatus): void {
    if (!survey.responded) {
      this.router.navigate(["/tabs/surveys", survey.id]);
    }
  }
}
