import { Injectable, signal, computed } from '@angular/core';
import { StorageService } from '../storage/storage.service';

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Manages the application theme (light / dark / system).
 *
 * - Persists the user choice in Ionic Storage (key `app_theme`).
 * - Reacts to `prefers-color-scheme` when the mode is `system`.
 * - Applies the theme by setting `data-theme` on the `<html>` element.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'app_theme';
  private readonly darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  private readonly mode = signal<ThemeMode>('system');
  private readonly systemDark = signal(this.darkMediaQuery.matches);

  /** Current user-selected mode. */
  readonly currentMode = this.mode.asReadonly();

  /** Whether the effective theme is dark right now. */
  readonly isDark = computed(() => {
    const selected = this.mode();
    if (selected === 'dark') return true;
    if (selected === 'light') return false;
    return this.systemDark();
  });

  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(private readonly storage: StorageService) {
    this.darkMediaQuery.addEventListener('change', (event) => {
      this.systemDark.set(event.matches);
      if (this.mode() === 'system') {
        this.apply('system');
      }
    });
  }

  /**
   * Reads the persisted mode (or defaults to `system`) and applies it.
   * Call once at application startup.
   */
  async initializeTheme(): Promise<void> {
    const stored = await this.storage.get<ThemeMode>(this.storageKey);
    const initialMode = stored ?? 'system';
    this.systemDark.set(this.darkMediaQuery.matches);
    this.apply(initialMode, false);
    this.mode.set(initialMode);
  }

  /** Toggles between light and dark, persisting the explicit choice. */
  async toggleDarkMode(): Promise<void> {
    const next = this.isDark() ? 'light' : 'dark';
    await this.setTheme(next);
  }

  /**
   * Sets the theme mode explicitly.
   * @param mode `light`, `dark` or `system`.
   */
  async setTheme(mode: ThemeMode): Promise<void> {
    await this.storage.set(this.storageKey, mode);
    this.apply(mode);
    this.mode.set(mode);
  }

  private apply(mode: ThemeMode, persistMode = true): void {
    const shouldBeDark = mode === 'dark' || (mode === 'system' && this.systemDark());
    document.documentElement.setAttribute('data-theme', shouldBeDark ? 'dark' : 'light');

    if (persistMode) {
      this.mode.set(mode);
    }
  }
}
