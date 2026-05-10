import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
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
  private readonly supabase = inject(SupabaseService);
  userCount = 0;
  surveyCount = 0;
  eventCount = 0;

  adminCards: AdminCard[] = [
    { title: "Anuncios", icon: "megaphone", route: "/admin/announcements", color: "primary" },
    { title: "Avisos", icon: "notifications", route: "/admin/notices", color: "secondary" },
    { title: "Encuestas", icon: "checkbox", route: "/admin/surveys", color: "tertiary" },
    { title: "Calendario", icon: "calendar", route: "/admin/events", color: "success" },
    { title: "FAQ", icon: "help-circle", route: "/admin/faq", color: "warning" },
    { title: "Usuarios", icon: "people", route: "/admin/users", color: "danger" },
  ];

  onLogout(): void { this.auth.signOut().subscribe(); }

  constructor() {
    this.loadMetrics();
  }

  private async loadMetrics(): Promise<void> {
    try {
      const { count: uc } = await this.supabase.client.from("profiles").select("*", { count: "exact", head: true });
      this.userCount = uc ?? 0;
      const { count: sc } = await this.supabase.client.from("surveys").select("*", { count: "exact", head: true }).eq("is_active", true);
      this.surveyCount = sc ?? 0;
      const { count: ec } = await this.supabase.client.from("events").select("*", { count: "exact", head: true }).gte("start_time", new Date().toISOString());
      this.eventCount = ec ?? 0;
    } catch { /* metrics not critical */ }
  }
}


