import { Component, inject, OnDestroy } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { Subscription } from "rxjs";
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonItem, IonLabel, IonInput, IonButton,
  IonToast, IonSpinner,
} from "@ionic/angular/standalone";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-login",
  imports: [
    FormsModule, RouterLink,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonItem, IonLabel, IonInput, IonButton,
    IonToast, IonSpinner,
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

  async onLogin(): Promise<void> {
    if (!this.email || !this.password) { this.showError("Por favor completa todos los campos"); return; }
    this.loading = true;
    this.errorMessage = "";
    this.loginSub = this.auth.signIn(this.email, this.password).subscribe({
      next: (user) => {
        this.loading = false;
        const dashboard = user.profile.role === "admin" ? "/admin/dashboard" : "/tabs/dashboard";
        this.router.navigate([dashboard]);
      },
      error: (err) => {
        this.loading = false;
        const message = err?.message ?? "";
        if (message.includes("Email not confirmed")) this.showError("Email no verificado. Revisa tu bandeja de entrada.");
        else if (message.includes("Invalid login credentials")) this.showError("Credenciales invalidas.");
        else this.showError("Error de conexion. Intenta nuevamente.");
      },
    });
  }

  private showError(msg: string): void { this.errorMessage = msg; this.showToast = true; }
}


