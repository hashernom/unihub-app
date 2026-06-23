import { Injectable } from '@angular/core';
import { ToastService } from './toast.service';

export interface HttpError {
  status?: number;
  message?: string;
  error?: { message?: string };
}

export interface NavigatorLike {
  navigate: (commands: string[]) => void | Promise<boolean>;
}

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private navigator?: NavigatorLike;

  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(private readonly toast: ToastService) {}

  registerNavigator(navigator: NavigatorLike): void {
    this.navigator = navigator;
  }

  handleHttpError(error: HttpError | unknown, retry?: () => void | Promise<void>): void {
    const err = error as HttpError;
    const status = err?.status ?? 0;
    const serverMessage = (err as { error?: { message?: string } })?.error?.message;

    switch (status) {
      case 0:
        if (retry) {
          void this.toast.retry('Sin conexión. Verifica tu red e intenta de nuevo.', retry);
        } else {
          void this.toast.error('Sin conexión. Verifica tu red e intenta de nuevo.');
        }
        break;
      case 401:
        void this.toast.error('Sesión expirada. Inicia sesión de nuevo.');
        this.navigator?.navigate(['/login']);
        break;
      case 403:
        void this.toast.error('No tienes permiso para realizar esta acción.');
        break;
      case 404:
        void this.toast.error('Recurso no encontrado.');
        break;
      case 422:
        void this.toast.error(serverMessage ?? 'Datos inválidos. Revisa los campos.');
        break;
      case 500:
      case 502:
      case 503:
        void this.toast.error('Error del servidor. Intenta más tarde.');
        break;
      default:
        void this.toast.error('Ocurrió un error inesperado. Intenta de nuevo.');
    }
  }

  handleFormError(fieldErrors: Record<string, string[]>): string {
    const messages: string[] = [];
    for (const [, errors] of Object.entries(fieldErrors)) {
      messages.push(...errors);
    }
    const text = messages.slice(0, 2).join('. ');
    void this.toast.error(text || 'Datos inválidos. Revisa los campos.');
    return text;
  }

  handleGenericError(): void {
    void this.toast.error('Ocurrió un error inesperado. Intenta de nuevo.');
  }
}
