import { TestBed } from '@angular/core/testing';
import { NoticeCardComponent } from './notice-card.component';
import type { Notice } from '../../../core/services/notice.service';

const baseNotice: Notice = {
  id: 'notice-1',
  title: 'Test Notice',
  content: 'This is the content',
  priority: 'high',
  created_by: 'user-1',
  is_active: true,
  created_at: '2026-06-30T10:00:00Z',
  updated_at: '2026-06-30T10:00:00Z',
};

describe('NoticeCardComponent', () => {
  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [NoticeCardComponent],
    }).compileComponents();
  });

  function createComponent(notice: Notice) {
    const fixture = TestBed.createComponent(NoticeCardComponent);
    fixture.componentRef.setInput('notice', notice);
    fixture.detectChanges();
    return fixture;
  }

  it('should create and render title, content and formatted date', () => {
    const fixture = createComponent(baseNotice);
    expect(fixture.componentInstance).toBeTruthy();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Test Notice');
    expect(element.textContent).toContain('This is the content');
    expect(element.textContent).toContain('30/06/2026');
  });

  it('should show alert icon and apply notice-high class for high priority', () => {
    const fixture = createComponent({ ...baseNotice, priority: 'high' });
    const icon = fixture.nativeElement.querySelector('ion-icon[name="alert-circle"]');
    expect(icon).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.notice-high')).toBeTruthy();
  });

  it('should hide alert icon and not apply notice-high class for low priority', () => {
    const fixture = createComponent({ ...baseNotice, priority: 'low' });
    const icon = fixture.nativeElement.querySelector('ion-icon[name="alert-circle"]');
    expect(icon).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.notice-high')).toBeFalsy();
  });

  it('should compute priority label and badge color for low', () => {
    const fixture = createComponent({ ...baseNotice, priority: 'low' });
    expect(fixture.componentInstance.priorityLabel).toBe('Baja');
    expect(fixture.componentInstance.badgeColor).toBe('success');
  });

  it('should compute priority label and badge color for medium', () => {
    const fixture = createComponent({ ...baseNotice, priority: 'medium' });
    expect(fixture.componentInstance.priorityLabel).toBe('Media');
    expect(fixture.componentInstance.badgeColor).toBe('warning');
  });

  it('should compute priority label and badge color for high', () => {
    const fixture = createComponent({ ...baseNotice, priority: 'high' });
    expect(fixture.componentInstance.priorityLabel).toBe('Alta');
    expect(fixture.componentInstance.badgeColor).toBe('danger');
  });

  it('should fallback to raw priority for unknown values', () => {
    const fixture = createComponent({ ...baseNotice, priority: 'custom' } as unknown as Notice);
    expect(fixture.componentInstance.priorityLabel).toBe('custom');
    expect(fixture.componentInstance.badgeColor).toBe('medium');
  });

  it('should update rendered output when input changes', () => {
    const fixture = createComponent(baseNotice);
    fixture.componentRef.setInput('notice', {
      ...baseNotice,
      title: 'Updated title',
      priority: 'low',
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Updated title');
    expect(element.textContent).toContain('Baja');
    expect(element.querySelector('ion-icon[name="alert-circle"]')).toBeFalsy();
  });
});
