import { TestBed } from '@angular/core/testing';
import { SurveyService, type Survey } from './survey.service';
import { SupabaseService } from './supabase.service';
import {
  createSupabaseServiceMock,
  createQueryBuilderMock,
} from '../../../testing/mock-factories';

const mockSurvey: Survey = {
  id: 'survey-1',
  title: 'Test',
  description: null,
  is_active: true,
  start_date: null,
  end_date: null,
  allow_multiple_responses: false,
  created_by: 'admin-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('SurveyService', () => {
  let service: SurveyService;
  let supabaseMock: ReturnType<typeof createSupabaseServiceMock>;

  beforeEach(() => {
    supabaseMock = createSupabaseServiceMock();
    TestBed.configureTestingModule({
      providers: [
        SurveyService,
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    });
    service = TestBed.inject(SurveyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAccessToken', () => {
    it('should return access token from session', async () => {
      expect(await service.getAccessToken()).toBe('fake-token');
    });

    it('should return empty string if no session', async () => {
      vi.mocked(supabaseMock.client.auth.getSession).mockResolvedValue({
        data: { session: null },
      } as never);
      expect(await service.getAccessToken()).toBe('');
    });
  });

  describe('getActiveSurveys', () => {
    it('should return active surveys with responded status', async () => {
      const surveysQb = createQueryBuilderMock({
        then: { data: [mockSurvey], error: null },
      });
      const responsesQb = createQueryBuilderMock({
        then: { data: [{ survey_id: 'survey-1' }], error: null },
      });
      vi.mocked(supabaseMock.client.from)
        .mockReturnValueOnce(surveysQb as never)
        .mockReturnValueOnce(responsesQb as never);

      const result = await service.getActiveSurveys('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].responded).toBe(true);
    });

    it('should filter out surveys outside date range', async () => {
      const past = { ...mockSurvey, id: 'past', end_date: '2020-01-01T00:00:00Z' };
      const future = {
        ...mockSurvey,
        id: 'future',
        start_date: '2099-12-31T00:00:00Z',
      };
      const surveysQb = createQueryBuilderMock({
        then: { data: [past, future, mockSurvey], error: null },
      });
      const responsesQb = createQueryBuilderMock({
        then: { data: [], error: null },
      });
      vi.mocked(supabaseMock.client.from)
        .mockReturnValueOnce(surveysQb as never)
        .mockReturnValueOnce(responsesQb as never);

      const result = await service.getActiveSurveys('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('survey-1');
    });

    it('should throw on query error', async () => {
      const qb = createQueryBuilderMock({
        then: { data: null, error: new Error('DB error') },
      });
      vi.mocked(supabaseMock.client.from).mockReturnValueOnce(qb as never);

      await expect(service.getActiveSurveys('user-1')).rejects.toThrow(
        'DB error',
      );
    });
  });

  describe('getPendingSurveyCount', () => {
    it('should count unresponded surveys', async () => {
      const unresponded = { ...mockSurvey, id: 'unresponded' };
      const surveysQb = createQueryBuilderMock({
        then: { data: [mockSurvey, unresponded], error: null },
      });
      const responsesQb = createQueryBuilderMock({
        then: { data: [{ survey_id: 'survey-1' }], error: null },
      });
      vi.mocked(supabaseMock.client.from)
        .mockReturnValueOnce(surveysQb as never)
        .mockReturnValueOnce(responsesQb as never);

      expect(await service.getPendingSurveyCount('user-1')).toBe(1);
    });
  });

  describe('getAllSurveys', () => {
    it('should return all surveys', async () => {
      const qb = createQueryBuilderMock({
        then: { data: [mockSurvey], error: null },
      });
      vi.mocked(supabaseMock.client.from).mockReturnValue(qb as never);

      expect(await service.getAllSurveys()).toEqual([mockSurvey]);
    });

    it('should throw on error', async () => {
      const qb = createQueryBuilderMock({
        then: { data: null, error: new Error('Fail') },
      });
      vi.mocked(supabaseMock.client.from).mockReturnValue(qb as never);

      await expect(service.getAllSurveys()).rejects.toThrow('Fail');
    });
  });

  describe('createSurvey', () => {
    it('should insert survey', async () => {
      const qb = createQueryBuilderMock({
        then: { data: null, error: null },
      });
      vi.mocked(supabaseMock.client.from).mockReturnValue(qb as never);

      await service.createSurvey({
        title: 'New',
        description: null,
        is_active: true,
        start_date: null,
        end_date: null,
        allow_multiple_responses: false,
        created_by: 'a',
      });

      expect(qb.insert).toHaveBeenCalled();
    });

    it('should throw on insert error', async () => {
      const qb = createQueryBuilderMock({
        then: { data: null, error: new Error('Insert fail') },
      });
      vi.mocked(supabaseMock.client.from).mockReturnValue(qb as never);

      await expect(
        service.createSurvey({
          title: 'X',
          description: null,
          is_active: true,
          start_date: null,
          end_date: null,
          allow_multiple_responses: false,
          created_by: 'a',
        }),
      ).rejects.toThrow('Insert fail');
    });
  });

  describe('updateSurvey', () => {
    it('should update by id', async () => {
      const qb = createQueryBuilderMock({
        then: { data: null, error: null },
      });
      vi.mocked(supabaseMock.client.from).mockReturnValue(qb as never);

      await service.updateSurvey('survey-1', { title: 'Updated' });

      expect(qb.update).toHaveBeenCalledWith({ title: 'Updated' });
      expect(qb.eq).toHaveBeenCalledWith('id', 'survey-1');
    });
  });

  describe('deleteSurvey', () => {
    it('should delete by id', async () => {
      const qb = createQueryBuilderMock({
        then: { data: null, error: null },
      });
      vi.mocked(supabaseMock.client.from).mockReturnValue(qb as never);

      await service.deleteSurvey('survey-1');

      expect(qb.delete).toHaveBeenCalled();
      expect(qb.eq).toHaveBeenCalledWith('id', 'survey-1');
    });
  });

  describe('getSurveyWithQuestions', () => {
    it('should return survey with questions', async () => {
      const surveyQb = createQueryBuilderMock({
        single: { data: mockSurvey, error: null },
      });
      const questionsQb = createQueryBuilderMock({
        then: {
          data: [
            {
              id: 'q-1',
              survey_id: 'survey-1',
              question_text: 'Q',
              question_type: 'text',
              options: null,
              is_required: true,
              sort_order: 1,
            },
          ],
          error: null,
        },
      });
      vi.mocked(supabaseMock.client.from)
        .mockReturnValueOnce(surveyQb as never)
        .mockReturnValueOnce(questionsQb as never);

      const result = await service.getSurveyWithQuestions('survey-1');

      expect(result?.survey).toEqual(mockSurvey);
      expect(result?.questions).toHaveLength(1);
    });

    it('should return null if not found', async () => {
      const surveyQb = createQueryBuilderMock({
        single: { data: null, error: { message: 'Not found' } as unknown as Error },
      });
      vi.mocked(supabaseMock.client.from).mockReturnValueOnce(surveyQb as never);

      expect(await service.getSurveyWithQuestions('nonexistent')).toBeNull();
    });
  });

  describe('getAllWithResponseCounts', () => {
    it('should return surveys with response counts', async () => {
      const surveysQb = createQueryBuilderMock({
        then: { data: [mockSurvey], error: null },
      });
      const responsesQb = createQueryBuilderMock({
        then: {
          data: [
            { survey_id: 'survey-1' },
            { survey_id: 'survey-1' },
          ],
          error: null,
        },
      });
      vi.mocked(supabaseMock.client.from)
        .mockReturnValueOnce(surveysQb as never)
        .mockReturnValueOnce(responsesQb as never);

      const result = await service.getAllWithResponseCounts();

      expect(result[0].response_count).toBe(2);
    });
  });

  describe('saveSurveyWithQuestions', () => {
    it('should create new survey with questions', async () => {
      const surveyQb = createQueryBuilderMock({
        single: { data: { id: 'new-survey' }, error: null },
      });
      const questionsQb = createQueryBuilderMock({
        then: { data: null, error: null },
      });
      vi.mocked(supabaseMock.client.from)
        .mockReturnValueOnce(surveyQb as never)
        .mockReturnValueOnce(questionsQb as never);

      await service.saveSurveyWithQuestions({
        survey: {
          title: 'New',
          description: null,
          is_active: true,
          start_date: null,
          end_date: null,
          allow_multiple_responses: false,
          created_by: 'a',
        },
        questions: [
          {
            question_text: 'Q1',
            question_type: 'text',
            options: null,
            is_required: true,
            sort_order: 1,
          },
        ],
      });

      expect(surveyQb.insert).toHaveBeenCalled();
      expect(questionsQb.insert).toHaveBeenCalled();
    });

    it('should update existing survey and replace questions', async () => {
      const updateQb = createQueryBuilderMock({
        then: { data: null, error: null },
      });
      const deleteQb = createQueryBuilderMock({
        then: { data: null, error: null },
      });
      const insertQb = createQueryBuilderMock({
        then: { data: null, error: null },
      });
      vi.mocked(supabaseMock.client.from)
        .mockReturnValueOnce(updateQb as never)
        .mockReturnValueOnce(deleteQb as never)
        .mockReturnValueOnce(insertQb as never);

      await service.saveSurveyWithQuestions({
        survey: {
          title: 'Updated',
          description: null,
          is_active: true,
          start_date: null,
          end_date: null,
          allow_multiple_responses: false,
          created_by: 'a',
        },
        questions: [
          {
            question_text: 'Q1',
            question_type: 'text',
            options: null,
            is_required: true,
            sort_order: 1,
          },
        ],
        editingId: 'survey-1',
      });

      expect(updateQb.update).toHaveBeenCalled();
      expect(deleteQb.delete).toHaveBeenCalled();
      expect(insertQb.insert).toHaveBeenCalled();
    });
  });

  describe('submitResponse', () => {
    it('should insert response and answers', async () => {
      const responseQb = createQueryBuilderMock({
        single: { data: { id: 'response-1' }, error: null },
      });
      const answersQb = createQueryBuilderMock({
        then: { data: null, error: null },
      });
      vi.mocked(supabaseMock.client.from)
        .mockReturnValueOnce(responseQb as never)
        .mockReturnValueOnce(answersQb as never);

      await service.submitResponse({
        surveyId: 'survey-1',
        userId: 'user-1',
        answers: [
          {
            questionId: 'q-1',
            answerText: 'Good',
            answerOptions: null,
            answerRating: null,
          },
        ],
      });

      expect(responseQb.insert).toHaveBeenCalled();
      expect(answersQb.insert).toHaveBeenCalled();
    });

    it('should throw on response insert error', async () => {
      const responseQb = createQueryBuilderMock({
        single: { data: null, error: new Error('Fail') },
      });
      vi.mocked(supabaseMock.client.from).mockReturnValueOnce(responseQb as never);

      await expect(
        service.submitResponse({
          surveyId: 's',
          userId: 'u',
          answers: [],
        }),
      ).rejects.toThrow('Fail');
    });
  });

  describe('getResults', () => {
    it('should call edge function and return results', async () => {
      const mockResults = {
        survey_id: 'survey-1',
        survey_title: 'Test',
        total_responses: 5,
        total_students: 100,
        questions: [],
      };
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResults),
        } as Response);

      expect(await service.getResults('survey-1')).toEqual(mockResults);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/process-survey-results'),
        expect.objectContaining({ method: 'POST' }),
      );
      fetchSpy.mockRestore();
    });

    it('should return null on HTTP error', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      } as Response);

      expect(await service.getResults('survey-1')).toBeNull();
      fetchSpy.mockRestore();
    });

    it('should return null on network error', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network'));

      expect(await service.getResults('survey-1')).toBeNull();
      fetchSpy.mockRestore();
    });
  });
});
