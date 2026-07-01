import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { EmptyStateComponent } from './empty-state.component';
import { IONIC_STUBS } from '../../../../testing/ionic-stubs';

describe('EmptyStateComponent', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({});
    TestBed.overrideComponent(EmptyStateComponent, {
      set: {
        imports: [...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();
  });

  it('should create with defaults', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.icon()).toBe('help-circle');
    expect(fixture.componentInstance.title()).toBe('No hay nada aquí');
  });

  it('should render custom icon, title and message', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('icon', 'calendar-outline');
    fixture.componentRef.setInput('title', 'No events');
    fixture.componentRef.setInput('message', 'Try another date');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('No events');
    expect(element.textContent).toContain('Try another date');
    expect(fixture.componentInstance.icon()).toBe('calendar-outline');
  });

  it('should apply variant classes', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('variant', 'compact');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state-compact')).toBeTruthy();
  });

  it('should emit action when action button clicked', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('actionText', 'Retry');
    fixture.detectChanges();
    const actionSpy = vi.spyOn(fixture.componentInstance.action, 'emit');
    const button = fixture.nativeElement.querySelector('ion-button');
    button?.click();
    expect(actionSpy).toHaveBeenCalled();
  });

  it('should hide action button when no action text', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('ion-button');
    expect(button).toBeFalsy();
  });
});
