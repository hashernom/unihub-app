import { describe, it, expect } from 'vitest';
import { FormValidationService } from './form-validation.service';

describe('FormValidationService', () => {
  const service = new FormValidationService();

  it('should return empty for no errors', () => {
    expect(service.getErrorMessage('Email', null)).toBe('');
    expect(service.getErrorMessage('Email', undefined)).toBe('');
  });

  it('should return required message', () => {
    expect(service.getErrorMessage('Correo', { required: true })).toBe('Correo es obligatorio');
  });

  it('should return email message', () => {
    expect(service.getErrorMessage('Correo', { email: true })).toBe('Correo no tiene un formato válido');
  });

  it('should return minlength message', () => {
    expect(service.getErrorMessage('Contraseña', { minlength: { requiredLength: 8 } })).toBe(
      'Contraseña debe tener al menos 8 caracteres',
    );
  });

  it('should return maxlength message', () => {
    expect(service.getErrorMessage('Nombre', { maxlength: { requiredLength: 50 } })).toBe(
      'Nombre debe tener máximo 50 caracteres',
    );
  });

  it('should return pattern message', () => {
    expect(service.getErrorMessage('Código', { pattern: { requiredPattern: '^[0-9]+$' } })).toBe(
      'Código tiene un formato inválido',
    );
  });

  it('should return first error from map', () => {
    const errors = {
      name: { required: true },
      email: { email: true },
    };
    expect(service.getFirstErrorMessage(errors, { name: 'Nombre', email: 'Correo' })).toBe('Nombre es obligatorio');
  });
});
