import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import Chart from "chart.js/auto";
import { jsPDF } from "jspdf";
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent,
  IonSpinner, IonItem, IonLabel, IonList,
  IonButton, IonIcon, IonToast,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import { download } from "ionicons/icons";
import { SurveyService, type SurveyResults, type SurveyQuestionResult } from "../../core/services/survey.service";
import { environment } from "../../../environments/environment";

@Component({
  selector: "app-survey-results",
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton, IonCard,
    IonCardHeader, IonCardTitle, IonCardContent,
    IonSpinner, IonItem, IonLabel, IonList,
    IonButton, IonIcon, IonToast,
  ],
  templateUrl: "./survey-results.page.html",
  styles: [`
    .loading-container { display: flex; justify-content: center; align-items: center; height: 200px; }
    .results-header { padding: 0 4px 16px; }
    .results-header h2 { margin: 0 0 4px; font-size: 1.3rem; }
    .stats-row { display: flex; gap: 12px; margin-top: 8px; flex-wrap: wrap; }
    .stat-card { background: var(--ion-color-light); border-radius: 12px; padding: 12px 16px; text-align: center; flex: 1; min-width: 100px; }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--ion-color-primary); }
    .stat-label { font-size: 0.8rem; color: var(--ion-color-medium); margin-top: 2px; }
    .question-card { margin: 12px 0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .chart-container { height: 200px; margin: 8px 0; }
    .rating-average { font-size: 1.2rem; font-weight: 600; color: var(--ion-color-primary); text-align: center; padding: 8px; }
    .empty-state { text-align: center; padding: 32px 16px; color: var(--ion-color-medium); }
    .empty-state p { font-size: 1.1rem; }
    .export-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
  `],
})
export class SurveyResultsPage implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly surveyService = inject(SurveyService);

  loading = true;
  results: SurveyResults | null = null;
  error = false;
  exporting = false;
  showToast = false;
  toastMessage = "";
  private charts: Chart[] = [];

  constructor() {
    addIcons({ download });
  }

  ngOnInit(): void {
    const surveyId = this.route.snapshot.paramMap.get("id");
    if (surveyId) {
      this.loadResults(surveyId);
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  private async loadResults(surveyId: string): Promise<void> {
    try {
      this.results = await this.surveyService.getResults(surveyId);
      if (this.results) {
        setTimeout(() => { this.renderCharts(); this.cdr.detectChanges(); }, 100);
      }
    } catch {
      this.error = true;
    }
    if (!this.results && !this.error) {
      this.error = true;
    }
    this.loading = false;
    this.cdr.detectChanges();
  }

  private renderCharts(): void {
    this.destroyCharts();
    if (!this.results) return;

    for (const q of this.results.questions) {
      const canvas = document.getElementById("chart-" + q.question_id) as HTMLCanvasElement;
      if (!canvas) continue;

      if (q.question_type === "single_choice" || q.question_type === "multiple_choice") {
        const labels = Object.keys(q.option_counts ?? {});
        const data = Object.values(q.option_counts ?? {});
        if (labels.length === 0) continue;

        this.charts.push(new Chart(canvas, {
          type: "bar",
          data: {
            labels,
            datasets: [{
              label: "Respuestas",
              data,
              backgroundColor: [
                "rgba(54, 162, 235, 0.7)",
                "rgba(255, 159, 64, 0.7)",
                "rgba(75, 192, 192, 0.7)",
                "rgba(153, 102, 255, 0.7)",
                "rgba(255, 99, 132, 0.7)",
              ],
              borderColor: [
                "rgba(54, 162, 235, 1)",
                "rgba(255, 159, 64, 1)",
                "rgba(75, 192, 192, 1)",
                "rgba(153, 102, 255, 1)",
                "rgba(255, 99, 132, 1)",
              ],
              borderWidth: 1,
            }],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { beginAtZero: true, ticks: { precision: 0 } },
            },
          },
        }));
      } else if (q.question_type === "rating") {
        const labels = ["1", "2", "3", "4", "5"];
        const data = [
          q.rating_distribution?.["1"] ?? 0,
          q.rating_distribution?.["2"] ?? 0,
          q.rating_distribution?.["3"] ?? 0,
          q.rating_distribution?.["4"] ?? 0,
          q.rating_distribution?.["5"] ?? 0,
        ];

        this.charts.push(new Chart(canvas, {
          type: "bar",
          data: {
            labels,
            datasets: [{
              label: "Respuestas",
              data,
              backgroundColor: "rgba(255, 159, 64, 0.7)",
              borderColor: "rgba(255, 159, 64, 1)",
              borderWidth: 1,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, ticks: { precision: 0 } },
              x: { title: { display: true, text: "Puntuación" } },
            },
          },
        }));
      }
    }
  }

  private destroyCharts(): void {
    for (const c of this.charts) {
      c.destroy();
    }
    this.charts = [];
  }

  responseRate(): number {
    if (!this.results || this.results.total_students === 0) return 0;
    return Math.round((this.results.total_responses / this.results.total_students) * 100);
  }

  hasOptionData(q: SurveyQuestionResult): boolean {
    return q.option_counts !== undefined && Object.keys(q.option_counts).length > 0;
  }

  hasTextResponses(q: SurveyQuestionResult): boolean {
    return (q.text_responses?.length ?? 0) > 0;
  }

  async exportCsv(): Promise<void> {
    if (!this.results) return;
    if (this.results.total_responses === 0) {
      this.toast("Sin datos para exportar");
      return;
    }

    this.exporting = true;
    try {
      const token = await this.surveyService.getAccessToken();

      const res = await fetch(
        `${environment.supabaseUrl}/functions/v1/export-survey-results`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ survey_id: this.results.survey_id }),
        },
      );

      if (!res.ok) {
        this.toast("Error al exportar CSV");
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("json")) {
        const data = await res.json();
        this.toast(data.error ?? "Sin datos para exportar");
        return;
      }

      const blob = await res.blob();
      this.downloadBlob(blob, `encuesta-${this.results.survey_id}.csv`);
      this.toast("CSV descargado");
    } catch {
      this.toast("Error al exportar CSV");
    }
    this.exporting = false;
  }

  async exportPdf(): Promise<void> {
    if (!this.results) return;
    if (this.results.total_responses === 0) {
      this.toast("Sin datos para exportar");
      return;
    }

    this.exporting = true;
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      let y = 20;

      const addText = (text: string, size = 11, x = 20): void => {
        if (y > 275) { pdf.addPage(); y = 20; }
        pdf.setFontSize(size);
        pdf.text(text, x, y);
        y += size * 0.5 + 1;
      };

      addText(this.results.survey_title, 18);
      addText(`Generado: ${new Date().toLocaleDateString()}`, 10);
      addText(`Total respuestas: ${this.results.total_responses}`);
      addText(`Tasa de respuesta: ${this.responseRate()}%`);
      y += 4;

      for (const q of this.results.questions) {
        if (y > 250) { pdf.addPage(); y = 20; }
        addText(q.question_text, 13);
        y -= 2;

        if (q.question_type === "rating" && q.average_rating) {
          addText(`Promedio: ${q.average_rating} / 5`, 10, 25);
        }

        const canvas = document.getElementById("chart-" + q.question_id) as HTMLCanvasElement;
        if (canvas) {
          const imgData = canvas.toDataURL("image/png");
          const ratio = canvas.width / canvas.height;
          const imgW = 170;
          const imgH = Math.min(imgW / ratio, 60);
          if (y + imgH > 275) { pdf.addPage(); y = 20; }
          pdf.addImage(imgData, "PNG", 20, y, imgW, imgH);
          y += imgH + 6;
        }

        if (q.question_type === "text" && q.text_responses) {
          for (const resp of q.text_responses.slice(0, 30)) {
            if (y > 265) { pdf.addPage(); y = 20; }
            const lines = pdf.splitTextToSize(resp, 160);
            pdf.setFontSize(9);
            pdf.text(lines, 25, y);
            y += lines.length * 4 + 2;
          }
          if (q.text_responses.length > 30) {
            addText(`... y ${q.text_responses.length - 30} más`, 9, 25);
          }
        }

        y += 4;
      }

      pdf.save(`encuesta-${this.results.survey_id}.pdf`);
    } catch {
      this.toast("Error al exportar PDF");
    }
    this.exporting = false;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private toast(msg: string): void {
    this.toastMessage = msg;
    this.showToast = true;
  }
}
