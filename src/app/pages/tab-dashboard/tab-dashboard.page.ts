import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon } from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import { personCircle } from "ionicons/icons";
@Component({
  selector: "app-tab-dashboard",
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, RouterLink],
  templateUrl: "./tab-dashboard.page.html",
  styleUrl: "./tab-dashboard.page.scss",
})
export class TabDashboardPage {
  constructor() { addIcons({ personCircle }); }
}
