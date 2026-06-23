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

  register(): void {
    if (!this.email || !this.password || !this.fullName) {
      this.show("Todos los campos son obligatorios"); return;
    }
    this.loading = true;
    this.auth.signUp(this.email, this.password, this.fullName, '', '', 'admin').subscribe({
      next: () => { this.loading = false; this.show("Admin registrado exitosamente"); this.router.navigate(["/admin/dashboard"]); },
      error: (err) => { this.loading = false; this.show(String((err as Record<string,unknown>)['message'] ?? "Error al registrar")); },
    });
  }

  private show(msg: string): void { this.toastMessage = msg; this.showToast = true; }
}


