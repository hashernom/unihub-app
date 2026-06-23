import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';

export interface ToastOptions {
  message: string;
  duration?: number;
  position?: 'top' | 'bottom' | 'middle';
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'medium';
  buttons?: { text: string; handler?: () => boolean | void | Promise<boolean | void> }[];
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(private readonly toastController: ToastController) {}

  async show(options: ToastOptions): Promise<void> {
    const toast = await this.toastController.create({
      message: options.message,
      duration: options.duration ?? 2500,
      position: options.position ?? 'bottom',
      color: options.color ?? 'primary',
      buttons: options.buttons,
      cssClass: 'global-toast',
    });
    await toast.present();
  }

  async error(message: string, options?: Omit<ToastOptions, 'message' | 'color'>): Promise<void> {
    await this.show({ ...options, message, color: 'danger', position: 'top' });
  }

  async success(message: string, options?: Omit<ToastOptions, 'message' | 'color'>): Promise<void> {
    await this.show({ ...options, message, color: 'success', position: 'bottom' });
  }

  async warning(message: string, options?: Omit<ToastOptions, 'message' | 'color'>): Promise<void> {
    await this.show({ ...options, message, color: 'warning', position: 'top' });
  }

  async info(message: string, options?: Omit<ToastOptions, 'message' | 'color'>): Promise<void> {
    await this.show({ ...options, message, color: 'primary', position: 'bottom' });
  }

  async retry(message: string, retry: () => void | Promise<void>): Promise<void> {
    await this.error(message, {
      duration: 5000,
      buttons: [
        {
          text: 'Reintentar',
          handler: () => {
            void retry();
            return true;
          },
        },
      ],
    });
  }
}
