import { Component, input, output } from '@angular/core';
import { IonButton, IonIcon, IonLabel } from '@ionic/angular/standalone';

@Component({
  selector: 'app-error-state',
  imports: [IonIcon, IonLabel, IonButton],
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.scss',
})
export class ErrorStateComponent {
  readonly icon = input<string>('warning-outline');
  readonly message = input<string>('No se pudieron cargar los datos.');
  readonly retryText = input<string>('Reintentar');
  readonly retry = output<void>();

  onRetry(): void {
    this.retry.emit();
  }
}
