import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from "@angular/core";
import { RouterLink, Router } from "@angular/router";
import { DatePipe } from "@angular/common";
import { Subject, Subscription, firstValueFrom } from "rxjs";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonButton, IonIcon, IonRefresher,
  IonRefresherContent,
  IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonChip, IonLabel,
  IonSearchbar, IonGrid, IonRow, IonCol,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import { personCircle, alertCircle, checkmarkCircle, calendar, search, newspaperOutline, calendarOutline, documentTextOutline } from "ionicons/icons";
import { AuthService } from "../../core/services/auth.service";
import { ErrorHandlerService } from "../../core/services/error-handler.service";
import { SupabaseService } from "../../core/services/supabase.service";
import { AnnouncementService, type Announcement } from "../../core/services/announcement.service";
import { NoticeService, type Notice } from "../../core/services/notice.service";
import { RealtimeService } from "../../core/services/realtime.service";
import { SurveyService } from "../../core/services/survey.service";
import { AnnouncementCardComponent } from "../../shared/components/announcement-card/announcement-card.component";
import { NoticeCardComponent } from "../../shared/components/notice-card/notice-card.component";
import { EmptyStateComponent } from "../../shared/components/empty-state/empty-state.component";
import { ErrorStateComponent } from "../../shared/components/error-state/error-state.component";
import { SkeletonListComponent } from "../../shared/components/skeleton-list/skeleton-list.component";

interface UpcomingEvent {
  id: string;
  title: string;
  start_time: string;
  event_type: string;
}

@Component({
  selector: "app-tab-dashboard",
  imports: [
    RouterLink, DatePipe,
    AnnouncementCardComponent, NoticeCardComponent,
    EmptyStateComponent, ErrorStateComponent, SkeletonListComponent,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonButton, IonIcon, IonRefresher,
    IonRefresherContent,
    IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonChip, IonLabel,
    IonSearchbar, IonGrid, IonRow, IonCol,
  ],
  templateUrl: "./tab-dashboard.page.html",
  styleUrl: "./tab-dashboard.page.scss",
})
export class TabDashboardPage implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);
  private readonly announcementService = inject(AnnouncementService);
  private readonly noticeService = inject(NoticeService);
  private readonly realtime = inject(RealtimeService);
  private readonly surveyService = inject(SurveyService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly router = inject(Router);

  loading = true;
  error = false;
  announcements: Announcement[] = [];
  notices: Notice[] = [];
  events: UpcomingEvent[] = [];
  surveyCount = 0;
  activeCategory: string | null = null;
  searchQuery = "";
  filteredCount = 0;
  private readonly searchSubject = new Subject<string>();

  readonly categories = [
    { key: null, label: "Todos" },
    { key: "urgent", label: "Urgente" },
    { key: "academic", label: "Académico" },
    { key: "event", label: "Evento" },
    { key: "general", label: "General" },
  ] as const;

  private realtimeSubscriptions: Subscription[] = [];

  ngOnInit(): void {
    addIcons({ 'person-circle': personCircle, alertCircle, checkmarkCircle, calendar, search, 'newspaper-outline': newspaperOutline, 'calendar-outline': calendarOutline, 'document-text-outline': documentTextOutline });
    this.setupRealtime();
    this.setupSearch();
    this.loadAll();
  }

  async ionViewWillEnter(): Promise<void> {
    const isAdmin = await firstValueFrom(this.auth.isAdmin$);
    if (isAdmin) {
      this.router.navigate(['/admin/dashboard']);
      return;
    }
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.realtimeSubscriptions.forEach((s) => s.unsubscribe());
    this.realtimeSubscriptions = [];
  }

  async loadAll(): Promise<void> {
    this.loading = true;
    this.error = false;
    await Promise.all([
      this.withTimeout(this.loadAnnouncements(), 5000),
      this.withTimeout(this.loadNotices(), 5000),
      this.withTimeout(this.loadEvents(), 5000),
      this.withTimeout(this.loadSurveyCount(), 5000),
    ]);
    this.loading = false;
    this.cdr.detectChanges();
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms)),
    ]);
  }

  private setupRealtime(): void {
    try {
      this.realtime.subscribe('announcements');
      this.realtime.subscribe('notices');

      this.realtimeSubscriptions.push(
        this.realtime.onChanges('announcements').subscribe(() => this.loadAnnouncements()),
      );
      this.realtimeSubscriptions.push(
        this.realtime.onChanges('notices').subscribe(() => this.loadNotices()),
      );
    } catch {
      console.warn("[Dashboard] Realtime subscription failed");
    }
  }

  async doRefresh(event: CustomEvent): Promise<void> {
    await this.loadAll();
    (event.target as HTMLIonRefresherElement).complete();
  }

  filterByCategory(category: string | null): void {
    this.activeCategory = category;
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLIonSearchbarElement).value ?? "";
    this.searchSubject.next(value);
  }

  private setupSearch(): void {
    this.realtimeSubscriptions.push(
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged(),
      ).subscribe((q) => {
        this.searchQuery = q;
      }),
    );
  }

  get filteredAnnouncements(): Announcement[] {
    let result = this.announcements;

    if (this.activeCategory) {
      result = result.filter((a) => a.category === this.activeCategory);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q),
      );
    }

    return result;
  }

  private async loadAnnouncements(): Promise<void> {
    try {
      const { data } = await this.announcementService.getAnnouncements();
      this.announcements = data;
    } catch (err) {
      this.error = true;
      this.errorHandler.handleHttpError(err, () => this.loadAll());
    }
  }

  private async loadNotices(): Promise<void> {
    try {
      const { data } = await this.noticeService.getNotices();
      this.notices = data;
    } catch (err) {
      this.error = true;
      this.errorHandler.handleHttpError(err, () => this.loadAll());
    }
  }

  private async loadEvents(): Promise<void> {
    try {
      const { data } = await this.supabase.client
        .from("events")
        .select("id, title, start_time, event_type")
        .gte("start_time", new Date().toISOString())
        .eq("is_cancelled", false)
        .order("start_time", { ascending: true })
        .limit(3);
      this.events = (data ?? []) as UpcomingEvent[];
    } catch (err) {
      this.error = true;
      this.events = [];
      this.errorHandler.handleHttpError(err, () => this.loadAll());
    }
  }

  private async loadSurveyCount(): Promise<void> {
    try {
      const user = await firstValueFrom(this.auth.currentUser$);
      if (user) {
        this.surveyCount = await this.surveyService.getPendingSurveyCount(user.id);
      }
    } catch (err) {
      this.error = true;
      this.surveyCount = 0;
      this.errorHandler.handleHttpError(err, () => this.loadAll());
    }
  }
}
