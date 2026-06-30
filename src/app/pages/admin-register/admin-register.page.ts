import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonItem, IonLabel, IonInput, IonButton, IonNote,
  IonToast, IonSpinner, IonButtons, IonBackButton, IonIcon,
} from "@ionic/angular/standalone";
import { AuthService } from "../../core/services/auth.service";
import { FormValidationService } from "../../core/services/form-validation.service";
import { environment } from "../../../environments/environment";

@Component({
  selector: "app-admin-register",
  imports: [
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonItem, IonLabel, IonInput, IonButton, IonNote,
    IonToast, IonSpinner, IonButtons, IonBackButton, IonIcon,
  ],
  templateUrl: "./admin-register.page.html",
  styleUrl: "./admin-register.page.scss",
})
export class AdminRegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly formValidation = inject(FormValidationService);

  email = "";
  password = "";
  fullName = "";
  loading = false;
  showToast = false;
  toastMessage = "";

  async register(): Promise<void> {
    if (!this.email || !this.password || !this.fullName) {
      this.show("Todos los campos son obligatorios"); return;
    }
    if (this.password.length < 8) {
      this.show("La contraseña debe tener al menos 8 caracteres"); return;
    }

    this.loading = true;
    try {
      const token = await this.auth.getAccessToken();
      if (!token) {
        this.show("Sesión no válida. Inicia sesión de nuevo.");
        return;
      }

      const res = await fetch(`${environment.supabaseUrl}/functions/v1/create-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: this.email.trim(),
          password: this.password,
          full_name: this.fullName.trim(),
        }),
      });

      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        this.show(String(body["error"] ?? "Error al registrar administrador"));
        return;
      }

      this.show("Admin registrado exitosamente");
      this.router.navigate(["/admin/dashboard"]);
    } catch (err) {
      this.show(String((err as Record<string, unknown>)["message"] ?? "Error al registrar administrador"));
    } finally {
      this.loading = false;
    }
  }

  private show(msg: string): void { this.toastMessage = msg; this.showToast = true; }
}
