import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonButton, IonIcon,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonToast,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle, addCircle, trendingUp, helpCircle } from 'ionicons/icons';
import { HelpQueryService, type HelpQueryGroup, type WeeklyResolution } from '../../core/services/help-query.service';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-help-queries',
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton, IonButton, IonIcon,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonToast,
    IonSpinner,
  ],
  templateUrl: './admin-help-queries.page.html',
  styleUrls: ['./admin-help-queries.page.scss'],
})
export class AdminHelpQueriesPage implements OnInit {
  @ViewChild('resolutionChart') chartCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly helpQueryService = inject(HelpQueryService);
  private readonly router = inject(Router);

  groups: HelpQueryGroup[] = [];
  topQueries: HelpQueryGroup[] = [];
  weeklyStats: WeeklyResolution[] = [];
  loading = true;
  showToast = false;
  toastMessage = '';

  private chart?: Chart;

  ngOnInit(): void {
    addIcons({ 'checkmark-circle': checkmarkCircle, 'add-circle': addCircle, 'trending-up': trendingUp, 'help-circle': helpCircle });
    this.loadAll();
  }

  async loadAll(): Promise<void> {
    this.loading = true;
    try {
      const [groups, top, weekly] = await Promise.all([
        this.helpQueryService.getGroupedUnresolvedQueries(),
        this.helpQueryService.getTopUnresolvedQueries(10),
        this.helpQueryService.getWeeklyResolutionStats(),
      ]);
      this.groups = groups;
      this.topQueries = top;
      this.weeklyStats = weekly;
    } catch {
      this.toast('Error al cargar consultas');
    }
    this.loading = false;
    this.cdr.detectChanges();
    this.renderChart();
  }

  async markResolved(group: HelpQueryGroup): Promise<void> {
    try {
      await this.helpQueryService.markAllInGroupResolved(group.normalized_text);
      this.groups = this.groups.filter((g) => g.normalized_text !== group.normalized_text);
      this.topQueries = this.topQueries.filter((g) => g.normalized_text !== group.normalized_text);
      this.weeklyStats = await this.helpQueryService.getWeeklyResolutionStats();
      this.renderChart();
      this.toast('Marcadas como resueltas');
    } catch {
      this.toast('Error al marcar como resuelta');
    }
  }

  async createFaqFromQuery(group: HelpQueryGroup): Promise<void> {
    await this.markResolved(group);
    this.router.navigate(['/admin/faq/new'], {
      state: { question: group.query_text },
    });
  }

  get overallRate(): number {
    const total = this.weeklyStats.reduce((sum, s) => sum + s.total, 0);
    const resolved = this.weeklyStats.reduce((sum, s) => sum + s.resolved, 0);
    return total > 0 ? Math.round((resolved / total) * 1000) / 10 : 0;
  }

  private renderChart(): void {
    if (!this.chartCanvas?.nativeElement || this.weeklyStats.length === 0) return;

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: this.weeklyStats.map((s) => s.week),
        datasets: [
          {
            label: 'Resueltas',
            data: this.weeklyStats.map((s) => s.resolved),
            backgroundColor: '#27AE60',
          },
          {
            label: 'Total',
            data: this.weeklyStats.map((s) => s.total),
            backgroundColor: '#4A90D9',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, max: 100 },
        },
      },
    });
  }

  private toast(msg: string): void {
    this.toastMessage = msg;
    this.showToast = true;
  }
}
