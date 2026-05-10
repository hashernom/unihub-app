import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonItem, IonLabel, IonAvatar, IonButton, IonInput,
  IonBadge, IonToast, IonSpinner, IonList, IonButtons, IonBackButton, IonIcon,
} from '@ionic/angular/standalone';
import { AuthService, type AuthUser } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  imports: [
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonItem, IonLabel, IonAvatar, IonButton, IonInput,
    IonBadge, IonToast, IonSpinner, IonList, IonButtons, IonBackButton, IonIcon,
  ],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
})
export class ProfilePage {
  private readonly auth = inject(AuthService);
  user: AuthUser | null = null;
  editName = "";
  editing = false;
  loading = false;
  showToast = false;
  toastMessage = "";

  constructor() {
    this.auth.currentUser$.subscribe((u) => {
      this.user = u;
      if (u) this.editName = u.profile.full_name;
    });
  }

  get avatarUrl(): string {
    return this.user?.profile.avatar_url ??
      "https://api.dicebear.com/7.x/initials/svg?seed=" + (this.user?.profile.full_name ?? "U");
  }

  toggleEdit(): void {
    this.editing = !this.editing;
    if (this.user) this.editName = this.user.profile.full_name;
  }

  saveProfile(): void {
    if (!this.user || !this.editName.trim()) return;
    this.loading = true;
    setTimeout(() => {
      this.loading = false;
      this.editing = false;
      this.showToastMessage("Perfil actualizado");
    }, 500);
  }

  onLogout(): void { this.auth.signOut().subscribe(); }

  private showToastMessage(msg: string): void {
    this.toastMessage = msg; this.showToast = true;
  }
}

