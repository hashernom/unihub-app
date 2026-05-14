import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { environment } from '../../../environments/environment';

export interface Survey {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  allow_multiple_responses: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurveyWithStatus extends Survey {
  responded: boolean;
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: 'text' | 'single_choice' | 'multiple_choice' | 'rating';
  options: string[] | null;
  is_required: boolean;
  sort_order: number;
}

export interface SurveyResults {
  survey_id: string;
  survey_title: string;
  total_responses: number;
  total_students: number;
  questions: SurveyQuestionResult[];
}

export interface SurveyQuestionResult {
  question_id: string;
  question_text: string;
  question_type: string;
  is_required: boolean;
  sort_order: number;
  option_counts?: Record<string, number>;
  average_rating?: number;
  rating_distribution?: Record<string, number>;
  text_responses?: string[];
}

@Injectable({ providedIn: 'root' })
export class SurveyService {
  private readonly supabase = inject(SupabaseService);

  async getAccessToken(): Promise<string> {
    const { data } = await this.supabase.client.auth.getSession();
    return data.session?.access_token ?? '';
  }

  async getActiveSurveys(userId: string): Promise<SurveyWithStatus[]> {
    const now = new Date().toISOString();

    const { data: surveys, error } = await this.supabase.client
      .from('surveys')
      .select('*')
      .eq('is_active', true)
      .order('end_date', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const { data: responses } = await this.supabase.client
      .from('survey_responses')
      .select('survey_id')
      .eq('user_id', userId);

    const respondedIds = new Set(responses?.map(r => r.survey_id) ?? []);

    return (surveys ?? [])
      .filter(s => {
        const startOk = !s.start_date || s.start_date <= now;
        const endOk = !s.end_date || s.end_date >= now;
        return startOk && endOk;
      })
      .map(s => ({
        ...s,
        responded: respondedIds.has(s.id),
      }));
  }

  async getPendingSurveyCount(userId: string): Promise<number> {
    const active = await this.getActiveSurveys(userId);
    return active.filter(s => !s.responded).length;
  }

  async getAllSurveys(): Promise<Survey[]> {
    const { data, error } = await this.supabase.client
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async createSurvey(data: {
    title: string;
    description: string | null;
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
    allow_multiple_responses: boolean;
    created_by: string;
  }): Promise<void> {
    const { error } = await this.supabase.client
      .from('surveys')
      .insert(data);
    if (error) throw error;
  }

  async updateSurvey(id: string, data: Partial<Survey>): Promise<void> {
    const { error } = await this.supabase.client
      .from('surveys')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  }

  async deleteSurvey(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('surveys')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async getSurveyWithQuestions(surveyId: string): Promise<{
    survey: Survey;
    questions: SurveyQuestion[];
  } | null> {
    const { data: survey, error: surveyError } = await this.supabase.client
      .from('surveys')
      .select('*')
      .eq('id', surveyId)
      .single();

    if (surveyError || !survey) return null;

    const { data: questions } = await this.supabase.client
      .from('survey_questions')
      .select('*')
      .eq('survey_id', surveyId)
      .order('sort_order', { ascending: true });

    return { survey, questions: questions ?? [] };
  }

  async getAllWithResponseCounts(): Promise<(Survey & { response_count: number })[]> {
    const surveys = await this.getAllSurveys();

    const { data: responses } = await this.supabase.client
      .from('survey_responses')
      .select('survey_id');

    const countMap = new Map<string, number>();
    for (const r of responses ?? []) {
      countMap.set(r.survey_id, (countMap.get(r.survey_id) ?? 0) + 1);
    }

    return surveys.map(s => ({
      ...s,
      response_count: countMap.get(s.id) ?? 0,
    }));
  }

  async saveSurveyWithQuestions(params: {
    survey: {
      title: string;
      description: string | null;
      is_active: boolean;
      start_date: string | null;
      end_date: string | null;
      allow_multiple_responses: boolean;
      created_by: string;
    };
    questions: {
      question_text: string;
      question_type: 'text' | 'single_choice' | 'multiple_choice' | 'rating';
      options: string[] | null;
      is_required: boolean;
      sort_order: number;
    }[];
    editingId?: string;
  }): Promise<void> {
    if (params.editingId) {
      const { error: updateError } = await this.supabase.client
        .from('surveys')
        .update(params.survey)
        .eq('id', params.editingId);
      if (updateError) throw updateError;

      await this.supabase.client
        .from('survey_questions')
        .delete()
        .eq('survey_id', params.editingId);

      const { error: insertError } = await this.supabase.client
        .from('survey_questions')
        .insert(
          params.questions.map(q => ({
            survey_id: params.editingId,
            ...q,
          })),
        );
      if (insertError) throw insertError;
    } else {
      const { data: survey, error: surveyError } = await this.supabase.client
        .from('surveys')
        .insert(params.survey)
        .select('id')
        .single();
      if (surveyError) throw surveyError;

      const { error: questionsError } = await this.supabase.client
        .from('survey_questions')
        .insert(
          params.questions.map(q => ({
            survey_id: survey.id,
            ...q,
          })),
        );
      if (questionsError) throw questionsError;
    }
  }

  async getResults(surveyId: string): Promise<SurveyResults | null> {
    try {
      const session = await this.supabase.client.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch(
        `${environment.supabaseUrl}/functions/v1/process-survey-results`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token ?? ''}`,
          },
          body: JSON.stringify({ survey_id: surveyId }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[SurveyService] Edge function error:', err);
        return null;
      }

      return await res.json();
    } catch {
      console.warn('[SurveyService] Failed to call edge function');
      return null;
    }
  }

  async submitResponse(params: {
    surveyId: string;
    userId: string;
    answers: {
      questionId: string;
      answerText: string | null;
      answerOptions: string[] | null;
      answerRating: number | null;
    }[];
  }): Promise<void> {
    const { data: response, error: responseError } = await this.supabase.client
      .from('survey_responses')
      .insert({ survey_id: params.surveyId, user_id: params.userId })
      .select('id')
      .single();

    if (responseError) throw responseError;

    const { error: answersError } = await this.supabase.client
      .from('survey_answers')
      .insert(
        params.answers.map(a => ({
          response_id: response.id,
          question_id: a.questionId,
          answer_text: a.answerText,
          answer_options: a.answerOptions,
          answer_rating: a.answerRating,
        })),
      );

    if (answersError) throw answersError;
  }
}
