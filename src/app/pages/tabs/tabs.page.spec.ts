import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import type { Observable } from 'rxjs';
import { vi } from 'vitest';
import { TabsPage } from './tabs.page';
import { AuthService, type AuthUser } from '../../core/services/auth.service';
import { SurveyService } from '../../core/services/survey.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'test@example.com',
  profile: {
    id: 'user-1',
    student_code: 'U20231001',
    full_name: 'Test Student',
    role: 'student',
    avatar_url: null,
    carrera: 'Ingeniería',
    semestre: '5',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
};

describe('TabsPage', () => {
  let component: TabsPage;
  let fixture: ReturnType<typeof TestBed.createComponent<TabsPage>>;
  let authMock: { currentUser$: BehaviorSubject<AuthUser | null>; isAdmin$: Observable<boolean> };
  let surveyMock: { getPendingSurveyCount: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authMock = {
      currentUser$: new BehaviorSubject<AuthUser | null>(mockUser),
      isAdmin$: of(false),
    };
    surveyMock = {
      getPendingSurveyCount: vi.fn().mockResolvedValue(3),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: SurveyService, useValue: surveyMock },
      ],
    });
    TestBed.overrideComponent(TabsPage, {
      set: {
        imports: [...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(TabsPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load pending survey count on init', async () => {
    fixture.detectChanges();
    await vi.waitUntil(() => component.pendingSurveyCount === 3);

    expect(surveyMock.getPendingSurveyCount).toHaveBeenCalledWith(mockUser.id);
    expect(component.pendingSurveyCount).toBe(3);
  });

  it('should render the pending count badge', async () => {
    fixture.detectChanges();
    await vi.waitUntil(() => component.pendingSurveyCount === 3);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('ion-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('3');
  });

  it('should reset pending count to 0 when user is not authenticated', async () => {
    authMock.currentUser$.next(null);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(surveyMock.getPendingSurveyCount).not.toHaveBeenCalled();
    expect(component.pendingSurveyCount).toBe(0);
  });

  it('should update pending count when user action reloads it', async () => {
    fixture.detectChanges();
    await vi.waitUntil(() => component.pendingSurveyCount === 3);

    surveyMock.getPendingSurveyCount.mockResolvedValue(5);
    await component.loadPendingCount();

    expect(surveyMock.getPendingSurveyCount).toHaveBeenCalledTimes(2);
    expect(component.pendingSurveyCount).toBe(5);
  });
});
