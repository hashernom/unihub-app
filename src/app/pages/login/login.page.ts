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

@Component({
  selector: 'app-login',
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
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  loading = false;
  errorMessage = '';
  showToast = false;

  async onLogin(): Promise<void> {
    if (!this.email || !this.password) {
      this.showError('Por favor completa todos los campos');
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.auth.signIn(this.email, this.password).subscribe({
      next: (user) => {
        this.loading = false;
        const dashboard =
          user.profile.role === 'admin' ? '/admin/dashboard' : '/tabs/dashboard';
        this.router.navigate([dashboard]);
      },
      error: (err) => {
        this.loading = false;
        const message = err.message ?? '';
        if (message.includes('Email not confirmed')) {
          this.showError('Email no verificado. Revisa tu bandeja de entrada.');
        } else if (message.includes('Invalid login credentials')) {
          this.showError('Credenciales inválidas. Verifica tu email y contraseña.');
        } else {
          this.showError('Error de conexión. Intenta nuevamente.');
        }
      },
    });
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    this.showToast = true;
  }
}


