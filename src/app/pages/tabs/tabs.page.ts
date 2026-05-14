import { Component, OnInit, inject, ChangeDetectorRef } from "@angular/core";
import { firstValueFrom } from "rxjs";
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonBadge,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import { home, checkbox, calendar, helpCircle } from "ionicons/icons";
import { AuthService } from "../../core/services/auth.service";
import { SurveyService } from "../../core/services/survey.service";

@Component({
  selector: "app-tabs",
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge],
  templateUrl: "./tabs.page.html",
  styleUrls: ["./tabs.page.scss"],
})
export class TabsPage implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly auth = inject(AuthService);
  private readonly surveyService = inject(SurveyService);

  pendingSurveyCount = 0;

  constructor() {
    addIcons({ home, checkbox, calendar, helpCircle });
  }

  ngOnInit(): void {
    this.loadPendingCount();
  }

  async loadPendingCount(): Promise<void> {
    try {
      const user = await firstValueFrom(this.auth.currentUser$);
      if (user) {
        this.pendingSurveyCount = await this.surveyService.getPendingSurveyCount(user.id);
      }
    } catch {
      this.pendingSurveyCount = 0;
    }
    this.cdr.detectChanges();
  }
}
