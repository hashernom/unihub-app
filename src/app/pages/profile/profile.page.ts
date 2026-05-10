import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonItem, IonLabel, IonAvatar, IonButton, IonInput,
  IonBadge, IonToast, IonSpinner, IonList, IonButtons, IonBackButton,
} from "@ionic/angular/standalone";
import { AuthService, type AuthUser } from "../../core/services/auth.service";
import { SupabaseService } from "../../core/services/supabase.service";

@Component({
  selector: "app-profile",
  imports: [
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonItem, IonLabel, IonAvatar, IonButton, IonInput,
    IonBadge, IonToast, IonSpinner, IonList, IonButtons, IonBackButton,
  ],
  templateUrl: "./profile.page.html",
  styleUrl: "./profile.page.scss",
})
export class ProfilePage {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);

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
      this.toast("Perfil actualizado");
    }, 500);
  }

  async onAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (file.size > 5242880) { this.toast("La imagen no puede superar los 5MB"); return; }
    if (!["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type)) {
      this.toast("Formato no soportado. Usa PNG, JPG, GIF o WebP"); return;
    }
    this.loading = true;
    try {
      const base64 = await this.fileToBase64(file);
      const url = await this.supabase.uploadAvatar(this.user!.id, base64);
      if (url && this.user) {
        this.user = { ...this.user, profile: { ...this.user.profile, avatar_url: url } };
      }
      this.loading = false;
      this.toast("Foto actualizada");
    } catch {
      this.loading = false;
      this.toast("Error al subir la imagen");
    }
  }

  onLogout(): void { this.auth.signOut().subscribe(); }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private toast(msg: string): void { this.toastMessage = msg; this.showToast = true; }
}
