import { Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton } from '@ionic/angular/standalone';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
@Component({
  selector: 'app-admin-users',
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, EmptyStateComponent],
  templateUrl: './admin-users.page.html',
  styleUrl: './admin-users.page.scss',
})
export class AdminUsersPage {}
