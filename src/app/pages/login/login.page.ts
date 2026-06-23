import { Component, inject, OnDestroy } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { Subscription } from "rxjs";
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonItem, IonLabel, IonInput, IonButton,
  IonToast, IonSpinner, IonIcon,
} from "@ionic/angular/standalone";
import { AuthService } from "../../core/services/auth.service";
import { ToastService } from "../../core/services/toast.service";
import { FormValidationService } from "../../core/services/form-validation.service";

@Component({
  selector: "app-login",
  imports: [
    FormsModule, RouterLink,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonItem, IonLabel, IonInput, IonButton,
    IonToast, IonSpinner, IonIcon,
  ],
  templateUrl: "./login.page.html",
  styleUrl: "./login.page.scss",
})
export class LoginPage implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly formValidation = inject(FormValidationService);
  private loginSub: Subscription | null = null;
  email = "";
  password = "";
  loading = false;
  errorMessage = "";
  showToast = false;

  goToRegister(): void { this.router.navigate(["/register"]); }
  goToForgotPassword(): void { this.router.navigate(["/forgot-password"]); }

  ngOnDestroy(): void { this.loginSub?.unsubscribe(); }

  ionViewWillEnter(): void {
    this.loading = false;
    this.errorMessage = "";
    this.showToast = false;
  }

  get emailError(): string {
    if (!this.email) return this.formValidation.getErrorMessage('Email', { required: true });
    return '';
  }

  get passwordError(): string {
    if (!this.password) return this.formValidation.getErrorMessage('Contraseña', { required: true });
    return '';
  }

  async onLogin(): Promise<void> {
    if (!this.email || !this.password) {
      this.showError("Por favor completa todos los campos");
      return;
    }
    this.loading = true;
    this.errorMessage = "";
    this.loginSub = this.auth.signIn(this.email.trim(), this.password).subscribe({
      next: (user) => {
        this.loading = false;
        void this.toast.success("Bienvenido de nuevo");
        const dashboard = user.profile.role === "admin" ? "/admin/dashboard" : "/tabs/dashboard";
        this.router.navigate([dashboard]);
      },
      error: (err) => {
        this.loading = false;
        let message = "Error de conexión. Intenta nuevamente.";
        try {
          const errObj = typeof err === 'object' ? err : {};
          const errMsg = String((errObj as Record<string,string>)['msg'] ?? (errObj as Record<string,string>)['message'] ?? (errObj as Record<string,string>)['error_description'] ?? (errObj as Record<string,string>)['error'] ?? '');
          if (errMsg.includes("Email not confirmed")) message = "Correo no verificado.";
          else if (errMsg.includes("Invalid login credentials")) message = "Credenciales inválidas.";
          else if (errMsg.includes("rate limit") || errMsg.includes("over_email")) message = "Demasiados intentos. Espera un momento.";
          else if (errMsg) message = errMsg;
        } catch { /* default */ }
        this.showError(message);
      },
    });
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    this.showToast = true;
    void this.toast.error(msg);
  }
}


