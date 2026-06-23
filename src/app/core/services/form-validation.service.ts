import { Injectable } from '@angular/core';

export interface ValidationErrorDetail {
  requiredLength?: number;
  min?: number | string;
  max?: number | string;
  requiredPattern?: string;
}

export type ValidationErrors = Record<string, ValidationErrorDetail | boolean | string | number | undefined>;

@Injectable({ providedIn: 'root' })
export class FormValidationService {
  getErrorMessage(fieldName: string, errors: ValidationErrors | null | undefined): string {
    if (!errors) return '';

    if (errors['required']) {
      return `${fieldName} es obligatorio`;
    }

    if (errors['email']) {
      return `${fieldName} no tiene un formato válido`;
    }

    if (errors['minlength']) {
      const detail = errors['minlength'] as ValidationErrorDetail;
      const min = detail?.requiredLength ?? 0;
      return `${fieldName} debe tener al menos ${min} caracteres`;
    }

    if (errors['maxlength']) {
      const detail = errors['maxlength'] as ValidationErrorDetail;
      const max = detail?.requiredLength ?? 0;
      return `${fieldName} debe tener máximo ${max} caracteres`;
    }

    if (errors['min']) {
      const detail = errors['min'] as ValidationErrorDetail;
      return `${fieldName} debe ser mayor o igual a ${String(detail?.min ?? '')}`;
    }

    if (errors['max']) {
      const detail = errors['max'] as ValidationErrorDetail;
      return `${fieldName} debe ser menor o igual a ${String(detail?.max ?? '')}`;
    }

    if (errors['pattern']) {
      return `${fieldName} tiene un formato inválido`;
    }

    if (errors['mismatch']) {
      return `${fieldName} no coincide`;
    }

    return `${fieldName} es inválido`;
  }

  getFirstErrorMessage(errors: Record<string, ValidationErrors | null | undefined>, labels: Record<string, string>): string {
    for (const [key, fieldErrors] of Object.entries(errors)) {
      const msg = this.getErrorMessage(labels[key] ?? key, fieldErrors);
      if (msg) return msg;
    }
    return '';
  }
}
