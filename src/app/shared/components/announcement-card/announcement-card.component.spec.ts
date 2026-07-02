import { TestBed } from '@angular/core/testing';
import { AnnouncementCardComponent } from './announcement-card.component';
import type { Announcement } from '../../../core/services/announcement.service';

const baseAnnouncement: Announcement = {
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
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AnnouncementCardComponent],
    }).compileComponents();
  });

  function createComponent(announcement: Announcement) {
    const fixture = TestBed.createComponent(AnnouncementCardComponent);
    fixture.componentRef.setInput('announcement', announcement);
    fixture.detectChanges();
    return fixture;
  }

  it('should create and render title, body and formatted date', () => {
    const fixture = createComponent(baseAnnouncement);
    expect(fixture.componentInstance).toBeTruthy();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Test Announcement');
    expect(element.textContent).toContain('This is the body');
    expect(element.textContent).toContain('30/06/2026');
  });

  it('should show pinned icon when announcement is pinned', () => {
    const fixture = createComponent({ ...baseAnnouncement, is_pinned: true });
    const icon = fixture.nativeElement.querySelector('ion-icon[name="pin"]');
    expect(icon).toBeTruthy();
    expect(icon?.classList.contains('hidden')).toBe(false);
  });

  it('should hide pinned icon when announcement is not pinned', () => {
    const fixture = createComponent({ ...baseAnnouncement, is_pinned: false });
    const icon = fixture.nativeElement.querySelector('ion-icon[name="pin"]');
    expect(icon).toBeTruthy();
    expect(icon?.classList.contains('hidden')).toBe(true);
  });

  it('should compute category label and badge color for general', () => {
    const fixture = createComponent({ ...baseAnnouncement, category: 'general' });
    expect(fixture.componentInstance.categoryLabel).toBe('General');
    expect(fixture.componentInstance.badgeColor).toBe('medium');
  });

  it('should compute category label and badge color for academic', () => {
    const fixture = createComponent({ ...baseAnnouncement, category: 'academic' });
    expect(fixture.componentInstance.categoryLabel).toBe('Académico');
    expect(fixture.componentInstance.badgeColor).toBe('primary');
  });

  it('should compute category label and badge color for event', () => {
    const fixture = createComponent({ ...baseAnnouncement, category: 'event' });
    expect(fixture.componentInstance.categoryLabel).toBe('Evento');
    expect(fixture.componentInstance.badgeColor).toBe('tertiary');
  });

  it('should compute category label and badge color for urgent', () => {
    const fixture = createComponent({ ...baseAnnouncement, category: 'urgent' });
    expect(fixture.componentInstance.categoryLabel).toBe('Urgente');
    expect(fixture.componentInstance.badgeColor).toBe('danger');
  });

  it('should fallback to raw category for unknown values', () => {
    const fixture = createComponent({ ...baseAnnouncement, category: 'custom' } as unknown as Announcement);
    expect(fixture.componentInstance.categoryLabel).toBe('custom');
    expect(fixture.componentInstance.badgeColor).toBe('medium');
  });

  it('should update rendered output when input changes', () => {
    const fixture = createComponent(baseAnnouncement);
    fixture.componentRef.setInput('announcement', {
      ...baseAnnouncement,
      title: 'Updated title',
      category: 'urgent',
      is_pinned: false,
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Updated title');
    expect(element.textContent).toContain('Urgente');
    expect(element.querySelector('ion-icon[name="pin"]')?.classList.contains('hidden')).toBe(true);
  });
});
