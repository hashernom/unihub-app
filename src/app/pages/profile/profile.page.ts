import { Component, inject, OnDestroy } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonItem, IonLabel, IonAvatar, IonButton, IonInput,
  IonBadge, IonSpinner, IonList, IonListHeader, IonButtons, IonBackButton, IonIcon,
  IonSegment, IonSegmentButton,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import { notifications, moon, sunny, desktop } from "ionicons/icons";
import { Subscription } from "rxjs";
import { AuthService, type AuthUser } from "../../core/services/auth.service";
import { SupabaseService } from "../../core/services/supabase.service";
import { ToastService } from "../../core/services/toast.service";
import { ThemeService, type ThemeMode } from "../../core/services/theme.service";
import { EmptyStateComponent } from "../../shared/components/empty-state/empty-state.component";
import { ErrorStateComponent } from "../../shared/components/error-state/error-state.component";
import { SkeletonListComponent } from "../../shared/components/skeleton-list/skeleton-list.component";

@Component({
  selector: "app-profile",
  imports: [
    FormsModule, RouterLink,
    EmptyStateComponent, ErrorStateComponent, SkeletonListComponent,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonItem, IonLabel, IonAvatar, IonButton, IonInput,
    IonBadge, IonSpinner, IonList, IonListHeader, IonButtons, IonBackButton, IonIcon,
    IonSegment, IonSegmentButton,
  ],
  templateUrl: "./profile.page.html",
  styleUrl: "./profile.page.scss",
})
export class ProfilePage implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);
  private readonly toastService = inject(ToastService);
  private readonly themeService = inject(ThemeService);
  private sub = new Subscription();

  user: AuthUser | null = null;
  editName = "";
  editing = false;
  loading = false;
  userLoading = true;
  userError = false;
  themeMode: ThemeMode = 'system';

  constructor() {
    addIcons({ notifications, moon, sunny, desktop });
    this.themeMode = this.themeService.currentMode();
    this.sub.add(this.auth.currentUser$.subscribe({
      next: (u) => {
        this.user = u;
        this.userLoading = false;
        this.userError = false;
        if (u) this.editName = u.profile.full_name;
      },
      error: () => {
        this.userLoading = false;
        this.userError = true;
      },
    }));
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get defaultHref(): string {
    return this.user?.profile.role === 'admin' ? '/admin/dashboard' : '/tabs/dashboard';
  }

  get avatarUrl(): string {
    return this.user?.profile.avatar_url ?? this.buildInitialsAvatar(this.user?.profile.full_name ?? "U");
  }

  private buildInitialsAvatar(fullName: string): string {
    const initials = fullName
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
      '<rect width="100" height="100" fill="#1E3A5F"/>',
      `<text x="50" y="55" font-family="Arial,sans-serif" font-size="40" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${initials}</text>`,
      '</svg>',
    ].join('');

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  toggleEdit(): void {
    this.editing = !this.editing;
    if (this.user) this.editName = this.user.profile.full_name;
  }

  async saveProfile(): Promise<void> {
    if (!this.user || !this.editName.trim()) return;
    this.loading = true;
    try {
      await this.supabase.client.from("profiles").update({ full_name: this.editName.trim() }).eq("id", this.user.id);
      this.user = { ...this.user, profile: { ...this.user.profile, full_name: this.editName.trim() } };
      this.editing = false;
      await this.toastService.success("Perfil actualizado");
    } catch {
      await this.toastService.error("Error al actualizar el perfil");
    }
    this.loading = false;
  }

  async onAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (file.size > 5242880) { await this.toastService.warning("La imagen no puede superar los 5MB"); return; }
    if (!["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type)) {
      await this.toastService.warning("Formato no soportado. Usa PNG, JPG, GIF o WebP"); return;
    }
    if (!this.user) return;
    this.loading = true;
    try {
      const base64 = await this.fileToBase64(file);
      const url = await this.supabase.uploadAvatar(this.user.id, base64);
      if (url) {
        this.user = { ...this.user, profile: { ...this.user.profile, avatar_url: url } };
      }
      await this.toastService.success("Foto actualizada");
    } catch {
      await this.toastService.error("Error al subir la imagen");
    }
    this.loading = false;
  }

  async onThemeChange(mode: ThemeMode): Promise<void> {
    await this.themeService.setTheme(mode);
    this.themeMode = mode;
  }

  onLogout(): void { this.sub.add(this.auth.signOut().subscribe()); }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  retryLoadUser(): void {
    this.userLoading = true;
    this.userError = false;
    this.sub.add(this.auth.currentUser$.subscribe({
      next: (u) => {
        this.user = u;
        this.userLoading = false;
        this.userError = false;
        if (u) this.editName = u.profile.full_name;
      },
      error: () => {
        this.userLoading = false;
        this.userError = true;
      },
    }));
  }
}
