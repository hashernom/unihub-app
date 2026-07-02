import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    }).compileComponents();
  });

  function createFixture() {
    return TestBed.createComponent(EmptyStateComponent);
  }

  it('should create with defaults', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.icon()).toBe('help-circle');
    expect(fixture.componentInstance.title()).toBe('No hay nada aquí');
    expect(fixture.componentInstance.message()).toBe('');
    expect(fixture.componentInstance.actionText()).toBe('');
    expect(fixture.componentInstance.variant()).toBe('default');
  });

  it('should render default icon and title', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('No hay nada aquí');
  });

  it('should render custom icon, title and message', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('icon', 'calendar-outline');
    fixture.componentRef.setInput('title', 'No events');
    fixture.componentRef.setInput('message', 'Try another date');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('No events');
    expect(element.textContent).toContain('Try another date');
    expect(fixture.componentInstance.icon()).toBe('calendar-outline');
  });

  it('should not render message paragraph when message is empty', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('message', '');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.empty-state-subtext')).toBeFalsy();
  });

  it('should apply default variant class', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.empty-state-compact')).toBeFalsy();
    expect(element.querySelector('.empty-state-error')).toBeFalsy();
  });

  it('should apply compact variant class', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('variant', 'compact');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state-compact')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.empty-state-error')).toBeFalsy();
  });

  it('should apply error variant class', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('variant', 'error');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state-error')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.empty-state-compact')).toBeFalsy();
  });

  it('should emit action when action button clicked', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('actionText', 'Retry');
    fixture.detectChanges();
    const actionSpy = vi.spyOn(fixture.componentInstance.action, 'emit');
    const button = fixture.nativeElement.querySelector('ion-button');
    button?.click();
    expect(actionSpy).toHaveBeenCalled();
  });

  it('should show action button when action text is provided', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('actionText', 'Retry');
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('ion-button');
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('Retry');
  });

  it('should hide action button when no action text', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('ion-button');
    expect(button).toBeFalsy();
  });
});
