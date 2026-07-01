/* eslint-disable @angular-eslint/component-selector */
import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  type TemplateRef,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { vi } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

@Component({
  selector: 'ion-header',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonHeaderStub {}

@Component({
  selector: 'ion-toolbar',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonToolbarStub {}

@Component({
  selector: 'ion-title',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonTitleStub {}

@Component({
  selector: 'ion-content',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonContentStub {
  @Input() color?: string;
  @Input() fullscreen = false;
}

@Component({
  selector: 'ion-grid',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonGridStub {}

@Component({
  selector: 'ion-row',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonRowStub {}

@Component({
  selector: 'ion-col',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonColStub {
  @Input() size?: string;
  @Input() sizeSm?: string;
  @Input() sizeMd?: string;
  @Input() sizeLg?: string;
}

@Component({
  selector: 'ion-list',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonListStub {
  @Input() lines?: string;
}

@Component({
  selector: 'ion-list-header',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonListHeaderStub {}

@Component({
  selector: 'ion-item',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonItemStub {
  @Input() button = false;
  @Input() detail = false;
  @Input() lines?: string;
  @Input() routerLink?: string | unknown[];
  @Input() disabled = false;
  @Output() ionItemTap = new EventEmitter<Any>();
}

@Component({
  selector: 'ion-label',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonLabelStub {
  @Input() position?: string;
  @Input() color?: string;
}

@Component({
  selector: 'ion-note',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonNoteStub {}

@Component({
  selector: 'ion-card',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonCardStub {}

@Component({
  selector: 'ion-card-header',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonCardHeaderStub {}

@Component({
  selector: 'ion-card-title',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonCardTitleStub {}

@Component({
  selector: 'ion-card-subtitle',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonCardSubtitleStub {}

@Component({
  selector: 'ion-card-content',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonCardContentStub {}

@Component({
  selector: 'ion-input',
  template: '<ng-content></ng-content>',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IonInputStub),
      multi: true,
    },
  ],
})
export class IonInputStub implements ControlValueAccessor {
  @Input() value: string | number | null = '';
  @Input() type = 'text';
  @Input() label?: string;
  @Input() placeholder?: string;
  @Input() errorText?: string;
  @Input() helperText?: string;
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() required = false;
  @Input() name?: string;
  @Input() email = false;
  @Input() password = false;
  @Input() minlength?: number;
  @Input() maxlength?: number;
  @Input() autocomplete?: string;
  @Output() ionInput = new EventEmitter<Any>();
  @Output() ionChange = new EventEmitter<Any>();
  @Output() ionBlur = new EventEmitter<Any>();
  @Output() ionFocus = new EventEmitter<Any>();

  private onChange: (value: string | number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | number | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string | number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}

@Component({
  selector: 'ion-textarea',
  template: '<ng-content></ng-content>',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IonTextareaStub),
      multi: true,
    },
  ],
})
export class IonTextareaStub implements ControlValueAccessor {
  @Input() value = '';
  @Input() placeholder?: string;
  @Input() label?: string;
  @Input() rows = 3;
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() required = false;
  @Output() ionInput = new EventEmitter<Any>();
  @Output() ionChange = new EventEmitter<Any>();
  @Output() ionBlur = new EventEmitter<Any>();

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}

@Component({
  selector: 'ion-select',
  template: '<ng-content></ng-content>',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IonSelectStub),
      multi: true,
    },
  ],
})
export class IonSelectStub implements ControlValueAccessor {
  @Input() value: string | string[] | null = null;
  @Input() label?: string;
  @Input() placeholder?: string;
  @Input() multiple = false;
  @Input() disabled = false;
  @Input() interface?: string;
  @Output() ionChange = new EventEmitter<Any>();

  private onChange: (value: string | string[] | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | string[] | null): void {
    this.value = value;
  }

  registerOnChange(fn: (value: string | string[] | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}

@Component({
  selector: 'ion-select-option',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonSelectOptionStub {
  @Input() value?: string;
}

@Component({
  selector: 'ion-checkbox',
  template: '<ng-content></ng-content>',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IonCheckboxStub),
      multi: true,
    },
  ],
})
export class IonCheckboxStub implements ControlValueAccessor {
  @Input() checked = false;
  @Input() disabled = false;
  @Input() value?: string;
  @Output() ionChange = new EventEmitter<Any>();

  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: boolean): void {
    this.checked = value ?? false;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}

@Component({
  selector: 'ion-radio-group',
  template: '<ng-content></ng-content>',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IonRadioGroupStub),
      multi: true,
    },
  ],
})
export class IonRadioGroupStub implements ControlValueAccessor {
  @Input() value?: string;
  @Input() disabled = false;
  @Output() ionChange = new EventEmitter<Any>();

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string): void {
    this.value = value;
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}

@Component({
  selector: 'ion-radio',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonRadioStub {
  @Input() value?: string;
  @Input() disabled = false;
}

@Component({
  selector: 'ion-toggle',
  template: '<ng-content></ng-content>',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IonToggleStub),
      multi: true,
    },
  ],
})
export class IonToggleStub implements ControlValueAccessor {
  @Input() checked = false;
  @Input() disabled = false;
  @Input() label?: string;
  @Output() ionChange = new EventEmitter<Any>();

  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: boolean): void {
    this.checked = value ?? false;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}

@Component({
  selector: 'ion-segment',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonSegmentStub {
  @Input() value?: string;
  @Output() ionChange = new EventEmitter<Any>();
}

@Component({
  selector: 'ion-segment-button',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonSegmentButtonStub {
  @Input() value?: string;
}

@Component({
  selector: 'ion-button',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonButtonStub {
  @Input() expand?: 'block' | 'full';
  @Input() fill?: 'clear' | 'outline' | 'solid' | 'default';
  @Input() color?: string;
  @Input() disabled = false;
  @Input() type = 'button';
  @Input() routerLink?: string | unknown[];
  @Input() routerDirection?: string;
  @Output() ionButtonClick = new EventEmitter<Any>();
}

@Component({
  selector: 'ion-fab',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonFabStub {
  @Input() vertical?: string;
  @Input() horizontal?: string;
  @Input() slot?: string;
}

@Component({
  selector: 'ion-fab-button',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonFabButtonStub {
  @Input() disabled = false;
}

@Component({
  selector: 'ion-toast',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonToastStub {
  @Input() isOpen = false;
  @Input() message?: string;
  @Input() duration = 3000;
  @Input() color?: string;
  @Input() position?: 'top' | 'bottom' | 'middle';
  @Output() didDismiss = new EventEmitter<Any>();
}

@Component({
  selector: 'ion-spinner',
  template: '',
  standalone: true,
})
export class IonSpinnerStub {
  @Input() name?: string;
  @Input() color?: string;
}

@Component({
  selector: 'ion-badge',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonBadgeStub {
  @Input() color?: string;
}

@Component({
  selector: 'ion-progress-bar',
  template: '',
  standalone: true,
})
export class IonProgressBarStub {
  @Input() value = 0;
}

@Component({
  selector: 'ion-tabs',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonTabsStub {}

@Component({
  selector: 'ion-tab-bar',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonTabBarStub {
  @Input() slot?: string;
}

@Component({
  selector: 'ion-tab-button',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonTabButtonStub {
  @Input() tab?: string;
  @Input() routerLink?: string | unknown[];
}

@Component({
  selector: 'ion-icon',
  template: '',
  standalone: true,
})
export class IonIconStub {
  @Input() name?: string;
  @Input() icon?: string;
  @Input() color?: string;
  @Input() size?: string;
  @Input() ariaLabel?: string;
}

@Component({
  selector: 'ion-avatar',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonAvatarStub {}

@Component({
  selector: 'ion-chip',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonChipStub {
  @Input() color?: string;
  @Input() outline = false;
}

@Component({
  selector: 'ion-skeleton-text',
  template: '',
  standalone: true,
})
export class IonSkeletonTextStub {
  @Input() animated = true;
}

@Component({
  selector: 'ion-refresher',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonRefresherStub {
  @Output() ionRefresh = new EventEmitter<Any>();
}

@Component({
  selector: 'ion-refresher-content',
  template: '',
  standalone: true,
})
export class IonRefresherContentStub {}

@Component({
  selector: 'ion-searchbar',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonSearchbarStub {
  @Input() value = '';
  @Input() placeholder?: string;
  @Output() ionInput = new EventEmitter<Any>();
  @Output() ionChange = new EventEmitter<Any>();
}

@Component({
  selector: 'ion-modal',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonModalStub {
  @Input() isOpen = false;
  @Input() backdropDismiss = true;
  @Output() didDismiss = new EventEmitter<Any>();
}

@Component({
  selector: 'ion-buttons',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonButtonsStub {
  @Input() slot?: string;
}

@Component({
  selector: 'ion-back-button',
  template: '',
  standalone: true,
})
export class IonBackButtonStub {
  @Input() defaultHref?: string;
  @Input() icon?: string;
}

@Component({
  selector: 'ion-infinite-scroll',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonInfiniteScrollStub {
  @Output() ionInfinite = new EventEmitter<Any>();
}

@Component({
  selector: 'ion-infinite-scroll-content',
  template: '',
  standalone: true,
})
export class IonInfiniteScrollContentStub {}

@Component({
  selector: 'ion-datetime-button',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonDatetimeButtonStub {
  @Input() datetime?: string;
}

@Component({
  selector: 'ion-datetime',
  template: '',
  standalone: true,
})
export class IonDatetimeStub {
  @Input() value?: string;
  @Input() presentation?: string;
  @Output() ionChange = new EventEmitter<Any>();
}

@Component({
  selector: 'ion-ripple-effect',
  template: '',
  standalone: true,
})
export class IonRippleEffectStub {}

@Component({
  selector: 'ion-action-sheet',
  template: '',
  standalone: true,
})
export class IonActionSheetStub {
  @Input() isOpen = false;
  @Input() header?: string;
  @Input() buttons: unknown[] = [];
  @Output() didDismiss = new EventEmitter<Any>();
}

@Component({
  selector: 'ion-accordion',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonAccordionStub {
  @Input() value?: string;
}

@Component({
  selector: 'ion-accordion-group',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonAccordionGroupStub {
  @Input() value?: string | string[];
  @Output() ionChange = new EventEmitter<Any>();
}

@Component({
  selector: 'ion-popover',
  template: '<ng-content></ng-content>',
  standalone: true,
})
export class IonPopoverStub {
  @Input() isOpen = false;
  @Input() trigger?: string;
  @Output() didDismiss = new EventEmitter<Any>();
}

@Component({
  selector: 'ion-router-outlet',
  template: '',
  standalone: true,
})
export class IonRouterOutletStub {}

@Component({
  selector: 'app-skeleton-list',
  template: '',
  standalone: true,
})
export class AppSkeletonListStub {
  @Input() type = 'list';
  @Input() count = 3;
}

@Component({
  selector: 'app-error-state',
  template: '',
  standalone: true,
})
export class AppErrorStateStub {
  @Input() message?: string;
  @Output() retry = new EventEmitter<Any>();
}

@Component({
  selector: 'app-empty-state',
  template: '',
  standalone: true,
})
export class AppEmptyStateStub {
  @Input() icon?: string;
  @Input() title?: string;
  @Input() message?: string;
}

@Component({
  selector: 'app-announcement-card',
  template: '',
  standalone: true,
})
export class AppAnnouncementCardStub {
  @Input() announcement?: unknown;
}

@Component({
  selector: 'app-notice-card',
  template: '',
  standalone: true,
})
export class AppNoticeCardStub {
  @Input() notice?: unknown;
}

@Component({
  selector: 'full-calendar',
  template: '',
  standalone: true,
})
export class FullCalendarStub {
  @Input() options?: Any;
  getApi() {
    return {
      changeView: vi.fn(),
      today: vi.fn(),
      prev: vi.fn(),
      next: vi.fn(),
    };
  }
}

/** Aggregate array of all Ionic stub components. */
export const IONIC_STUBS = [
  IonHeaderStub,
  IonToolbarStub,
  IonTitleStub,
  IonContentStub,
  IonGridStub,
  IonRowStub,
  IonColStub,
  IonListStub,
  IonListHeaderStub,
  IonItemStub,
  IonLabelStub,
  IonNoteStub,
  IonCardStub,
  IonCardHeaderStub,
  IonCardTitleStub,
  IonCardSubtitleStub,
  IonCardContentStub,
  IonInputStub,
  IonTextareaStub,
  IonSelectStub,
  IonSelectOptionStub,
  IonCheckboxStub,
  IonRadioGroupStub,
  IonRadioStub,
  IonToggleStub,
  IonSegmentStub,
  IonSegmentButtonStub,
  IonButtonStub,
  IonFabStub,
  IonFabButtonStub,
  IonToastStub,
  IonSpinnerStub,
  IonBadgeStub,
  IonProgressBarStub,
  IonTabsStub,
  IonTabBarStub,
  IonTabButtonStub,
  IonIconStub,
  IonAvatarStub,
  IonChipStub,
  IonSkeletonTextStub,
  IonRefresherStub,
  IonRefresherContentStub,
  IonSearchbarStub,
  IonModalStub,
  IonButtonsStub,
  IonBackButtonStub,
  IonInfiniteScrollStub,
  IonInfiniteScrollContentStub,
  IonDatetimeButtonStub,
  IonDatetimeStub,
  IonRippleEffectStub,
  IonActionSheetStub,
  IonAccordionStub,
  IonAccordionGroupStub,
  IonPopoverStub,
  IonRouterOutletStub,
  AppSkeletonListStub,
  AppErrorStateStub,
  AppEmptyStateStub,
  AppAnnouncementCardStub,
  AppNoticeCardStub,
  FullCalendarStub,
];

/** Helper to declare an ion-backdrop or ion-router-link if needed. */
export const IONIC_TEMPLATES: TemplateRef<Any>[] = [];
