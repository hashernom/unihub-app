import { Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton } from '@ionic/angular/standalone';
@Component({
  selector: 'app-admin-users',
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton],
  templateUrl: './admin-users.page.html',
  styleUrl: './admin-users.page.scss',
})
export class AdminUsersPage {}
