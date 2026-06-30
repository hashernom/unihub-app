import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { Subscription } from "rxjs";
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonItem, IonLabel, IonInput, IonButton,
  IonSelect, IonSelectOption,
  IonToast, IonSpinner, IonIcon,
} from "@ionic/angular/standalone";
import { AuthService } from "../../core/services/auth.service";
import { environment } from "../../../environments/environment";

const INST_EMAIL_DOMAIN = "@mail.udes.edu.co";
// Same regex used by the validate-student-code Edge Function.
const STUDENT_CODE_REGEX = /^[Uu]?\d{8,11}$/;

function isValidInstitutionalEmail(email: string): boolean {
  if (!email.endsWith(INST_EMAIL_DOMAIN)) return false;
  const code = email.split("@")[0];
  return STUDENT_CODE_REGEX.test(code);
}

interface ValidateStudentCodeResponse {
  valid: boolean;
  error?: string;
  message?: string;
}

@Component({
  selector: "app-register",
  imports: [FormsModule, RouterLink,
    IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonLabel, IonInput, IonButton, IonSelect, IonSelectOption, IonToast, IonSpinner, IonIcon],
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

  async onRegister(): Promise<void> {
    if (!this.email || !this.fullName || !this.password || !this.confirmPassword || !this.carrera || !this.semestre) {
      this.showError("Todos los campos son obligatorios"); return;
    }
    if (!isValidInstitutionalEmail(this.email)) {
      this.showError("Ingresa un correo institucional válido (" + INST_EMAIL_DOMAIN + ") con un código estudiantil válido"); return;
    }
    if (this.password.length < 8) {
      this.showError("La contraseña debe tener al menos 8 caracteres"); return;
    }
    if (this.password !== this.confirmPassword) {
      this.showError("Las contraseñas no coinciden"); return;
    }

    this.loading = true;
    this.errorMessage = "";

    try {
      const studentCode = this.email.trim().split("@")[0];
      const validation = await this.validateStudentCode(studentCode);
      if (!validation.valid) {
        this.showError(validation.message ?? "Código estudiantil no válido");
        return;
      }
    } catch {
      this.showError("No se pudo validar el código estudiantil. Intenta de nuevo.");
      return;
    } finally {
      this.loading = false;
    }

    this.loading = true;
    this.registerSub?.unsubscribe();
    this.registerSub = this.auth.signUp(
      this.email.trim(),
      this.password,
      this.fullName.trim(),
      this.carrera,
      this.semestre,
    ).subscribe({
      next: (user) => {
        this.loading = false;
        this.auth.setCurrentUser(user);
        this.router.navigate(["/tabs/dashboard"]);
      },
      error: (err) => {
        this.loading = false;
        let m = "";
        const e = err as Record<string, unknown>;
        if (typeof e === 'object' && e !== null) {
          m = String(e['msg'] ?? e['message'] ?? e['error_description'] ?? e['error'] ?? '');
          if (!m && 'toString' in e) m = String(e.toString());
        }
        if (m.includes("rate limit") || m.includes("over_email") || Number(e['status']) === 429) {
          this.showError("Demasiados intentos. Espera unos minutos y vuelve a intentarlo.");
        } else if (m.includes("already registered") || m.includes("already exists") || m.includes("duplicate")) {
          this.showError("Este correo ya está registrado.");
        } else if (m.includes("TimeoutError")) {
          this.showError("Tiempo de espera agotado. Verifica tu conexión.");
        } else {
          this.showError(m || "Error al registrar. Intenta nuevamente.");
        }
      },
    });
  }

  private async validateStudentCode(studentCode: string): Promise<ValidateStudentCodeResponse> {
    const res = await fetch(`${environment.supabaseUrl}/functions/v1/validate-student-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_code: studentCode }),
    });

    const body = (await res.json().catch(() => ({}))) as ValidateStudentCodeResponse;
    return body;
  }

  private showError(msg: string): void { this.errorMessage = msg; this.showToast = true; }
}


