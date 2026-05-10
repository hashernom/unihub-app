import { Component } from "@angular/core";
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import { home, checkbox, calendar, helpCircle } from "ionicons/icons";

@Component({
  selector: "app-tabs",
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  templateUrl: "./tabs.page.html",
  styleUrls: ["./tabs.page.scss"],
})
export class TabsPage {
  constructor() {
    addIcons({ home, checkbox, calendar, helpCircle });
  }
}
