import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonToast,
  IonSpinner,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonToast,
    IonSpinner,
  ],
  templateUrl: './reset-password.page.html',
  styleUrl: './reset-password.page.scss',
})
export class ResetPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  password = '';
  confirmPassword = '';
  loading = false;
  errorMessage = '';
  showToast = false;

  onSubmit(): void {
    if (this.password.length < 8) {
      this.showError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.showError('Las contraseñas no coinciden');
      return;
    }

    this.loading = true;
    this.auth.updatePassword(this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        this.showError(err.message ?? 'Error al actualizar la contraseña');
      },
    });
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    this.showToast = true;
  }
}
