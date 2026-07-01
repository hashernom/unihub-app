import { TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { NoticeCardComponent } from './notice-card.component';
import { IONIC_STUBS } from '../../../../testing/ionic-stubs';
import type { Notice } from '../../../core/services/notice.service';

const mockNotice: Notice = {
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
    TestBed.configureTestingModule({});
    TestBed.overrideComponent(NoticeCardComponent, {
      set: {
        imports: [DatePipe, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(NoticeCardComponent);
    fixture.componentInstance.notice = mockNotice;
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render title and content', () => {
    const fixture = TestBed.createComponent(NoticeCardComponent);
    fixture.componentInstance.notice = mockNotice;
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Test Notice');
    expect(element.textContent).toContain('This is the content');
  });

  it('should show alert icon for high priority', () => {
    const fixture = TestBed.createComponent(NoticeCardComponent);
    fixture.componentInstance.notice = mockNotice;
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('ion-icon[name="alert-circle"]');
    expect(icon).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.notice-high')).toBeTruthy();
  });

  it('should hide alert icon for low priority', () => {
    const fixture = TestBed.createComponent(NoticeCardComponent);
    fixture.componentInstance.notice = { ...mockNotice, priority: 'low' };
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('ion-icon[name="alert-circle"]');
    expect(icon).toBeFalsy();
  });

  it('should compute priority label and badge color', () => {
    const fixture = TestBed.createComponent(NoticeCardComponent);
    fixture.componentInstance.notice = { ...mockNotice, priority: 'medium' };
    expect(fixture.componentInstance.priorityLabel).toBe('Media');
    expect(fixture.componentInstance.badgeColor).toBe('warning');
  });
});
