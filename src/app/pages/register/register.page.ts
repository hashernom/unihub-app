import { Component, inject, NgZone } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { firstValueFrom, timeout } from "rxjs";
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonItem, IonLabel, IonInput, IonButton,
  IonToast, IonSpinner,
} from "@ionic/angular/standalone";
import { AuthService } from "../../core/services/auth.service";

const INST_EMAIL_DOMAIN = "@mail.udes.edu.co";

function isValidInstitutionalEmail(email: string): boolean {
  if (!email.endsWith(INST_EMAIL_DOMAIN)) return false;
  const code = email.split("@")[0];
  return code.length >= 3;
}

@Component({
  selector: "app-register",
  imports: [FormsModule, RouterLink,
    IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonLabel, IonInput, IonButton, IonToast, IonSpinner],
  templateUrl: "./register.page.html",
  styleUrl: "./register.page.scss",
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  email = ""; fullName = ""; password = ""; confirmPassword = "";
  carrera = ""; semestre = "";
  loading = false; errorMessage = ""; showToast = false; showSuccess = false;

  goToLogin(): void { this.router.navigate(["/login"]); }

  async onRegister(): Promise<void> {
    if (!this.email || !this.fullName || !this.password || !this.confirmPassword || !this.carrera || !this.semestre) {
      this.showError("Todos los campos son obligatorios"); return;
    }
    if (!isValidInstitutionalEmail(this.email)) {
      this.showError("Ingresa un correo institucional valido (" + INST_EMAIL_DOMAIN + ")"); return;
    }
    if (this.password.length < 8) {
      this.showError("La contrasena debe tener al menos 8 caracteres"); return;
    }
    if (this.password !== this.confirmPassword) {
      this.showError("Las contrasenas no coinciden"); return;
    }
    this.loading = true; this.errorMessage = "";
    try {
      await firstValueFrom(this.auth.signUp(this.email, this.password, this.fullName, this.carrera, this.semestre, "student").pipe(
        timeout({ each: 20000 }),
      ));
      this.zone.run(() => { this.loading = false; this.showSuccess = true; });
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      this.zone.run(() => {
        this.loading = false;
        const m = String(e['message'] ?? e['msg'] ?? '');
        if (m.includes("rate limit") || m.includes("over_email") || Number(e['status']) === 429) {
          this.showError("Demasiados intentos. Espera unos minutos y vuelve a intentarlo.");
        } else if (m.includes("already registered") || m.includes("duplicate") || m.includes("already exists")) {
          this.showError("Este correo ya esta registrado.");
        } else if (String(e['name']) === "TimeoutError") {
          this.showError("Tiempo de espera agotado. Verifica tu conexion.");
        } else {
          this.showError(m || "Error al registrar. Intenta nuevamente.");
        }
      });
    }
  }

  onDismissSuccess(): void { this.router.navigate(["/login"]); }
  private showError(msg: string): void { this.errorMessage = msg; this.showToast = true; }
}


