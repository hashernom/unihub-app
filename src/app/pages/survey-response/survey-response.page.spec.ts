import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { SurveyResponsePage } from './survey-response.page';
import { SurveyService, type Survey, type SurveyQuestion } from '../../core/services/survey.service';
import { AuthService, type AuthUser } from '../../core/services/auth.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';

const mockSurvey: Survey = {
  id: 'survey-1',
  title: 'Test Survey',
  description: 'A test survey',
  is_active: true,
  start_date: null,
  end_date: null,
  allow_multiple_responses: false,
  created_by: 'admin-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'test@test.com',
  profile: {
    id: 'user-1',
    student_code: 'U20231001',
    full_name: 'Test',
    role: 'student',
    avatar_url: null,
    carrera: 'Ingeniería',
    semestre: '5',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
};

function textQuestion(): SurveyQuestion {
  return {
    id: 'q-1',
    survey_id: 'survey-1',
    question_text: 'Comments',
    question_type: 'text',
    options: null,
    is_required: true,
    sort_order: 1,
  };
}

function singleChoiceQuestion(): SurveyQuestion {
  return {
    id: 'q-2',
    survey_id: 'survey-1',
    question_text: 'Pick one',
    question_type: 'single_choice',
    options: ['A', 'B'],
    is_required: true,
    sort_order: 1,
  };
}

function multipleChoiceQuestion(): SurveyQuestion {
  return {
    id: 'q-3',
    survey_id: 'survey-1',
    question_text: 'Pick many',
    question_type: 'multiple_choice',
    options: ['X', 'Y'],
    is_required: true,
    sort_order: 1,
  };
}

function ratingQuestion(): SurveyQuestion {
  return {
    id: 'q-4',
    survey_id: 'survey-1',
    question_text: 'Rate',
    question_type: 'rating',
    options: null,
    is_required: true,
    sort_order: 1,
  };
}

describe('SurveyResponsePage', () => {
  let component: SurveyResponsePage;
  let fixture: ReturnType<typeof TestBed.createComponent<SurveyResponsePage>>;
  let surveyMock: {
    getSurveyWithQuestions: ReturnType<typeof vi.fn>;
    submitResponse: ReturnType<typeof vi.fn>;
  };
  let authMock: { currentUser$: BehaviorSubject<AuthUser | null> };
  let router: Router;

  beforeEach(async () => {
    surveyMock = {
      getSurveyWithQuestions: vi.fn(),
      submitResponse: vi.fn(),
    };
    authMock = { currentUser$: new BehaviorSubject<AuthUser | null>(mockUser) };

    TestBed.configureTestingModule({
      providers: [
        { provide: SurveyService, useValue: surveyMock },
        { provide: AuthService, useValue: authMock },
        provideRouter([{ path: 'tabs/surveys', redirectTo: '', pathMatch: 'full' }]),
      ],
    });
    TestBed.overrideComponent(SurveyResponsePage, {
      set: {
        imports: [FormsModule, DatePipe, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(SurveyResponsePage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('with text question', () => {
    beforeEach(() => {
      component.survey = mockSurvey;
      component.questions = [textQuestion()];
      component.loading = false;
      fixture.detectChanges();
    });

    it('should render text question with textarea', () => {
      const textarea = fixture.nativeElement.querySelector('ion-textarea');
      expect(textarea).toBeTruthy();
    });

    it('should require text answer', async () => {
      await component.submit();
      expect(component.errors['q-1']).toBe('Esta pregunta es obligatoria.');
    });
  });

  describe('with single_choice question', () => {
    beforeEach(() => {
      component.survey = mockSurvey;
      component.questions = [singleChoiceQuestion()];
      component.loading = false;
      fixture.detectChanges();
    });

    it('should render radio options', () => {
      const radios = fixture.nativeElement.querySelectorAll('ion-radio');
      expect(radios.length).toBe(2);
    });
  });

  describe('with multiple_choice question', () => {
    beforeEach(() => {
      component.survey = mockSurvey;
      component.questions = [multipleChoiceQuestion()];
      component.answers = { 'q-3': [] };
      component.loading = false;
      fixture.detectChanges();
    });

    it('should render checkbox options', () => {
      const checkboxes = fixture.nativeElement.querySelectorAll('ion-checkbox');
      expect(checkboxes.length).toBe(2);
    });

    it('should toggle options', () => {
      component.toggleOption('q-3', 'X');
      expect(component.isSelected('q-3', 'X')).toBe(true);
      component.toggleOption('q-3', 'X');
      expect(component.isSelected('q-3', 'X')).toBe(false);
    });
  });

  describe('with rating question', () => {
    beforeEach(() => {
      component.survey = mockSurvey;
      component.questions = [ratingQuestion()];
      component.loading = false;
      fixture.detectChanges();
    });

    it('should render star icons', () => {
      const icons = fixture.nativeElement.querySelectorAll('ion-icon');
      expect(icons.length).toBeGreaterThanOrEqual(5);
    });

    it('should set rating', () => {
      component.setRating('q-4', 4);
      expect(component.answers['q-4']).toBe(4);
    });
  });

  describe('submit', () => {
    beforeEach(() => {
      component.survey = mockSurvey;
      component.questions = [textQuestion()];
      component.answers = { 'q-1': '' };
      component.loading = false;
      surveyMock.submitResponse.mockResolvedValue(undefined);
      fixture.detectChanges();
    });

    it('should submit response and navigate on success', async () => {
      component.answers['q-1'] = 'Great';
      const navigateSpy = vi.spyOn(router, 'navigate');
      await component.submit();
      expect(surveyMock.submitResponse).toHaveBeenCalled();
      expect(component.submitSuccess).toBe(true);
      expect(navigateSpy).not.toHaveBeenCalled();
      // Navigation is deferred via setTimeout(1500)
    });

    it('should show duplicate response error', async () => {
      component.answers['q-1'] = 'Great';
      surveyMock.submitResponse.mockRejectedValue(
        new Error('duplicate key value violates unique constraint "uq_survey_user"'),
      );
      await component.submit();
      expect(component.toastMessage).toContain('Ya has respondido');
    });

    it('should show generic error on failure', async () => {
      component.answers['q-1'] = 'Great';
      surveyMock.submitResponse.mockRejectedValue(new Error('network'));
      await component.submit();
      expect(component.toastMessage).toContain('Error al enviar');
    });
  });
});
