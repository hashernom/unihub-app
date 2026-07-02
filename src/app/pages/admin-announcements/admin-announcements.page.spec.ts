import { TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { vi } from 'vitest';
import { AdminAnnouncementsPage } from './admin-announcements.page';
import { AnnouncementService, type Announcement } from '../../core/services/announcement.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { Router } from '@angular/router';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import { createRouterMock } from '../../../testing/mock-factories';

const mockAnnouncements: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Bienvenida',
    body: 'Cuerpo del anuncio',
    category: 'general',
    is_pinned: false,
    created_by: null,
    expires_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'ann-2',
    title: 'Urgente',
    body: 'Importante',
    category: 'urgent',
    is_pinned: true,
    created_by: null,
    expires_at: '2025-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('AdminAnnouncementsPage', () => {
  let component: AdminAnnouncementsPage;
  let fixture: ReturnType<typeof TestBed.createComponent<AdminAnnouncementsPage>>;
  let announcementMock: {
    getAllAnnouncements: ReturnType<typeof vi.fn>;
    togglePin: ReturnType<typeof vi.fn>;
    deleteAnnouncement: ReturnType<typeof vi.fn>;
  };
  let errorHandlerMock: { handleHttpError: ReturnType<typeof vi.fn> };
  let routerMock: Router;

  beforeEach(async () => {
    announcementMock = {
      getAllAnnouncements: vi.fn().mockResolvedValue(mockAnnouncements),
      togglePin: vi.fn().mockResolvedValue(undefined),
      deleteAnnouncement: vi.fn().mockResolvedValue(undefined),
    };
    errorHandlerMock = { handleHttpError: vi.fn() };
    routerMock = createRouterMock();

    TestBed.configureTestingModule({
      providers: [
        { provide: AnnouncementService, useValue: announcementMock },
        { provide: ErrorHandlerService, useValue: errorHandlerMock },
        { provide: Router, useValue: routerMock },
      ],
    });
    TestBed.overrideComponent(AdminAnnouncementsPage, {
      set: {
        imports: [DatePipe, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(AdminAnnouncementsPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load announcements when entering the view', async () => {
    component.ionViewWillEnter();
    await vi.waitFor(() => !component.loading);
    expect(announcementMock.getAllAnnouncements).toHaveBeenCalled();
    expect(component.announcements.length).toBe(2);
    expect(component.announcements[0].id).toBe('ann-1');
    expect(component.error).toBeNull();
  });

  it('should handle load errors via error handler', async () => {
    const err = new Error('network error');
    announcementMock.getAllAnnouncements.mockRejectedValue(err);
    component.ionViewWillEnter();
    await vi.waitFor(() => !component.loading);
    expect(component.announcements).toEqual([]);
    expect(component.error).toBe(err);
    expect(errorHandlerMock.handleHttpError).toHaveBeenCalledWith(err, expect.any(Function));
  });

  it('should toggle pin status', async () => {
    component.ionViewWillEnter();
    await vi.waitFor(() => !component.loading);
    const target = component.announcements[0];
    await component.togglePin(target);
    expect(announcementMock.togglePin).toHaveBeenCalledWith('ann-1', true);
    expect(target.is_pinned).toBe(true);
  });

  it('should confirm and delete an announcement', async () => {
    component.ionViewWillEnter();
    await vi.waitFor(() => !component.loading);
    const target = component.announcements[0];
    component.confirmDelete(target);
    expect(component.deleteTarget).toBe(target);
    expect(component.showDeleteAlert).toBe(true);

    await component.onDeleteConfirm();
    expect(announcementMock.deleteAnnouncement).toHaveBeenCalledWith('ann-1');
    expect(component.announcements.some((a) => a.id === 'ann-1')).toBe(false);
    expect(component.deleteTarget).toBeNull();
  });

  it('should identify expired announcements', () => {
    const expired = mockAnnouncements[1];
    const active = mockAnnouncements[0];
    expect(component.isExpired(expired)).toBe(true);
    expect(component.isExpired(active)).toBe(false);
  });
});
