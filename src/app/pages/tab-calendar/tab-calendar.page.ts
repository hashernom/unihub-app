import { Component } from "@angular/core";
import { IonContent, IonHeader, IonTitle, IonToolbar } from "@ionic/angular/standalone";
@Component({
  selector: "app-tab-calendar",
  imports: [IonContent, IonHeader, IonTitle, IonToolbar],
  templateUrl: "./tab-calendar.page.html",
  styleUrls: ["./tab-calendar.page.scss"],
})
export class TabCalendarPage {}
