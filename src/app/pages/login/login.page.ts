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

  async onLogin(): Promise<void> {
    if (!this.email || !this.password) { this.showError("Por favor completa todos los campos"); return; }
    this.loading = true;
    this.errorMessage = "";
    this.loginSub = this.auth.signIn(this.email.trim(), this.password).subscribe({
      next: (user) => {
        this.loading = false;
        const dashboard = user.profile.role === "admin" ? "/admin/dashboard" : "/tabs/dashboard";
        this.router.navigate([dashboard]);
      },
      error: (err) => {
        this.loading = false;
        let message = "Error de conexion. Intenta nuevamente.";
        console.log("Login error:", err);
        try {
          const errObj = typeof err === 'object' ? err : {};
          const errMsg = String((errObj as Record<string,string>)['msg'] ?? (errObj as Record<string,string>)['message'] ?? (errObj as Record<string,string>)['error_description'] ?? (errObj as Record<string,string>)['error'] ?? '');
          if (errMsg.includes("Email not confirmed")) message = "Email no verificado.";
          else if (errMsg.includes("Invalid login credentials")) message = "Credenciales invalidas.";
          else if (errMsg.includes("rate limit") || errMsg.includes("over_email")) message = "Demasiados intentos. Espera.";
          else if (errMsg) message = errMsg;
        } catch { /* default */ }
        this.showError(message);
      },
    });
  }

  private showError(msg: string): void { this.errorMessage = msg; this.showToast = true; }
}


