import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonCard, IonCardHeader, IonCardTitle, IonIcon,
  IonGrid, IonRow, IonCol, IonButtons, IonButton,
} from "@ionic/angular/standalone";

interface AdminCard { title: string; icon: string; route: string; color: string; }

@Component({
  selector: "app-admin-dashboard",
  imports: [
    RouterLink,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonCard, IonCardHeader, IonCardTitle, IonIcon,
    IonGrid, IonRow, IonCol, IonButtons, IonButton,
  ],
  templateUrl: "./admin-dashboard.page.html",
  styleUrl: "./admin-dashboard.page.scss",
})
export class AdminDashboardPage {
  private readonly auth = inject(AuthService);

  adminCards: AdminCard[] = [
    { title: "Anuncios", icon: "megaphone", route: "/admin/announcements", color: "primary" },
    { title: "Avisos", icon: "notifications", route: "/admin/notices", color: "secondary" },
    { title: "Encuestas", icon: "checkbox", route: "/admin/surveys", color: "tertiary" },
    { title: "Calendario", icon: "calendar", route: "/admin/events", color: "success" },
    { title: "FAQ", icon: "help-circle", route: "/admin/faq", color: "warning" },
    { title: "Usuarios", icon: "people", route: "/admin/users", color: "danger" },
  ];

  onLogout(): void { this.auth.signOut().subscribe(); }
}

