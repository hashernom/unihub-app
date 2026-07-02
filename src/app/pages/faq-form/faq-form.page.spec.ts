import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ChangeDetectorRef } from '@angular/core';
import { vi } from 'vitest';
import { FaqFormPage } from './faq-form.page';
import { FaqService, type FaqEntry } from '../../core/services/faq.service';
import { FormValidationService } from '../../core/services/form-validation.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import { createRouterMock, createActivatedRouteMock } from '../../../testing/mock-factories';

const mockFaq: FaqEntry = {
  id: 'faq-1',
  question: '¿Cómo me registro?',
  answer: 'Usa el formulario de registro.',
  category: 'Cuenta',
  sort_order: 1,
  is_active: true,
  language: 'es',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('FaqFormPage', () => {
  let faqMock: {
    getFaqById: ReturnType<typeof vi.fn>;
    createFaq: ReturnType<typeof vi.fn>;
    updateFaq: ReturnType<typeof vi.fn>;
  };
  let routerMock: Router;
  let sanitizerMock: { bypassSecurityTrustHtml: ReturnType<typeof vi.fn> };
  let cdrMock: { detectChanges: ReturnType<typeof vi.fn> };
  let formValidationMock: { getErrorMessage: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    faqMock = {
      getFaqById: vi.fn(),
      createFaq: vi.fn().mockResolvedValue(undefined),
      updateFaq: vi.fn().mockResolvedValue(undefined),
    };
    routerMock = createRouterMock() as Router;
    routerMock.getCurrentNavigation = vi.fn().mockReturnValue(null);
    sanitizerMock = { bypassSecurityTrustHtml: vi.fn((value: string) => value as SafeHtml) };
    cdrMock = { detectChanges: vi.fn() };
    formValidationMock = { getErrorMessage: vi.fn((field: string) => `${field} es obligatorio`) };
  });

  function configureTestBed(routeParams: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      providers: [
        { provide: FaqService, useValue: faqMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: createActivatedRouteMock(routeParams) },
        { provide: DomSanitizer, useValue: sanitizerMock },
        { provide: ChangeDetectorRef, useValue: cdrMock },
        { provide: FormValidationService, useValue: formValidationMock },
      ],
    });
    TestBed.overrideComponent(FaqFormPage, {
      set: {
        imports: [FormsModule, ...IONIC_STUBS],
      },
    });
  }

  describe('create mode', () => {
    let component: FaqFormPage;
    let fixture: ReturnType<typeof TestBed.createComponent<FaqFormPage>>;

    beforeEach(async () => {
      configureTestBed();
      await TestBed.compileComponents();

      fixture = TestBed.createComponent(FaqFormPage);
      component = fixture.componentInstance;
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize in create mode when no id is provided', () => {
      fixture.detectChanges();
      expect(component.isEdit).toBe(false);
      expect(component.faqId).toBeNull();
      expect(component.language).toBe('es');
      expect(component.isActive).toBe(true);
    });

    it('should create a FAQ on save', async () => {
      fixture.detectChanges();
      component.question = 'New Question';
      component.answer = 'New Answer';
      component.category = 'General';
      component.language = 'es';
      component.sortOrder = 2;
      component.isActive = true;

      await component.save();
      expect(component.saving).toBe(false);
      expect(component.submitSuccess).toBe(true);
      expect(faqMock.createFaq).toHaveBeenCalledWith({
        question: 'New Question',
        answer: 'New Answer',
        category: 'General',
        language: 'es',
        sort_order: 2,
        is_active: true,
      });
      expect(component.toastMessage).toBe('FAQ creada');
    });

    it('should show validation error when required fields are empty', async () => {
      fixture.detectChanges();
      await component.save();
      expect(component.toastMessage).toBe('Completa todos los campos obligatorios');
      expect(faqMock.createFaq).not.toHaveBeenCalled();
    });

    it('should switch preview mode', () => {
      component.answer = '**Answer**';
      component.setPreviewMode('preview');
      fixture.detectChanges();
      expect(component.previewMode).toBe('preview');
      expect(sanitizerMock.bypassSecurityTrustHtml).toHaveBeenCalled();
    });
  });

  describe('edit mode', () => {
    let component: FaqFormPage;
    let fixture: ReturnType<typeof TestBed.createComponent<FaqFormPage>>;

    beforeEach(async () => {
      configureTestBed({ id: 'faq-1' });
      await TestBed.compileComponents();

      fixture = TestBed.createComponent(FaqFormPage);
      component = fixture.componentInstance;
    });

    it('should load FAQ data in edit mode', async () => {
      faqMock.getFaqById.mockResolvedValue(mockFaq);
      fixture.detectChanges();
      await vi.waitFor(() => component.question === mockFaq.question);
      expect(component.isEdit).toBe(true);
      expect(component.faqId).toBe('faq-1');
      expect(component.question).toBe(mockFaq.question);
      expect(component.answer).toBe(mockFaq.answer);
      expect(component.category).toBe(mockFaq.category);
      expect(component.language).toBe(mockFaq.language);
      expect(component.sortOrder).toBe(mockFaq.sort_order);
      expect(component.isActive).toBe(mockFaq.is_active);
    });

    it('should be in edit mode when route has id', () => {
      fixture.detectChanges();
      expect(component.isEdit).toBe(true);
      expect(component.faqId).toBe('faq-1');
    });
  });
});
