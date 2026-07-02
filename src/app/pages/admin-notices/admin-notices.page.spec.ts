import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { vi } from 'vitest';
import { AdminNoticesPage } from './admin-notices.page';
import { NoticeService, type Notice } from '../../core/services/notice.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import { createRouterMock } from '../../../testing/mock-factories';

const mockNotices: Notice[] = [
  {
    id: 'notice-1',
    title: 'Aviso 1',
    content: 'Contenido del aviso 1',
    priority: 'high',
    created_by: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'notice-2',
    title: 'Aviso 2',
    content: 'Contenido del aviso 2',
    priority: 'low',
    created_by: null,
    is_active: false,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
];

describe('AdminNoticesPage', () => {
  let component: AdminNoticesPage;
  let fixture: ReturnType<typeof TestBed.createComponent<AdminNoticesPage>>;
  let noticeMock: {
    getAllNotices: ReturnType<typeof vi.fn>;
    toggleActive: ReturnType<typeof vi.fn>;
    deleteNotice: ReturnType<typeof vi.fn>;
  };
  let errorHandlerMock: { handleHttpError: ReturnType<typeof vi.fn> };
  let routerMock: Router;

  beforeEach(async () => {
    noticeMock = {
      getAllNotices: vi.fn().mockResolvedValue(mockNotices),
      toggleActive: vi.fn().mockResolvedValue(undefined),
      deleteNotice: vi.fn().mockResolvedValue(undefined),
    };
    errorHandlerMock = { handleHttpError: vi.fn() };
    routerMock = createRouterMock();

    TestBed.configureTestingModule({
      providers: [
        { provide: NoticeService, useValue: noticeMock },
        { provide: ErrorHandlerService, useValue: errorHandlerMock },
        { provide: Router, useValue: routerMock },
      ],
    });
    TestBed.overrideComponent(AdminNoticesPage, {
      set: {
        imports: [DatePipe, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(AdminNoticesPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load notices when entering the view', async () => {
    component.ionViewWillEnter();
    await vi.waitFor(() => !component.loading);
    expect(noticeMock.getAllNotices).toHaveBeenCalled();
    expect(component.notices.length).toBe(2);
    expect(component.notices[0].id).toBe('notice-1');
    expect(component.error).toBeNull();
  });

  it('should handle load errors via error handler', async () => {
    const err = new Error('network error');
    noticeMock.getAllNotices.mockRejectedValue(err);
    component.ionViewWillEnter();
    await vi.waitFor(() => !component.loading);
    expect(component.notices).toEqual([]);
    expect(component.error).toBe(err);
    expect(errorHandlerMock.handleHttpError).toHaveBeenCalledWith(err, expect.any(Function));
  });

  it('should toggle active status', async () => {
    component.ionViewWillEnter();
    await vi.waitFor(() => !component.loading);
    const target = component.notices[0];
    expect(target.is_active).toBe(true);
    await component.toggleActive(target);
    expect(noticeMock.toggleActive).toHaveBeenCalledWith('notice-1', false);
    expect(target.is_active).toBe(false);
  });

  it('should confirm and delete a notice', async () => {
    component.ionViewWillEnter();
    await vi.waitFor(() => !component.loading);
    const target = component.notices[0];
    component.confirmDelete(target);
    expect(component.deleteTarget).toBe(target);
    expect(component.showDeleteAlert).toBe(true);

    await component.onDeleteConfirm();
    expect(noticeMock.deleteNotice).toHaveBeenCalledWith('notice-1');
    expect(component.notices.some((n) => n.id === 'notice-1')).toBe(false);
    expect(component.deleteTarget).toBeNull();
  });

  it('should return badge color and priority label', () => {
    expect(component.badgeColor('high')).toBe('danger');
    expect(component.badgeColor('low')).toBe('success');
    expect(component.badgeColor('unknown')).toBe('medium');
    expect(component.priorityLabel('medium')).toBe('Media');
    expect(component.priorityLabel('unknown')).toBe('unknown');
  });
});
