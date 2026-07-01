import { TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { AnnouncementCardComponent } from './announcement-card.component';
import { IONIC_STUBS } from '../../../../testing/ionic-stubs';
import type { Announcement } from '../../../core/services/announcement.service';

const mockAnnouncement: Announcement = {
  id: 'ann-1',
  title: 'Test Announcement',
  body: 'This is the body',
  category: 'academic',
  is_pinned: true,
  created_by: 'user-1',
  expires_at: null,
  created_at: '2026-06-30T10:00:00Z',
  updated_at: '2026-06-30T10:00:00Z',
};

describe('AnnouncementCardComponent', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({});
    TestBed.overrideComponent(AnnouncementCardComponent, {
      set: {
        imports: [DatePipe, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AnnouncementCardComponent);
    fixture.componentInstance.announcement = mockAnnouncement;
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render title and body', () => {
    const fixture = TestBed.createComponent(AnnouncementCardComponent);
    fixture.componentInstance.announcement = mockAnnouncement;
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Test Announcement');
    expect(element.textContent).toContain('This is the body');
  });

  it('should show pinned icon when pinned', () => {
    const fixture = TestBed.createComponent(AnnouncementCardComponent);
    fixture.componentInstance.announcement = mockAnnouncement;
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('ion-icon[name="pin"]');
    expect(icon).toBeTruthy();
  });

  it('should hide pinned icon when not pinned', () => {
    const fixture = TestBed.createComponent(AnnouncementCardComponent);
    fixture.componentInstance.announcement = { ...mockAnnouncement, is_pinned: false };
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('ion-icon[name="pin"]');
    expect(icon).toBeFalsy();
  });

  it('should compute category label and badge color', () => {
    const fixture = TestBed.createComponent(AnnouncementCardComponent);
    fixture.componentInstance.announcement = mockAnnouncement;
    expect(fixture.componentInstance.categoryLabel).toBe('Académico');
    expect(fixture.componentInstance.badgeColor).toBe('primary');
  });

  it('should fallback to raw category for unknown values', () => {
    const fixture = TestBed.createComponent(AnnouncementCardComponent);
    fixture.componentInstance.announcement = { ...mockAnnouncement, category: 'custom' } as unknown as Announcement;
    expect(fixture.componentInstance.categoryLabel).toBe('custom');
    expect(fixture.componentInstance.badgeColor).toBe('medium');
  });
});
