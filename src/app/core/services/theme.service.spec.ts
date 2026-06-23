import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeService } from './theme.service';
import type { StorageService } from '../storage/storage.service';

function createStorageMock(): StorageService {
  return {
    get: vi.fn(),
    set: vi.fn().mockResolvedValue(undefined),
  } as unknown as StorageService;
}

function createMatchMediaMock(initialMatches = false): MediaQueryList {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  return {
    get matches() { return matches; },
    get media() { return '(prefers-color-scheme: dark)'; },
    addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    dispatchEvent: (event: MediaQueryListEvent) => {
      matches = event.matches;
      listeners.forEach((listener) => listener(event));
      return true;
    },
    onchange: null,
  } as unknown as MediaQueryList;
}

describe('ThemeService', () => {
  let service: ThemeService;
  let storageMock: StorageService;
  let mediaQueryMock: MediaQueryList;

  beforeEach(() => {
    storageMock = createStorageMock();
    mediaQueryMock = createMatchMediaMock(false);

    let themeAttr = 'light';
    vi.stubGlobal('window', {
      matchMedia: () => mediaQueryMock,
    });
    vi.stubGlobal('document', {
      documentElement: {
        getAttribute: vi.fn((name: string) => (name === 'data-theme' ? themeAttr : null)),
        setAttribute: vi.fn((name: string, value: string) => {
          if (name === 'data-theme') themeAttr = value;
        }),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should be created', () => {
    service = new ThemeService(storageMock);
    expect(service).toBeTruthy();
  });

  it('should default to system and apply light when no preference is stored', async () => {
    vi.mocked(storageMock.get).mockResolvedValue(null);
    service = new ThemeService(storageMock);
    await service.initializeTheme();

    expect(service.currentMode()).toBe('system');
    expect(service.isDark()).toBe(false);
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
  });

  it('should apply dark mode when persisted as dark', async () => {
    vi.mocked(storageMock.get).mockResolvedValue('dark');
    service = new ThemeService(storageMock);
    await service.initializeTheme();

    expect(service.currentMode()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should persist theme mode', async () => {
    vi.mocked(storageMock.get).mockResolvedValue('light');
    service = new ThemeService(storageMock);
    await service.initializeTheme();

    await service.setTheme('dark');
    expect(storageMock.set).toHaveBeenCalledWith('app_theme', 'dark');
    expect(service.currentMode()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should toggle dark mode', async () => {
    vi.mocked(storageMock.get).mockResolvedValue('light');
    service = new ThemeService(storageMock);
    await service.initializeTheme();

    await service.toggleDarkMode();
    expect(service.isDark()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should follow system preference when mode is system', async () => {
    vi.mocked(storageMock.get).mockResolvedValue('system');
    mediaQueryMock = createMatchMediaMock(true);
    vi.stubGlobal('matchMedia', () => mediaQueryMock);

    service = new ThemeService(storageMock);
    await service.initializeTheme();

    expect(service.currentMode()).toBe('system');
    expect(service.isDark()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
