import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonItem, IonLabel, IonInput, IonButton,
  IonToast, IonSpinner,
} from "@ionic/angular/standalone";
import { AuthService } from "../../core/services/auth.service";

function isValidStudentCode(code: string): boolean { return /^[A-Za-z0-9]{3,}$/.test(code); }

@Component({
  selector: "app-register",
  imports: [FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonLabel, IonInput, IonButton, IonToast, IonSpinner],
  templateUrl: "./register.page.html",
  styleUrl: "./register.page.scss",
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  studentCode = ""; fullName = ""; email = ""; password = ""; confirmPassword = "";
  loading = false; errorMessage = ""; showToast = false; showSuccess = false;

  goToLogin(): void { this.router.navigate(["/login"]); }

  onRegister(): void {
    if (!this.studentCode || !this.fullName || !this.email || !this.password || !this.confirmPassword) { this.showError("Todos los campos son obligatorios"); return; }
    if (!isValidStudentCode(this.studentCode)) { this.showError("Codigo estudiantil invalido"); return; }
    if (!this.email.includes("@")) { this.showError("Ingresa un email valido"); return; }
    if (this.password.length < 8) { this.showError("La contrasena debe tener al menos 8 caracteres"); return; }
    if (this.password !== this.confirmPassword) { this.showError("Las contrasenas no coinciden"); return; }
    this.loading = true; this.errorMessage = "";
    this.auth.signUp(this.email, this.password, this.studentCode, this.fullName).subscribe({
      next: () => { this.loading = false; this.showSuccess = true; },
      error: (err) => {
        this.loading = false;
        const m = err.message ?? "";
        if (m.includes("already registered") || m.includes("duplicate")) this.showError("Este codigo o email ya esta registrado.");
        else this.showError("Error al registrar. Intenta nuevamente.");
      },
    });
  }

  onDismissSuccess(): void { this.router.navigate(["/login"]); }
  private showError(msg: string): void { this.errorMessage = msg; this.showToast = true; }
}
