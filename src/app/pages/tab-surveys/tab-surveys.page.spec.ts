import { TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { TabSurveysPage } from './tab-surveys.page';
import { AuthService, type AuthUser } from '../../core/services/auth.service';
import { SurveyService, type SurveyWithStatus } from '../../core/services/survey.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import { createRouterMock } from '../../../testing/mock-factories';
import { Router } from '@angular/router';

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

const mockSurvey: SurveyWithStatus = {
  id: 'survey-1',
  title: 'Encuesta de satisfacción',
  description: 'Cuéntanos tu opinión',
  is_active: true,
  start_date: null,
  end_date: '2026-12-31T23:59:59Z',
  allow_multiple_responses: false,
  created_by: 'admin-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  responded: false,
};

describe('TabSurveysPage', () => {
  let component: TabSurveysPage;
  let fixture: ReturnType<typeof TestBed.createComponent<TabSurveysPage>>;
  let authMock: { currentUser$: BehaviorSubject<AuthUser | null> };
  let surveyMock: { getActiveSurveys: ReturnType<typeof vi.fn> };
  let errorHandlerMock: { handleHttpError: ReturnType<typeof vi.fn> };
  let routerMock: Router;

  beforeEach(async () => {
    authMock = { currentUser$: new BehaviorSubject<AuthUser | null>(mockUser) };
    surveyMock = { getActiveSurveys: vi.fn() };
    errorHandlerMock = { handleHttpError: vi.fn() };
    routerMock = createRouterMock();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: SurveyService, useValue: surveyMock },
        { provide: ErrorHandlerService, useValue: errorHandlerMock },
        { provide: Router, useValue: routerMock },
      ],
    });
    TestBed.overrideComponent(TabSurveysPage, {
      set: {
        imports: [DatePipe, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(TabSurveysPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load active surveys on init', async () => {
    surveyMock.getActiveSurveys.mockReturnValue(Promise.resolve([mockSurvey]));
    fixture.detectChanges();
    await component.loadSurveys();
    expect(surveyMock.getActiveSurveys).toHaveBeenCalledWith(mockUser.id);
    expect(component.surveys).toEqual([mockSurvey]);
  });

  it('should reload active surveys on ionViewWillEnter', async () => {
    surveyMock.getActiveSurveys.mockReturnValue(Promise.resolve([mockSurvey]));
    component.ionViewWillEnter();
    await component.loadSurveys();
    expect(surveyMock.getActiveSurveys).toHaveBeenCalledWith(mockUser.id);
    expect(component.surveys).toEqual([mockSurvey]);
  });

  it('should navigate when opening a non-responded survey', () => {
    component.openSurvey(mockSurvey);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/tabs/surveys', mockSurvey.id]);
  });

  it('should not navigate when opening an already responded survey', () => {
    component.openSurvey({ ...mockSurvey, responded: true });
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should refresh surveys and complete the refresher', async () => {
    surveyMock.getActiveSurveys.mockReturnValue(Promise.resolve([mockSurvey]));
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);
    const complete = vi.fn();
    await component.doRefresh({ target: { complete } } as unknown as CustomEvent);
    expect(surveyMock.getActiveSurveys).toHaveBeenCalledTimes(2);
    expect(complete).toHaveBeenCalled();
  });

  it('should set error and call error handler when loading fails', async () => {
    const err = new Error('network error');
    surveyMock.getActiveSurveys.mockReturnValue(Promise.reject(err));
    await component.loadSurveys();
    expect(component.error).toBe(err);
    expect(errorHandlerMock.handleHttpError).toHaveBeenCalledWith(err, expect.any(Function));
  });
});
