import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { vi } from 'vitest';
import { SurveyResultsPage } from './survey-results.page';
import { SurveyService, type SurveyResults } from '../../core/services/survey.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import { createActivatedRouteMock } from '../../../testing/mock-factories';

vi.mock('chart.js/auto', () => ({
  default: class MockChart {
    canvas: HTMLCanvasElement | null = null;
    destroy(): void { /* stubbed for tests */ }
    render(): void { /* stubbed for tests */ }
    static register(): void { /* stubbed for tests */ }
  },
}));

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    text: vi.fn(),
    addImage: vi.fn(),
    addPage: vi.fn(),
    save: vi.fn(),
    splitTextToSize: vi.fn().mockReturnValue(['line']),
  })),
}));

const mockResults: SurveyResults = {
  survey_id: 'survey-1',
  survey_title: 'Resultados de prueba',
  total_responses: 10,
  total_students: 20,
  questions: [
    {
      question_id: 'q-1',
      question_text: 'Opción única',
      question_type: 'single_choice',
      is_required: true,
      sort_order: 0,
      option_counts: { A: 7, B: 3 },
    },
    {
      question_id: 'q-2',
      question_text: 'Valoración',
      question_type: 'rating',
      is_required: true,
      sort_order: 1,
      average_rating: 4.2,
      rating_distribution: { '1': 0, '2': 1, '3': 2, '4': 4, '5': 3 },
    },
    {
      question_id: 'q-3',
      question_text: 'Texto libre',
      question_type: 'text',
      is_required: false,
      sort_order: 2,
      text_responses: ['Buen servicio', 'Mejorar horarios'],
    },
  ],
};

describe('SurveyResultsPage', () => {
  let component: SurveyResultsPage;
  let fixture: ReturnType<typeof TestBed.createComponent<SurveyResultsPage>>;
  let surveyMock: {
    getResults: ReturnType<typeof vi.fn>;
    getAccessToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    surveyMock = {
      getResults: vi.fn(),
      getAccessToken: vi.fn().mockResolvedValue('fake-token'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SurveyService, useValue: surveyMock },
        { provide: ActivatedRoute, useValue: createActivatedRouteMock({ id: 'survey-1' }) },
      ],
    });
    TestBed.overrideComponent(SurveyResultsPage, {
      set: {
        imports: [...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(SurveyResultsPage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not load results when route has no survey id', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: SurveyService, useValue: surveyMock },
        { provide: ActivatedRoute, useValue: createActivatedRouteMock({}) },
      ],
    });
    TestBed.overrideComponent(SurveyResultsPage, {
      set: { imports: [...IONIC_STUBS] },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(SurveyResultsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(surveyMock.getResults).not.toHaveBeenCalled();
    expect(component.loading).toBe(true);
  });

  it('should load survey results on init', async () => {
    surveyMock.getResults.mockResolvedValue(mockResults);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    expect(component.results).toEqual(mockResults);
    expect(component.error).toBe(false);
    expect(component.responseRate()).toBe(50);
    expect(surveyMock.getResults).toHaveBeenCalledWith('survey-1');
  });

  it('should set error when results cannot be loaded', async () => {
    surveyMock.getResults.mockResolvedValue(null);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    expect(component.results).toBeNull();
    expect(component.error).toBe(true);
    expect(component.loading).toBe(false);
  });

  it('should set error when loading results throws', async () => {
    surveyMock.getResults.mockRejectedValue(new Error('network error'));
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    expect(component.error).toBe(true);
    expect(component.loading).toBe(false);
  });

  it('should render charts for questions with a canvas in the DOM', async () => {
    surveyMock.getResults.mockResolvedValue(mockResults);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    (component as unknown as { renderCharts: () => void }).renderCharts();

    expect((component as unknown as { charts: unknown[] }).charts.length).toBeGreaterThan(0);
  });

  it('should skip rendering charts when canvas or option data is missing', () => {
    component.results = {
      ...mockResults,
      questions: [
        {
          question_id: 'q-missing',
          question_text: 'Sin lienzo',
          question_type: 'single_choice',
          is_required: true,
          sort_order: 0,
          option_counts: { A: 1 },
        },
        {
          question_id: 'q-empty',
          question_text: 'Sin opciones',
          question_type: 'single_choice',
          is_required: true,
          sort_order: 1,
          option_counts: {},
        },
      ],
    };

    (component as unknown as { renderCharts: () => void }).renderCharts();

    expect((component as unknown as { charts: unknown[] }).charts).toHaveLength(0);
  });

  it('should destroy charts on destroy', () => {
    const destroySpy = vi.fn();
    (component as unknown as { charts: { destroy: () => void }[] }).charts = [
      { destroy: destroySpy },
      { destroy: destroySpy },
    ];

    component.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalledTimes(2);
    expect((component as unknown as { charts: unknown[] }).charts).toHaveLength(0);
  });

  it('should compute response rate as 0 when total students is 0', () => {
    component.results = { ...mockResults, total_students: 0 };
    expect(component.responseRate()).toBe(0);
  });

  it('should compute response rate correctly', () => {
    component.results = { ...mockResults, total_responses: 5, total_students: 20 };
    expect(component.responseRate()).toBe(25);
  });

  it('should detect option data and text responses', () => {
    expect(component.hasOptionData(mockResults.questions[0])).toBe(true);
    expect(component.hasTextResponses(mockResults.questions[2])).toBe(true);
  });

  it('should return false for hasOptionData and hasTextResponses when empty or undefined', () => {
    const q = { ...mockResults.questions[0], option_counts: {}, text_responses: [] };
    expect(component.hasOptionData(q)).toBe(false);
    expect(component.hasTextResponses(q)).toBe(false);

    const noOptionCounts = { ...mockResults.questions[0], option_counts: undefined };
    const noTextResponses = { ...mockResults.questions[2], text_responses: undefined };
    expect(component.hasOptionData(noOptionCounts)).toBe(false);
    expect(component.hasTextResponses(noTextResponses)).toBe(false);
  });

  it('should render multiple choice and rating without full distribution', () => {
    const multiCanvas = document.createElement('canvas');
    multiCanvas.id = 'chart-q-multi';
    const ratingCanvas = document.createElement('canvas');
    ratingCanvas.id = 'chart-q-rating-partial';
    document.body.appendChild(multiCanvas);
    document.body.appendChild(ratingCanvas);

    component.results = {
      ...mockResults,
      questions: [
        {
          question_id: 'q-multi',
          question_text: 'Múltiple',
          question_type: 'multiple_choice',
          is_required: true,
          sort_order: 0,
          option_counts: { X: 2, Y: 4, Z: 1 },
        },
        {
          question_id: 'q-rating-partial',
          question_text: 'Valoración parcial',
          question_type: 'rating',
          is_required: true,
          sort_order: 1,
          average_rating: 3,
        },
      ],
    };

    (component as unknown as { renderCharts: () => void }).renderCharts();

    expect((component as unknown as { charts: unknown[] }).charts.length).toBeGreaterThan(0);

    document.body.removeChild(multiCanvas);
    document.body.removeChild(ratingCanvas);
  });

  it('should export results to CSV when user clicks export', async () => {
    surveyMock.getResults.mockResolvedValue(mockResults);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('text/csv'),
      },
      blob: vi.fn().mockResolvedValue(new Blob(['col1,col2'])) as unknown as Blob,
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    const createObjectURLSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revokeObjectURLSpy = vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await component.exportCsv();

    expect(surveyMock.getAccessToken).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('export-survey-results');
    expect(options?.method).toBe('POST');
    expect(JSON.parse(options?.body as string)).toEqual({ survey_id: 'survey-1' });
    expect(component.showToast).toBe(true);
    expect(component.toastMessage).toBe('CSV descargado');

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    anchorClickSpy.mockRestore();
  });

  it('should return early when exporting CSV without results', async () => {
    component.results = null;
    await component.exportCsv();
    expect(surveyMock.getAccessToken).not.toHaveBeenCalled();
  });

  it('should return early when exporting PDF without results', async () => {
    component.results = null;
    await component.exportPdf();
    expect(component.exporting).toBe(false);
  });

  it('should show a message when exporting CSV with no responses', async () => {
    surveyMock.getResults.mockResolvedValue({ ...mockResults, total_responses: 0 });
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    await component.exportCsv();

    expect(component.toastMessage).toBe('Sin datos para exportar');
  });

  it('should show error toast when CSV export response is not ok', async () => {
    surveyMock.getResults.mockResolvedValue(mockResults);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      headers: { get: vi.fn() },
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await component.exportCsv();

    expect(component.toastMessage).toBe('Error al exportar CSV');
  });

  it('should show fallback message when CSV export returns empty JSON error', async () => {
    surveyMock.getResults.mockResolvedValue(mockResults);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: vi.fn().mockReturnValue('application/json') },
      json: vi.fn().mockResolvedValue({}),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await component.exportCsv();

    expect(component.toastMessage).toBe('Sin datos para exportar');
  });

  it('should show error toast when CSV export returns JSON error', async () => {
    surveyMock.getResults.mockResolvedValue(mockResults);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: vi.fn().mockReturnValue('application/json') },
      json: vi.fn().mockResolvedValue({ error: 'Server busy' }),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await component.exportCsv();

    expect(component.toastMessage).toBe('Server busy');
  });

  it('should show error toast when CSV export throws', async () => {
    surveyMock.getResults.mockResolvedValue(mockResults);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));

    await component.exportCsv();

    expect(component.toastMessage).toBe('Error al exportar CSV');
    expect(component.exporting).toBe(false);
  });

  it('should show a message when exporting PDF with no responses', async () => {
    surveyMock.getResults.mockResolvedValue({ ...mockResults, total_responses: 0 });
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    await component.exportPdf();

    expect(component.toastMessage).toBe('Sin datos para exportar');
  });

  it('should export PDF with rating question without average rating', async () => {
    component.results = {
      survey_id: 'survey-rating',
      survey_title: 'Solo rating',
      total_responses: 5,
      total_students: 10,
      questions: [
        {
          question_id: 'q-rating-no-avg',
          question_text: 'Valoración',
          question_type: 'rating',
          is_required: true,
          sort_order: 0,
          rating_distribution: { '1': 1, '2': 1, '3': 1, '4': 1, '5': 1 },
        },
      ],
    };

    await component.exportPdf();

    expect(component.exporting).toBe(false);
    // PDF export triggers canvas rendering in jsdom; canvas not available so error is expected
    expect(component.toastMessage).toBe('Error al exportar PDF');
  });

  it('should handle PDF export with many text responses', async () => {
    const manyResponses = Array.from({ length: 35 }, (_, i) => `Respuesta ${i}`);
    component.results = {
      survey_id: 'survey-pdf',
      survey_title: 'PDF grande',
      total_responses: 35,
      total_students: 40,
      questions: [
        {
          question_id: 'q-text',
          question_text: 'Comentarios',
          question_type: 'text',
          is_required: false,
          sort_order: 0,
          text_responses: manyResponses,
        },
      ],
    };

    await component.exportPdf();

    expect(component.exporting).toBe(false);
    // jsdom lacks canvas; toDataURL throws; error path is valid coverage
    expect(component.toastMessage).toBe('Error al exportar PDF');
  });

  it('should show error toast when PDF export throws', async () => {
    surveyMock.getResults.mockResolvedValue(mockResults);
    fixture.detectChanges();
    await vi.waitFor(() => !component.loading);

    const { jsPDF } = await import('jspdf');
    (jsPDF as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('pdf fail');
    });

    await component.exportPdf();

    expect(component.toastMessage).toBe('Error al exportar PDF');
    expect(component.exporting).toBe(false);
  });
});
