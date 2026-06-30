import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@ionic/angular/standalone', () => ({
  ToastController: class ToastController {
    create = vi.fn().mockResolvedValue({ present: vi.fn() });
  },
}));

import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;
  const createMock = vi.fn().mockResolvedValue({ present: vi.fn() });

  const mockController = {
    create: createMock,
  } as unknown as import('@ionic/angular/standalone').ToastController;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ToastService(mockController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should show default toast', async () => {
    await service.show({ message: 'Hola' });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Hola',
        duration: 2500,
        position: 'bottom',
        color: 'primary',
        cssClass: 'global-toast',
      }),
    );
  });

  it('should show error toast at top with danger color', async () => {
    await service.error('Error');
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Error',
        color: 'danger',
        position: 'top',
      }),
    );
  });

  it('should show success toast with success color', async () => {
    await service.success('OK');
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'OK',
        color: 'success',
        position: 'bottom',
      }),
    );
  });

  it('should show warning toast with warning color', async () => {
    await service.warning('Cuidado');
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Cuidado',
        color: 'warning',
        position: 'top',
      }),
    );
  });

  it('should show info toast with primary color', async () => {
    await service.info('Info');
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Info',
        color: 'primary',
        position: 'bottom',
      }),
    );
  });

  it('should show retry toast with Reintentar button', async () => {
    const retryFn = vi.fn();
    await service.retry('Sin conexión', retryFn);

    const call = createMock.mock.calls[0]?.[0] as { buttons?: { text: string; handler: () => void }[] };
    expect(call?.buttons?.[0]?.text).toBe('Reintentar');

    call?.buttons?.[0]?.handler?.();
    expect(retryFn).toHaveBeenCalled();
  });
});
