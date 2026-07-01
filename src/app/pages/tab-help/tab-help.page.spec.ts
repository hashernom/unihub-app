import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { TabHelpPage } from './tab-help.page';
import { HelpBotService, type HelpSearchResponse } from '../../core/services/help-bot.service';
import { FaqService } from '../../core/services/faq.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';

describe('TabHelpPage', () => {
  let component: TabHelpPage;
  let fixture: ReturnType<typeof TestBed.createComponent<TabHelpPage>>;
  let helpBotMock: {
    search: ReturnType<typeof vi.fn>;
    requestSearch: ReturnType<typeof vi.fn>;
    liveResults$: Subject<unknown>;
  };
  let faqMock: { getActiveCategories: ReturnType<typeof vi.fn> };
  let errorHandlerMock: { handleHttpError: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    helpBotMock = {
      search: vi.fn(),
      requestSearch: vi.fn(),
      liveResults$: new Subject(),
    };
    faqMock = { getActiveCategories: vi.fn() };
    errorHandlerMock = { handleHttpError: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: HelpBotService, useValue: helpBotMock },
        { provide: FaqService, useValue: faqMock },
        { provide: ErrorHandlerService, useValue: errorHandlerMock },
      ],
    });
    TestBed.overrideComponent(TabHelpPage, {
      set: {
        imports: [FormsModule, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(TabHelpPage);
    component = fixture.componentInstance;
    faqMock.getActiveCategories.mockResolvedValue(['cuenta', 'academico']);
    fixture.detectChanges();
    await vi.waitFor(() => !component.categoriesLoading);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load quick replies from FAQ categories', async () => {
    expect(faqMock.getActiveCategories).toHaveBeenCalled();
    expect(component.quickReplies).toHaveLength(2);
    expect(component.quickReplies[0].label).toBe('Cuenta');
  });

  it('should handle FAQ categories error', async () => {
    component.categoriesLoading = true;
    faqMock.getActiveCategories.mockRejectedValue(new Error('network'));
    await component.loadQuickReplies();
    expect(component.categoriesError).toBe(true);
    expect(errorHandlerMock.handleHttpError).toHaveBeenCalled();
  });

  it('should add welcome message on init', () => {
    expect(component.messages.length).toBeGreaterThanOrEqual(1);
    expect(component.messages[0].role).toBe('bot');
  });

  it('should send user message and receive bot response', async () => {
    const response: HelpSearchResponse = {
      query: 'horario',
      language: 'es',
      results: [{ faq_id: '1', question: 'Horario', answer: '8am a 6pm', category: 'academico', language: 'es', relevance_score: 0.9 }],
      suggestions: [],
      is_resolved: true,
    };
    helpBotMock.search.mockResolvedValue(response);
    component.inputValue = 'horario';
    await component.sendMessage();
    expect(helpBotMock.search).toHaveBeenCalledWith('horario');
    expect(component.messages.some((m) => m.role === 'user' && m.text === 'horario')).toBe(true);
    expect(component.messages.some((m) => m.role === 'bot' && m.text === '8am a 6pm')).toBe(true);
    expect(component.loading).toBe(false);
  });

  it('should show suggestions when no exact match', async () => {
    const response: HelpSearchResponse = {
      query: 'xyz',
      language: 'es',
      results: [],
      suggestions: ['horario', 'aulas'],
      is_resolved: false,
    };
    helpBotMock.search.mockResolvedValue(response);
    component.inputValue = 'xyz';
    await component.sendMessage();
    const botMessage = component.messages.find((m) => m.role === 'bot' && m.text.includes('No encontré'));
    expect(botMessage).toBeTruthy();
    expect(botMessage?.suggestions).toEqual(['horario', 'aulas']);
  });

  it('should handle search error gracefully', async () => {
    helpBotMock.search.mockRejectedValue(new Error('fail'));
    component.inputValue = 'help';
    await component.sendMessage();
    const errorMessage = component.messages.find((m) => m.role === 'bot' && m.text.includes('ocurrió un error'));
    expect(errorMessage).toBeTruthy();
    expect(component.loading).toBe(false);
  });

  it('should not send empty messages', async () => {
    component.inputValue = '   ';
    await component.sendMessage();
    expect(helpBotMock.search).not.toHaveBeenCalled();
  });

  it('should debounce input and request search', async () => {
    vi.useFakeTimers();
    component.onInputChange('hello');
    vi.advanceTimersByTime(600);
    expect(helpBotMock.requestSearch).toHaveBeenCalledWith('hello');
    vi.useRealTimers();
  });

  it('should handle quick reply click', async () => {
    const response: HelpSearchResponse = {
      query: 'cuenta',
      language: 'es',
      results: [{ faq_id: '1', question: 'Cuenta', answer: 'Instrucciones', category: 'cuenta', language: 'es', relevance_score: 0.8 }],
      suggestions: [],
      is_resolved: true,
    };
    helpBotMock.search.mockResolvedValue(response);
    component.onQuickReply({ label: 'Cuenta', query: 'cuenta' });
    expect(helpBotMock.search).toHaveBeenCalledWith('Cuenta');
  });

  it('should handle suggestion click', async () => {
    const response: HelpSearchResponse = {
      query: 'horario',
      language: 'es',
      results: [{ faq_id: '1', question: 'Horario', answer: '8am a 6pm', category: 'academico', language: 'es', relevance_score: 0.9 }],
      suggestions: [],
      is_resolved: true,
    };
    helpBotMock.search.mockResolvedValue(response);
    component.onSuggestionClick('horario');
    expect(helpBotMock.search).toHaveBeenCalledWith('horario');
  });
});
