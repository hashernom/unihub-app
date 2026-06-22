import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonItem, IonLabel,
  IonInput, IonTextarea, IonSelect, IonSelectOption,
  IonButton, IonToggle, IonToast, IonSegment, IonSegmentButton,
  IonIcon, IonFooter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { save, eye, create, helpCircle } from 'ionicons/icons';
import { FaqService } from '../../core/services/faq.service';

@Component({
  selector: 'app-faq-form',
  imports: [
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton, IonItem, IonLabel,
    IonInput, IonTextarea, IonSelect, IonSelectOption,
    IonButton, IonToggle, IonToast, IonSegment, IonSegmentButton,
    IonIcon, IonFooter,
  ],
  templateUrl: './faq-form.page.html',
  styleUrls: ['./faq-form.page.scss'],
})
export class FaqFormPage implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly faqService = inject(FaqService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  isEdit = false;
  faqId: string | null = null;

  question = '';
  answer = '';
  category = '';
  language: 'es' | 'en' = 'es';
  sortOrder = 0;
  isActive = true;

  saving = false;
  showToast = false;
  toastMessage = '';
  previewMode: 'edit' | 'preview' = 'edit';

  readonly languages = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
  ] as const;

  ngOnInit(): void {
    addIcons({ save, eye, create, helpCircle });
    const id = this.route.snapshot.paramMap.get('id');
    const navigation = this.router.getCurrentNavigation();
    const stateQuestion = navigation?.extras?.state?.['question'] as string | undefined;

    if (stateQuestion) {
      this.question = stateQuestion;
    }

    if (id) {
      this.isEdit = true;
      this.faqId = id;
      this.loadFaq(id);
    }
  }

  private async loadFaq(id: string): Promise<void> {
    try {
      const faq = await this.faqService.getFaqById(id);
      if (faq) {
        this.question = faq.question;
        this.answer = faq.answer;
        this.category = faq.category;
        this.language = faq.language;
        this.sortOrder = faq.sort_order;
        this.isActive = faq.is_active;
      }
    } catch {
      this.toast('Error al cargar la FAQ');
    }
    this.cdr.detectChanges();
  }

  async save(): Promise<void> {
    if (!this.question.trim() || !this.answer.trim() || !this.category.trim()) {
      this.toast('Completa todos los campos obligatorios');
      return;
    }

    this.saving = true;
    try {
      const data = {
        question: this.question.trim(),
        answer: this.answer.trim(),
        category: this.category.trim(),
        language: this.language,
        sort_order: this.sortOrder,
        is_active: this.isActive,
      };

      if (this.isEdit && this.faqId) {
        await this.faqService.updateFaq(this.faqId, data);
        this.toast('FAQ actualizada');
      } else {
        await this.faqService.createFaq(data);
        this.toast('FAQ creada');
      }
      setTimeout(() => this.router.navigate(['/admin/faq']), 1000);
    } catch {
      this.toast('Error al guardar la FAQ');
    }
    this.saving = false;
  }

  get renderedAnswer(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.renderMarkdown(this.answer));
  }

  setPreviewMode(mode: 'edit' | 'preview'): void {
    this.previewMode = mode;
  }

  private renderMarkdown(text: string): string {
    if (!text) return '';

    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Lists
    const lines = html.split('\n');
    let inList = false;
    let processed = '';

    for (const line of lines) {
      const listMatch = line.match(/^\s*[-*+]\s+(.*)$/);
      if (listMatch) {
        if (!inList) {
          processed += '<ul>';
          inList = true;
        }
        processed += `<li>${listMatch[1]}</li>`;
      } else {
        if (inList) {
          processed += '</ul>';
          inList = false;
        }
        processed += `${line}<br>`;
      }
    }

    if (inList) processed += '</ul>';

    return processed;
  }

  private toast(msg: string): void {
    this.toastMessage = msg;
    this.showToast = true;
  }
}
