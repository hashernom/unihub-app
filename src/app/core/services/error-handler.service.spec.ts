import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandlerService } from './error-handler.service';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  const toastMock = {
    error: vi.fn(),
    retry: vi.fn(),
  };
  const routerMock = {
    navigate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ErrorHandlerService(toastMock as unknown as import('./toast.service').ToastService);
    service.registerNavigator(routerMock as unknown as { navigate: (commands: string[]) => void });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should redirect to login on 401', () => {
    service.handleHttpError({ status: 401 });
    expect(toastMock.error).toHaveBeenCalledWith('Sesión expirada. Inicia sesión de nuevo.');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should show permission error on 403', () => {
    service.handleHttpError({ status: 403 });
    expect(toastMock.error).toHaveBeenCalledWith('No tienes permiso para realizar esta acción.');
  });

  it('should show not found on 404', () => {
    service.handleHttpError({ status: 404 });
    expect(toastMock.error).toHaveBeenCalledWith('Recurso no encontrado.');
  });

  it('should show server error on 500', () => {
    service.handleHttpError({ status: 500 });
    expect(toastMock.error).toHaveBeenCalledWith('Error del servidor. Intenta más tarde.');
  });

  it('should show network error with retry', () => {
    const retry = vi.fn();
    service.handleHttpError({ status: 0 }, retry);
    expect(toastMock.retry).toHaveBeenCalledWith('Sin conexión. Verifica tu red e intenta de nuevo.', retry);
  });

  it('should show generic error by default', () => {
    service.handleHttpError({ status: 418 });
    expect(toastMock.error).toHaveBeenCalledWith('Ocurrió un error inesperado. Intenta de nuevo.');
  });

  it('should handle form errors', () => {
    const result = service.handleFormError({ email: ['Formato inválido'] });
    expect(toastMock.error).toHaveBeenCalledWith('Formato inválido');
    expect(result).toBe('Formato inválido');
  });

  it('should handle generic error', () => {
    service.handleGenericError();
    expect(toastMock.error).toHaveBeenCalledWith('Ocurrió un error inesperado. Intenta de nuevo.');
  });
});
