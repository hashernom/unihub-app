import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { Subscription } from "rxjs";
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonItem, IonLabel, IonInput, IonButton,
  IonSelect, IonSelectOption,
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
    IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonLabel, IonInput, IonButton, IonSelect, IonSelectOption, IonToast, IonSpinner],
  templateUrl: "./register.page.html",
  styleUrl: "./register.page.scss",
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  email = ""; fullName = ""; password = ""; confirmPassword = "";
  carrera = ""; semestre = "";
  loading = false; errorMessage = ""; showToast = false;
  private registerSub: Subscription | null = null;

  readonly carreras = [
    "Ingeniería de Sistemas",
    "Ingeniería Industrial",
    "Ingeniería Civil",
    "Ingeniería Electrónica",
    "Ingeniería Mecánica",
    "Administración de Empresas",
    "Contaduría Pública",
    "Derecho",
    "Psicología",
    "Medicina",
    "Enfermería",
    "Comunicación Social",
    "Arquitectura",
    "Licenciatura en Educación",
    "Otra",
  ] as const;

  readonly semestres = Array.from({ length: 12 }, (_, i) => String(i + 1));

  goToLogin(): void { this.router.navigate(["/login"]); }

  onRegister(): void {
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

    this.loading = true;
    this.errorMessage = "";

    this.registerSub?.unsubscribe();
    this.registerSub = this.auth.signUp(
      this.email.trim(),
      this.password,
      this.fullName.trim(),
      this.carrera,
      this.semestre,
      "student",
    ).subscribe({
      next: (user) => {
        this.loading = false;
        this.auth.setCurrentUser(user);
        this.router.navigate(["/tabs/dashboard"]);
      },
      error: (err) => {
        this.loading = false;
        console.log("Register error:", err);
        let m = "";
        const e = err as Record<string, unknown>;
        if (typeof e === 'object' && e !== null) {
          m = String(e['msg'] ?? e['message'] ?? e['error_description'] ?? e['error'] ?? '');
          if (!m && 'toString' in e) m = String(e.toString());
        }
        if (m.includes("rate limit") || m.includes("over_email") || Number(e['status']) === 429) {
          this.showError("Demasiados intentos. Espera unos minutos y vuelve a intentarlo.");
        } else if (m.includes("already registered") || m.includes("already exists") || m.includes("duplicate")) {
          this.showError("Este correo ya esta registrado.");
        } else if (m.includes("TimeoutError")) {
          this.showError("Tiempo de espera agotado. Verifica tu conexion.");
        } else {
          this.showError(m || "Error al registrar. Intenta nuevamente.");
        }
      },
    });
  }

  private showError(msg: string): void { this.errorMessage = msg; this.showToast = true; }
}


