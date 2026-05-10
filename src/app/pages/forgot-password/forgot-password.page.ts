import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonItem, IonLabel, IonInput, IonButton, IonSpinner,
} from "@ionic/angular/standalone";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-forgot-password",
  imports: [FormsModule, RouterLink, IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonLabel, IonInput, IonButton, IonSpinner],
  templateUrl: "./forgot-password.page.html",
  styleUrl: "./forgot-password.page.scss",
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  email = ""; loading = false; sent = false;

  goToLogin(): void { this.router.navigate(["/login"]); }

  onSubmit(): void {
    if (!this.email) return;
    this.loading = true;
    this.auth.resetPassword(this.email).subscribe({
      next: () => { this.loading = false; this.sent = true; },
      error: () => { this.loading = false; this.sent = true; },
    });
  }
}

