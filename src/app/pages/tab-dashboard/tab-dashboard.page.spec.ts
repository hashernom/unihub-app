import { TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { RouterLink, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, type Observable, map, of } from 'rxjs';
import { vi } from 'vitest';
import { TabDashboardPage } from './tab-dashboard.page';
import { AuthService, type AuthUser } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { AnnouncementService, type Announcement } from '../../core/services/announcement.service';
import { NoticeService, type Notice } from '../../core/services/notice.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { SurveyService } from '../../core/services/survey.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import { createSupabaseServiceMock } from '../../../testing/mock-factories';

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'test@uni.edu',
  profile: {
    id: 'user-1',
    student_code: 'U001',
    full_name: 'Test User',
    role: 'student',
    avatar_url: null,
    carrera: 'Ingeniería',
    semestre: '5',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
};

const mockAnnouncements: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Exámenes finales',
    body: 'Calendario de exámenes publicado',
    category: 'academic',
    is_pinned: false,
    created_by: null,
    expires_at: null,
    created_at: '2026-06-30T00:00:00Z',
    updated_at: '2026-06-30T00:00:00Z',
  },
  {
    id: 'ann-2',
    title: 'Mantenimiento',
    body: 'El sistema estará fuera de servicio',
    category: 'urgent',
    is_pinned: true,
    created_by: null,
    expires_at: null,
    created_at: '2026-06-29T00:00:00Z',
    updated_at: '2026-06-29T00:00:00Z',
  },
];

const mockNotices: Notice[] = [
  {
    id: 'notice-1',
    title: 'Aviso importante',
    content: 'Recordatorio de pago',
    priority: 'high',
    created_by: null,
    is_active: true,
    created_at: '2026-06-30T00:00:00Z',
    updated_at: '2026-06-30T00:00:00Z',
  },
];

const mockEvents = [
  { id: 'event-1', title: 'Charla de bienvenida', start_time: '2026-07-01T10:00:00Z', event_type: 'event' },
  { id: 'event-2', title: 'Taller', start_time: '2026-07-02T10:00:00Z', event_type: 'class' },
];

describe('TabDashboardPage', () => {
  let component: TabDashboardPage;
  let fixture: ReturnType<typeof TestBed.createComponent<TabDashboardPage>>;
  let router: Router;
  let currentUserSubject: BehaviorSubject<AuthUser | null>;
  let authMock: {
    currentUser$: BehaviorSubject<AuthUser | null>;
    isAdmin$: Observable<boolean>;
  };
  let supabaseMock: SupabaseService;
  let announcementMock: { getAnnouncements: ReturnType<typeof vi.fn> };
  let noticeMock: { getNotices: ReturnType<typeof vi.fn> };
  let realtimeMock: {
    subscribe: ReturnType<typeof vi.fn>;
    onChanges: ReturnType<typeof vi.fn>;
  };
  let surveyMock: { getPendingSurveyCount: ReturnType<typeof vi.fn> };
  let errorHandlerMock: { handleHttpError: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
    authMock = {
      currentUser$: currentUserSubject,
      isAdmin$: currentUserSubject.pipe(map((u) => u?.profile.role === 'admin')),
    };
    supabaseMock = createSupabaseServiceMock();
    const eventsQueryMock = {
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockEvents }),
    };
    supabaseMock.client.from = vi.fn().mockReturnValue(eventsQueryMock);

    announcementMock = { getAnnouncements: vi.fn() };
    noticeMock = { getNotices: vi.fn() };
    realtimeMock = {
      subscribe: vi.fn(),
      onChanges: vi.fn().mockReturnValue(of()),
    };
    surveyMock = { getPendingSurveyCount: vi.fn().mockImplementation(async () => 2) };
    errorHandlerMock = { handleHttpError: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: ErrorHandlerService, useValue: errorHandlerMock },
        { provide: AnnouncementService, useValue: announcementMock },
        { provide: NoticeService, useValue: noticeMock },
        { provide: RealtimeService, useValue: realtimeMock },
        { provide: SurveyService, useValue: surveyMock },
        provideRouter([]),
      ],
    });
    TestBed.overrideComponent(TabDashboardPage, {
      set: {
        imports: [DatePipe, RouterLink, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(TabDashboardPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load all data on init', async () => {
    announcementMock.getAnnouncements.mockResolvedValue({ data: mockAnnouncements, count: mockAnnouncements.length });
    noticeMock.getNotices.mockResolvedValue({ data: mockNotices, count: mockNotices.length });
    currentUserSubject.next(mockUser);

    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);
    await fixture.whenStable();

    expect(component.announcements).toEqual(mockAnnouncements);
    expect(component.notices).toEqual(mockNotices);
    expect(component.events).toEqual(mockEvents);
    expect(surveyMock.getPendingSurveyCount).toHaveBeenCalledWith(mockUser.id);
    expect(component.error).toBe(false);
    expect(component.surveyCount).toBe(2);
    expect(realtimeMock.subscribe).toHaveBeenCalledWith('announcements');
    expect(realtimeMock.subscribe).toHaveBeenCalledWith('notices');
    expect(realtimeMock.onChanges).toHaveBeenCalledWith('announcements');
    expect(realtimeMock.onChanges).toHaveBeenCalledWith('notices');
  });

  it('should not redirect non-admin users on ionViewWillEnter', async () => {
    currentUserSubject.next(mockUser);
    const navigateSpy = vi.spyOn(router, 'navigate');

    await component.ionViewWillEnter();

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should unsubscribe from realtime on destroy', () => {
    const unsubscribeSpy = vi.fn();
    realtimeMock.onChanges.mockReturnValue({ subscribe: () => ({ unsubscribe: unsubscribeSpy }) } as unknown as ReturnType<typeof of>);
    fixture.detectChanges();
    component.ngOnDestroy();
    expect(unsubscribeSpy).toHaveBeenCalled();
  });

  it('should handle realtime subscription failure gracefully', () => {
    realtimeMock.subscribe.mockImplementation(() => {
      throw new Error('realtime fail');
    });
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('should refresh data on doRefresh', async () => {
    announcementMock.getAnnouncements.mockResolvedValue({ data: mockAnnouncements, count: mockAnnouncements.length });
    noticeMock.getNotices.mockResolvedValue({ data: mockNotices, count: mockNotices.length });

    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    const refresher = { complete: vi.fn() } as unknown as HTMLIonRefresherElement;
    await component.doRefresh({ target: refresher } as unknown as CustomEvent);

    expect(announcementMock.getAnnouncements).toHaveBeenCalledTimes(2);
    expect(noticeMock.getNotices).toHaveBeenCalledTimes(2);
    expect(refresher.complete).toHaveBeenCalled();
  });

  it('should filter announcements by category', async () => {
    announcementMock.getAnnouncements.mockResolvedValue({ data: mockAnnouncements, count: mockAnnouncements.length });
    noticeMock.getNotices.mockResolvedValue({ data: mockNotices, count: mockNotices.length });

    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    component.filterByCategory('academic');

    expect(component.activeCategory).toBe('academic');
    expect(component.filteredAnnouncements).toHaveLength(1);
    expect(component.filteredAnnouncements[0].id).toBe('ann-1');
  });

  it('should filter announcements by search query', async () => {
    announcementMock.getAnnouncements.mockResolvedValue({ data: mockAnnouncements, count: mockAnnouncements.length });
    noticeMock.getNotices.mockResolvedValue({ data: mockNotices, count: mockNotices.length });

    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    component.searchQuery = 'mantenimiento';

    expect(component.filteredAnnouncements).toHaveLength(1);
    expect(component.filteredAnnouncements[0].id).toBe('ann-2');
  });

  it('should filter announcements by category and search query together', async () => {
    announcementMock.getAnnouncements.mockResolvedValue({ data: mockAnnouncements, count: mockAnnouncements.length });
    noticeMock.getNotices.mockResolvedValue({ data: mockNotices, count: mockNotices.length });

    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    component.filterByCategory('urgent');
    component.searchQuery = 'servicio';

    expect(component.filteredAnnouncements).toHaveLength(1);
    expect(component.filteredAnnouncements[0].id).toBe('ann-2');
  });

  it('should debounce search input', async () => {
    announcementMock.getAnnouncements.mockResolvedValue({ data: mockAnnouncements, count: mockAnnouncements.length });
    noticeMock.getNotices.mockResolvedValue({ data: mockNotices, count: mockNotices.length });

    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    vi.useFakeTimers({ shouldAdvanceTime: true });
    const input = document.createElement('ion-searchbar') as unknown as HTMLIonSearchbarElement;
    input.value = 'mantenimiento';
    component.onSearchInput({ target: input } as unknown as Event);

    expect(component.searchQuery).toBe('');
    vi.advanceTimersByTime(400);
    expect(component.searchQuery).toBe('mantenimiento');
    expect(component.filteredAnnouncements).toHaveLength(1);
    expect(component.filteredAnnouncements[0].id).toBe('ann-2');
    vi.useRealTimers();
  });

  it('should set survey count to 0 when user is not logged in', async () => {
    announcementMock.getAnnouncements.mockResolvedValue({ data: [], count: 0 });
    noticeMock.getNotices.mockResolvedValue({ data: [], count: 0 });

    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    expect(surveyMock.getPendingSurveyCount).not.toHaveBeenCalled();
    expect(component.surveyCount).toBe(0);
  });

  it('should handle survey count load error', async () => {
    announcementMock.getAnnouncements.mockResolvedValue({ data: [], count: 0 });
    noticeMock.getNotices.mockResolvedValue({ data: [], count: 0 });
    surveyMock.getPendingSurveyCount.mockRejectedValue(new Error('survey error'));
    currentUserSubject.next(mockUser);

    await component.loadAll();

    expect(component.error).toBe(true);
    expect(component.surveyCount).toBe(0);
  });

  it('should set error when notice loading fails', async () => {
    announcementMock.getAnnouncements.mockResolvedValue({ data: mockAnnouncements, count: mockAnnouncements.length });
    noticeMock.getNotices.mockRejectedValue(new Error('notice error'));

    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    expect(component.error).toBe(true);
    expect(errorHandlerMock.handleHttpError).toHaveBeenCalled();
  });

  it('should set error when events loading fails', async () => {
    announcementMock.getAnnouncements.mockResolvedValue({ data: [], count: 0 });
    noticeMock.getNotices.mockResolvedValue({ data: [], count: 0 });
    const eventsQueryMock = {
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(new Error('events error')),
    };
    supabaseMock.client.from = vi.fn().mockReturnValue(eventsQueryMock);

    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    expect(component.error).toBe(true);
    expect(component.events).toEqual([]);
    expect(errorHandlerMock.handleHttpError).toHaveBeenCalled();
  });

  it('should redirect admin users on ionViewWillEnter', async () => {
    const adminUser: AuthUser = {
      ...mockUser,
      profile: { ...mockUser.profile, role: 'admin' },
    };
    currentUserSubject.next(adminUser);
    const navigateSpy = vi.spyOn(router, 'navigate');

    await component.ionViewWillEnter();

    expect(navigateSpy).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('should set error when loading fails', async () => {
    announcementMock.getAnnouncements.mockRejectedValue(new Error('Network error'));
    noticeMock.getNotices.mockResolvedValue({ data: mockNotices, count: mockNotices.length });

    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    expect(component.error).toBe(true);
    expect(errorHandlerMock.handleHttpError).toHaveBeenCalled();
  });
});
