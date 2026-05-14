import { Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton } from '@ionic/angular/standalone';
@Component({
  selector: 'app-admin-events',
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton],
  templateUrl: './admin-events.page.html',
  styleUrl: './admin-events.page.scss',
})
export class AdminEventsPage {}
