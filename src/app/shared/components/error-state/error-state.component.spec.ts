import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ErrorStateComponent } from './error-state.component';

describe('ErrorStateComponent', () => {
  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ErrorStateComponent],
    }).compileComponents();
  });

  function createFixture() {
    return TestBed.createComponent(ErrorStateComponent);
  }

  it('should create with defaults', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.icon()).toBe('warning-outline');
    expect(fixture.componentInstance.message()).toBe('No se pudieron cargar los datos.');
    expect(fixture.componentInstance.retryText()).toBe('Reintentar');
  });

  it('should render default message and retry text', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('No se pudieron cargar los datos.');
    expect(element.textContent).toContain('Reintentar');
  });

  it('should render custom message and retry text', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('message', 'Network error');
    fixture.componentRef.setInput('retryText', 'Try again');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Network error');
    expect(element.textContent).toContain('Try again');
  });

  it('should not render message paragraph when message is empty', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('message', '');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.error-state-subtext')).toBeFalsy();
  });

  it('should emit retry event when retry button clicked', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    const retrySpy = vi.spyOn(fixture.componentInstance.retry, 'emit');
    const button = fixture.nativeElement.querySelector('ion-button');
    button?.click();
    expect(retrySpy).toHaveBeenCalled();
  });

  it('should render retry button with custom text', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('retryText', 'Try again');
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('ion-button');
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('Try again');
  });

  it('should render custom icon', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('icon', 'alert-circle');
    fixture.detectChanges();
    expect(fixture.componentInstance.icon()).toBe('alert-circle');
  });
});
