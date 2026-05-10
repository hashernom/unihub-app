import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonItem, IonLabel, IonInput, IonButton, IonSelect, IonSelectOption,
  IonToast, IonSpinner, IonButtons, IonBackButton,
} from "@ionic/angular/standalone";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-admin-register",
  imports: [
    FormsModule, RouterLink,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonItem, IonLabel, IonInput, IonButton, IonSelect, IonSelectOption,
    IonToast, IonSpinner, IonButtons, IonBackButton,
  ],
  templateUrl: "./admin-register.page.html",
  styleUrls: ["./admin-register.page.scss"],
})
export class AdminRegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = "";
  password = "";
  studentCode = "";
  fullName = "";
  loading = false;
  showToast = false;
  toastMessage = "";

  register(): void {
    if (!this.email || !this.password || !this.studentCode || !this.fullName) {
      this.show("Todos los campos son obligatorios"); return;
    }
    this.loading = true;
    this.auth.signUp(this.email, this.password, this.studentCode, this.fullName, 'admin').subscribe({
      next: () => { this.loading = false; this.show("Admin registrado exitosamente"); setTimeout(() => this.router.navigate(["/admin/dashboard"]), 2000); },
      error: (err) => { this.loading = false; this.show(err.message ?? "Error al registrar"); },
    });
  }

  private show(msg: string): void { this.toastMessage = msg; this.showToast = true; }
}


