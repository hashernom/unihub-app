import { Component } from "@angular/core";
import { IonContent, IonHeader, IonTitle, IonToolbar, IonRefresher, IonRefresherContent } from "@ionic/angular/standalone";
@Component({
  selector: "app-tab-dashboard",
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonRefresher, IonRefresherContent],
  templateUrl: "./tab-dashboard.page.html",
  styleUrls: ["./tab-dashboard.page.scss"],
})
export class TabDashboardPage {}
