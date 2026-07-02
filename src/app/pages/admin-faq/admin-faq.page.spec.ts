import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SlicePipe, UpperCasePipe } from '@angular/common';
import { vi } from 'vitest';
import { AdminFaqPage } from './admin-faq.page';
import { FaqService, type FaqEntry } from '../../core/services/faq.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';

function createMockFaqs(): FaqEntry[] {
  return [
    {
      id: 'faq-1',
      question: '¿Cómo me inscribo?',
      answer: 'Desde el portal académico.',
      category: 'Admisiones',
      sort_order: 0,
      is_active: true,
      language: 'es',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'faq-2',
      question: 'How do I reset my password?',
      answer: 'Use the forgot password link.',
      category: 'Tecnología',
      sort_order: 1,
      is_active: false,
      language: 'en',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'faq-3',
      question: '¿Dónde veo mis notas?',
      answer: 'En la sección de calificaciones.',
      category: 'Admisiones',
      sort_order: 1,
      is_active: true,
      language: 'es',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ];
}

const mockCategories = ['Admisiones', 'Tecnología'];

describe('AdminFaqPage', () => {
  let component: AdminFaqPage;
  let fixture: ReturnType<typeof TestBed.createComponent<AdminFaqPage>>;
  let router: Router;
  let faqMock: {
    getFaqs: ReturnType<typeof vi.fn>;
    getCategories: ReturnType<typeof vi.fn>;
    toggleActive: ReturnType<typeof vi.fn>;
    updateFaq: ReturnType<typeof vi.fn>;
    deleteFaq: ReturnType<typeof vi.fn>;
  };
  let errorHandlerMock: { handleHttpError: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    faqMock = {
      getFaqs: vi.fn(),
      getCategories: vi.fn(),
      toggleActive: vi.fn(),
      updateFaq: vi.fn(),
      deleteFaq: vi.fn(),
    };
    errorHandlerMock = { handleHttpError: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: FaqService, useValue: faqMock },
        { provide: ErrorHandlerService, useValue: errorHandlerMock },
        provideRouter([]),
      ],
    });
    TestBed.overrideComponent(AdminFaqPage, {
      set: {
        imports: [FormsModule, SlicePipe, UpperCasePipe, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(AdminFaqPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load FAQs and categories on ionViewWillEnter', async () => {
    const mockFaqs = createMockFaqs();
    faqMock.getFaqs.mockResolvedValue(mockFaqs);
    faqMock.getCategories.mockResolvedValue(mockCategories);

    await component.loadFaqs();

    expect(faqMock.getFaqs).toHaveBeenCalled();
    expect(faqMock.getCategories).toHaveBeenCalled();
    expect(component.faqs).toEqual(mockFaqs);
    expect(component.categories).toEqual(mockCategories);
    expect(component.groupedFaqs.length).toBe(2);
    expect(component.loading).toBe(false);
  });

  it('should handle load error and call error handler', async () => {
    const err = new Error('Network error');
    faqMock.getFaqs.mockRejectedValue(err);
    faqMock.getCategories.mockResolvedValue([]);

    await component.loadFaqs();

    expect(component.faqs).toHaveLength(0);
    expect(component.error).toBe(err);
    expect(errorHandlerMock.handleHttpError).toHaveBeenCalledWith(err, expect.any(Function));
    expect(component.loading).toBe(false);
  });

  it('should filter FAQs by search query', async () => {
    faqMock.getFaqs.mockResolvedValue(createMockFaqs());
    faqMock.getCategories.mockResolvedValue(mockCategories);

    await component.loadFaqs();

    component.searchQuery = 'password';
    component.applyFilters();

    expect(component.filteredFaqs).toHaveLength(1);
    expect(component.filteredFaqs[0].id).toBe('faq-2');
  });

  it('should filter FAQs by active state', async () => {
    faqMock.getFaqs.mockResolvedValue(createMockFaqs());
    faqMock.getCategories.mockResolvedValue(mockCategories);

    await component.loadFaqs();

    component.setActiveFilter('active');
    expect(component.filteredFaqs.every((f) => f.is_active)).toBe(true);

    component.setActiveFilter('inactive');
    expect(component.filteredFaqs.every((f) => !f.is_active)).toBe(true);
  });

  it('should filter FAQs by language', async () => {
    faqMock.getFaqs.mockResolvedValue(createMockFaqs());
    faqMock.getCategories.mockResolvedValue(mockCategories);

    await component.loadFaqs();

    component.setLanguageFilter('es');
    expect(component.filteredFaqs.every((f) => f.language === 'es')).toBe(true);
  });

  it('should toggle FAQ active state', async () => {
    const mockFaqs = createMockFaqs();
    faqMock.getFaqs.mockResolvedValue(mockFaqs);
    faqMock.getCategories.mockResolvedValue(mockCategories);
    faqMock.toggleActive.mockResolvedValue(undefined);

    await component.loadFaqs();

    const faq = component.faqs[0];
    const previousState = faq.is_active;
    await component.toggleActive(faq);

    expect(faqMock.toggleActive).toHaveBeenCalledWith(faq.id, !previousState);
    expect(faq.is_active).toBe(!previousState);
  });

  it('should delete a FAQ', async () => {
    const mockFaqs = createMockFaqs();
    faqMock.getFaqs.mockResolvedValue(mockFaqs);
    faqMock.getCategories.mockResolvedValue(mockCategories);
    faqMock.deleteFaq.mockResolvedValue(undefined);

    await component.loadFaqs();

    const target = component.faqs[0];
    component.confirmDelete(target);
    expect(component.showDeleteAlert).toBe(true);

    await component.deleteAlertButtons[1].handler();

    expect(faqMock.deleteFaq).toHaveBeenCalledWith(target.id);
    expect(component.faqs.some((f) => f.id === target.id)).toBe(false);
    expect(component.toastMessage).toBe('FAQ eliminada');
  });

  it('should reorder FAQs within a group', async () => {
    faqMock.getFaqs.mockResolvedValue(createMockFaqs());
    faqMock.getCategories.mockResolvedValue(mockCategories);
    faqMock.updateFaq.mockResolvedValue(undefined);

    await component.loadFaqs();

    const group = component.groupedFaqs.find((g) => g.category === 'Admisiones')!;
    expect(group.items).toHaveLength(2);

    await component.moveUp(group, 1);

    expect(faqMock.updateFaq).toHaveBeenCalledTimes(2);
    const updatedGroup = component.groupedFaqs.find((g) => g.category === 'Admisiones')!;
    expect(updatedGroup.items[0].id).toBe('faq-3');
    expect(updatedGroup.items[0].sort_order).toBe(0);
    expect(updatedGroup.items[1].sort_order).toBe(1);
  });

  it('should not move first item up or last item down', async () => {
    faqMock.getFaqs.mockResolvedValue(createMockFaqs());
    faqMock.getCategories.mockResolvedValue(mockCategories);
    faqMock.updateFaq.mockResolvedValue(undefined);

    await component.loadFaqs();

    const group = component.groupedFaqs.find((g) => g.category === 'Admisiones')!;
    await component.moveUp(group, 0);
    await component.moveDown(group, group.items.length - 1);

    expect(faqMock.updateFaq).not.toHaveBeenCalled();
  });

  it('should navigate to new FAQ', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.newFaq();
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/faq/new']);
  });

  it('should navigate to edit FAQ', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.editFaq(createMockFaqs()[0]);
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/faq/edit', 'faq-1']);
  });
});
