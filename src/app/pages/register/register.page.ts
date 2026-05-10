import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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

/** Validates student code format: U followed by exactly 8 digits */
function isValidStudentCode(code: string): boolean {
  return /^U\d{8}$/.test(code);
}

@Component({
  selector: 'app-register',
  imports: [
    FormsModule,
    RouterLink,
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
  templateUrl: './register.page.html',
  styleUrl: './register.page.scss',
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  studentCode = '';
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  loading = false;
  errorMessage = '';
  showToast = false;
  showSuccess = false;

  onRegister(): void {
    // --- Client-side validation ---
    if (!this.studentCode || !this.fullName || !this.email || !this.password || !this.confirmPassword) {
      this.showError('Todos los campos son obligatorios');
      return;
    }

    if (!isValidStudentCode(this.studentCode)) {
      this.showError('El código debe tener formato U seguido de 8 dígitos (ej: U20231001)');
      return;
    }

    if (!this.email.includes('@')) {
      this.showError('Ingresa un email válido');
      return;
    }

    if (this.password.length < 8) {
      this.showError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.showError('Las contraseñas no coinciden');
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.auth.signUp(this.email, this.password, this.studentCode, this.fullName).subscribe({
      next: () => {
        this.loading = false;
        this.showSuccess = true;
      },
      error: (err) => {
        this.loading = false;
        const message = err.message ?? '';
        if (message.includes('already registered') || message.includes('duplicate')) {
          this.showError('Este código estudiantil o email ya está registrado.');
        } else {
          this.showError('Error al registrar. Intenta nuevamente.');
        }
      },
    });
  }

  onDismissSuccess(): void {
    this.router.navigate(['/login']);
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    this.showToast = true;
  }
}


