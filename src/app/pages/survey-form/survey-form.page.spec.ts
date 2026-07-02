import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, type Observable } from 'rxjs';
import { vi } from 'vitest';
import { SurveyFormPage } from './survey-form.page';
import { SurveyService, type Survey, type SurveyQuestion } from '../../core/services/survey.service';
import { AuthService, type AuthUser } from '../../core/services/auth.service';
import { FormValidationService } from '../../core/services/form-validation.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import { createRouterMock } from '../../../testing/mock-factories';

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

const mockSurvey: Survey = {
  id: 'survey-1',
  title: 'Encuesta editada',
  description: 'Descripción de prueba',
  is_active: true,
  start_date: null,
  end_date: '2026-12-31T23:59:59Z',
  allow_multiple_responses: false,
  created_by: 'admin-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockQuestion: SurveyQuestion = {
  id: 'q-1',
  survey_id: 'survey-1',
  question_text: 'Pregunta existente',
  question_type: 'text',
  options: null,
  is_required: true,
  sort_order: 0,
};

describe('SurveyFormPage', () => {
  let component: SurveyFormPage;
  let fixture: ReturnType<typeof TestBed.createComponent<SurveyFormPage>>;
  let surveyMock: {
    getSurveyWithQuestions: ReturnType<typeof vi.fn>;
    saveSurveyWithQuestions: ReturnType<typeof vi.fn>;
  };
  let authMock: { currentUser$: BehaviorSubject<AuthUser | null>; isAdmin$: Observable<boolean> };
  let routerMock: Router;
  let routeMock: ActivatedRoute;
  let formValidationMock: { getErrorMessage: ReturnType<typeof vi.fn>; getFirstErrorMessage: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    surveyMock = {
      getSurveyWithQuestions: vi.fn(),
      saveSurveyWithQuestions: vi.fn().mockResolvedValue(undefined),
    };
    authMock = {
      currentUser$: new BehaviorSubject<AuthUser | null>(mockUser),
      isAdmin$: of(false),
    };
    routerMock = createRouterMock();
    routeMock = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue(null),
        },
      },
    } as unknown as ActivatedRoute;
    formValidationMock = {
      getErrorMessage: vi.fn().mockReturnValue(''),
      getFirstErrorMessage: vi.fn().mockReturnValue(''),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SurveyService, useValue: surveyMock },
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock },
        { provide: FormValidationService, useValue: formValidationMock },
      ],
    });
    TestBed.overrideComponent(SurveyFormPage, {
      set: {
        imports: [FormsModule, DatePipe, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(SurveyFormPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize a new survey with one empty question', () => {
    fixture.detectChanges();
    expect(component.isEdit).toBe(false);
    expect(component.questions.length).toBe(1);
    expect(component.questions[0].question_text).toBe('');
  });

  it('should load an existing survey when route has an id', async () => {
    (routeMock.snapshot.paramMap.get as ReturnType<typeof vi.fn>).mockReturnValue('survey-1');
    surveyMock.getSurveyWithQuestions.mockResolvedValue({
      survey: mockSurvey,
      questions: [mockQuestion],
    });

    fixture.detectChanges();
    await vi.waitFor(() => component.title === mockSurvey.title);

    expect(component.isEdit).toBe(true);
    expect(component.surveyId).toBe('survey-1');
    expect(component.title).toBe(mockSurvey.title);
    expect(component.description).toBe(mockSurvey.description);
    expect(component.questions.length).toBe(1);
    expect(component.questions[0].question_text).toBe(mockQuestion.question_text);
    expect(surveyMock.getSurveyWithQuestions).toHaveBeenCalledWith('survey-1');
  });

  it('should add a question when user clicks add question', () => {
    fixture.detectChanges();
    const initialCount = component.questions.length;
    component.addQuestion();
    expect(component.questions.length).toBe(initialCount + 1);
    expect(component.questions[component.questions.length - 1].question_type).toBe('text');
  });

  it('should remove a question when user clicks remove question', () => {
    fixture.detectChanges();
    component.addQuestion();
    const countBefore = component.questions.length;
    component.removeQuestion(0);
    expect(component.questions.length).toBe(countBefore - 1);
  });

  it('should validate required title before saving', async () => {
    fixture.detectChanges();
    component.title = '   ';
    await component.save();
    expect(component.showToast).toBe(true);
    expect(component.toastMessage).toBe('El título es obligatorio');
    expect(surveyMock.saveSurveyWithQuestions).not.toHaveBeenCalled();
  });

  it('should save a valid survey and navigate on success', async () => {
    fixture.detectChanges();
    component.title = ' Nueva encuesta ';
    component.description = ' Descripción ';
    component.questions[0].question_text = 'Pregunta principal';
    surveyMock.saveSurveyWithQuestions.mockResolvedValue(undefined);

    await component.save();

    expect(surveyMock.saveSurveyWithQuestions).toHaveBeenCalledOnce();
    const callArg = surveyMock.saveSurveyWithQuestions.mock.calls[0][0];
    expect(callArg.survey.title).toBe('Nueva encuesta');
    expect(callArg.survey.description).toBe('Descripción');
    expect(callArg.questions).toHaveLength(1);
    expect(callArg.questions[0].question_text).toBe('Pregunta principal');
    expect(component.showToast).toBe(true);
    expect(component.toastMessage).toBe('Encuesta creada');
  });

  it('should show validation error when no question has text', async () => {
    fixture.detectChanges();
    component.title = 'Título válido';
    component.questions[0].question_text = '   ';
    await component.save();
    expect(component.toastMessage).toBe('Debes agregar al menos una pregunta');
    expect(surveyMock.saveSurveyWithQuestions).not.toHaveBeenCalled();
  });
});
