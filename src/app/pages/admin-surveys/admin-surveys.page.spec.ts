import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { vi } from 'vitest';
import { AdminSurveysPage } from './admin-surveys.page';
import { SurveyService, type Survey } from '../../core/services/survey.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import { createActivatedRouteMock, createRouterMock } from '../../../testing/mock-factories';
import { Router } from '@angular/router';

function getMockSurveys(): (Survey & { response_count: number })[] {
  return [
    {
      id: 'survey-1',
      title: 'Encuesta 1',
      description: 'Descripción 1',
      is_active: true,
      start_date: '2026-01-01T00:00:00Z',
      end_date: '2026-12-31T00:00:00Z',
      allow_multiple_responses: false,
      created_by: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      response_count: 5,
    },
    {
      id: 'survey-2',
      title: 'Encuesta 2',
      description: null,
      is_active: false,
      start_date: null,
      end_date: null,
      allow_multiple_responses: true,
      created_by: null,
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      response_count: 0,
    },
  ];
}

describe('AdminSurveysPage', () => {
  let component: AdminSurveysPage;
  let fixture: ReturnType<typeof TestBed.createComponent<AdminSurveysPage>>;
  let surveyMock: {
    getAllWithResponseCounts: ReturnType<typeof vi.fn>;
    getSurveyWithQuestions: ReturnType<typeof vi.fn>;
    updateSurvey: ReturnType<typeof vi.fn>;
    deleteSurvey: ReturnType<typeof vi.fn>;
  };
  let errorHandlerMock: { handleHttpError: ReturnType<typeof vi.fn> };
  let routerMock: Router;

  beforeEach(async () => {
    surveyMock = {
      getAllWithResponseCounts: vi.fn().mockResolvedValue(getMockSurveys()),
      getSurveyWithQuestions: vi.fn().mockResolvedValue({ survey: getMockSurveys()[0], questions: [{ id: 'q1' }] }),
      updateSurvey: vi.fn().mockResolvedValue(undefined),
      deleteSurvey: vi.fn().mockResolvedValue(undefined),
    };
    errorHandlerMock = { handleHttpError: vi.fn() };
    routerMock = createRouterMock();

    TestBed.configureTestingModule({
      providers: [
        { provide: SurveyService, useValue: surveyMock },
        { provide: ErrorHandlerService, useValue: errorHandlerMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: createActivatedRouteMock() },
      ],
    });
    TestBed.overrideComponent(AdminSurveysPage, {
      set: {
        imports: [RouterLink, DatePipe, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(AdminSurveysPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load surveys when entering the view', async () => {
    component.ionViewWillEnter();
    await vi.waitFor(() => !component.loading);
    expect(surveyMock.getAllWithResponseCounts).toHaveBeenCalled();
    expect(component.surveys.length).toBe(2);
    expect(component.surveys[0].id).toBe('survey-1');
    expect(component.error).toBeNull();
  });

  it('should handle load errors via error handler', async () => {
    const err = new Error('network error');
    surveyMock.getAllWithResponseCounts.mockRejectedValue(err);
    component.ionViewWillEnter();
    await vi.waitFor(() => !component.loading);
    expect(component.surveys).toEqual([]);
    expect(component.error).toBe(err);
    expect(errorHandlerMock.handleHttpError).toHaveBeenCalledWith(err, expect.any(Function));
  });

  it('should toggle active status', async () => {
    component.ionViewWillEnter();
    await vi.waitFor(() => !component.loading);
    const target = component.surveys[1];
    expect(target.is_active).toBe(false);
    await component.toggleActive(target);
    expect(surveyMock.getSurveyWithQuestions).toHaveBeenCalledWith('survey-2');
    expect(surveyMock.updateSurvey).toHaveBeenCalledWith('survey-2', { is_active: true });
    expect(target.is_active).toBe(true);
  });

  it('should prevent activation when survey has no questions', async () => {
    component.ionViewWillEnter();
    await vi.waitFor(() => !component.loading);
    const target = component.surveys[1];
    surveyMock.getSurveyWithQuestions.mockResolvedValue({ survey: target, questions: [] });
    await component.toggleActive(target);
    expect(component.showToast).toBe(true);
    expect(component.toastMessage).toBe('No se puede activar: la encuesta no tiene preguntas.');
    expect(target.is_active).toBe(false);
  });

  it('should confirm and delete a survey', async () => {
    component.ionViewWillEnter();
    await vi.waitFor(() => !component.loading);
    const target = component.surveys[0];
    component.confirmDelete(target);
    expect(component.deleteTarget).toBe(target);
    expect(component.showDeleteAlert).toBe(true);

    await component.onDeleteConfirm();
    expect(surveyMock.deleteSurvey).toHaveBeenCalledWith('survey-1');
    expect(component.surveys.some((s) => s.id === 'survey-1')).toBe(false);
    expect(component.deleteTarget).toBeNull();
  });

  it('should compute survey status and color', () => {
    const active = getMockSurveys()[0];
    const inactive = getMockSurveys()[1];
    expect(component.surveyStatus(active)).toBe('Activa');
    expect(component.statusColor(active)).toBe('success');
    expect(component.surveyStatus(inactive)).toBe('Inactiva');
    expect(component.statusColor(inactive)).toBe('medium');
  });
});
