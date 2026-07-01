import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ErrorStateComponent } from './error-state.component';
import { IONIC_STUBS } from '../../../../testing/ionic-stubs';

describe('ErrorStateComponent', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({});
    TestBed.overrideComponent(ErrorStateComponent, {
      set: {
        imports: [...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();
  });

  it('should create with defaults', () => {
    const fixture = TestBed.createComponent(ErrorStateComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.icon()).toBe('warning-outline');
    expect(fixture.componentInstance.retryText()).toBe('Reintentar');
  });

  it('should render custom message and retry text', () => {
    const fixture = TestBed.createComponent(ErrorStateComponent);
    fixture.componentRef.setInput('message', 'Network error');
    fixture.componentRef.setInput('retryText', 'Try again');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Network error');
    expect(element.textContent).toContain('Try again');
  });

  it('should emit retry event when retry button clicked', () => {
    const fixture = TestBed.createComponent(ErrorStateComponent);
    fixture.detectChanges();
    const retrySpy = vi.spyOn(fixture.componentInstance.retry, 'emit');
    const button = fixture.nativeElement.querySelector('ion-button');
    button?.click();
    expect(retrySpy).toHaveBeenCalled();
  });
});
