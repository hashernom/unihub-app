import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { SlicePipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonToggle, IonInput,
  IonBadge, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonToast, IonAlert, IonSegment, IonSegmentButton, IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, trash, arrowUp, arrowDown, search, globe } from 'ionicons/icons';
import { FaqService, type FaqEntry } from '../../core/services/faq.service';

interface FaqGroup {
  category: string;
  items: FaqEntry[];
}

@Component({
  selector: 'app-admin-faq',
  imports: [
    FormsModule, SlicePipe, UpperCasePipe,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton, IonButton, IonIcon,
    IonList, IonItem, IonLabel, IonToggle, IonInput,
    IonBadge, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonToast, IonAlert, IonSegment, IonSegmentButton, IonSpinner,
  ],
  templateUrl: './admin-faq.page.html',
  styleUrls: ['./admin-faq.page.scss'],
})
export class AdminFaqPage implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly faqService = inject(FaqService);
  private readonly router = inject(Router);

  faqs: FaqEntry[] = [];
  filteredFaqs: FaqEntry[] = [];
  groupedFaqs: FaqGroup[] = [];
  categories: string[] = [];
  loading = true;
  searchQuery = '';
  activeFilter: 'all' | 'active' | 'inactive' = 'all';
  languageFilter: 'all' | 'es' | 'en' = 'all';

  showToast = false;
  toastMessage = '';
  deleteTarget: FaqEntry | null = null;
  showDeleteAlert = false;

  readonly deleteAlertButtons = [
    { text: 'Cancelar', role: 'cancel', handler: () => { this.deleteTarget = null; } },
    { text: 'Eliminar', role: 'destructive', handler: () => this.onDeleteConfirm() },
  ];

  ngOnInit(): void {
    addIcons({ add, create, trash, arrowUp, arrowDown, search, globe });
    this.loadFaqs();
  }

  ionViewWillEnter(): void {
    this.loadFaqs();
  }

  async loadFaqs(): Promise<void> {
    this.loading = true;
    try {
      this.faqs = await this.faqService.getFaqs();
      this.categories = await this.faqService.getCategories();
      this.applyFilters();
    } catch {
      this.toast('Error al cargar FAQs');
    }
    this.loading = false;
    this.cdr.detectChanges();
  }

  applyFilters(): void {
    let result = [...this.faqs];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q),
      );
    }

    if (this.activeFilter === 'active') {
      result = result.filter((f) => f.is_active);
    } else if (this.activeFilter === 'inactive') {
      result = result.filter((f) => !f.is_active);
    }

    if (this.languageFilter !== 'all') {
      result = result.filter((f) => f.language === this.languageFilter);
    }

    this.filteredFaqs = result;
    this.groupedFaqs = this.groupByCategory(result);
  }

  private groupByCategory(faqs: FaqEntry[]): FaqGroup[] {
    const map = new Map<string, FaqEntry[]>();
    for (const f of faqs) {
      if (!map.has(f.category)) map.set(f.category, []);
      map.get(f.category)!.push(f);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, items]) => ({ category, items: items.sort((a, b) => a.sort_order - b.sort_order) }));
  }

  onSearchInput(event: Event): void {
    this.searchQuery = (event.target as HTMLIonInputElement).value?.toString() ?? '';
    this.applyFilters();
  }

  setActiveFilter(filter: 'all' | 'active' | 'inactive'): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  setLanguageFilter(filter: 'all' | 'es' | 'en'): void {
    this.languageFilter = filter;
    this.applyFilters();
  }

  async toggleActive(faq: FaqEntry): Promise<void> {
    try {
      await this.faqService.toggleActive(faq.id, !faq.is_active);
      faq.is_active = !faq.is_active;
      this.applyFilters();
    } catch {
      this.toast('Error al cambiar estado');
    }
  }

  async moveUp(group: FaqGroup, index: number): Promise<void> {
    if (index <= 0) return;
    await this.swapOrder(group, index, index - 1);
  }

  async moveDown(group: FaqGroup, index: number): Promise<void> {
    if (index >= group.items.length - 1) return;
    await this.swapOrder(group, index, index + 1);
  }

  private async swapOrder(group: FaqGroup, fromIndex: number, toIndex: number): Promise<void> {
    const items = [...group.items];
    [items[fromIndex], items[toIndex]] = [items[toIndex], items[fromIndex]];

    try {
      for (let i = 0; i < items.length; i++) {
        await this.faqService.updateFaq(items[i].id, { sort_order: i });
        items[i].sort_order = i;
      }
      this.applyFilters();
    } catch {
      this.toast('Error al reordenar');
    }
  }

  editFaq(faq: FaqEntry): void {
    this.router.navigate(['/admin/faq/edit', faq.id]);
  }

  newFaq(): void {
    this.router.navigate(['/admin/faq/new']);
  }

  confirmDelete(faq: FaqEntry): void {
    this.deleteTarget = faq;
    this.showDeleteAlert = true;
  }

  async onDeleteConfirm(): Promise<void> {
    if (!this.deleteTarget) return;
    try {
      await this.faqService.deleteFaq(this.deleteTarget.id);
      this.faqs = this.faqs.filter((f) => f.id !== this.deleteTarget!.id);
      this.applyFilters();
      this.toast('FAQ eliminada');
    } catch {
      this.toast('Error al eliminar FAQ');
    }
    this.deleteTarget = null;
  }

  private toast(msg: string): void {
    this.toastMessage = msg;
    this.showToast = true;
  }
}
