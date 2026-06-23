import { Component, input, output } from '@angular/core';
import { IonButton, IonIcon, IonLabel } from '@ionic/angular/standalone';

export type EmptyStateVariant = 'default' | 'compact' | 'error';

@Component({
  selector: 'app-empty-state',
  imports: [IonIcon, IonLabel, IonButton],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly icon = input<string>('help-circle');
  readonly title = input<string>('No hay nada aquí');
  readonly message = input<string>('');
  readonly actionText = input<string>('');
  readonly variant = input<EmptyStateVariant>('default');
  readonly action = output<void>();

  onAction(): void {
    this.action.emit();
  }
}
