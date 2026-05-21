import { Component, OnInit, inject, ChangeDetectorRef } from "@angular/core";
import { DatePipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButton, IonIcon, IonRefresher,
  IonRefresherContent, IonChip, IonLabel, IonSegment,
  IonSegmentButton, IonModal,
  IonButtons, IonSpinner, IonSelect, IonSelectOption,
  IonItem, IonText,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import { calendar, today, arrowBack, arrowForward, time, location, person, alertCircle, business, school, repeat, funnel } from "ionicons/icons";
import { EventService, type CalendarEvent, type Classroom } from "../../core/services/event.service";
import { FullCalendarModule } from "@fullcalendar/angular";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { CalendarOptions, EventClickArg } from "@fullcalendar/core/index.js";

@Component({
  selector: "app-tab-calendar",
  imports: [
    DatePipe, RouterLink,
    FullCalendarModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButton, IonIcon, IonRefresher,
    IonRefresherContent, IonChip, IonLabel, IonSegment,
    IonSegmentButton, IonModal,
    IonButtons, IonSpinner, IonSelect, IonSelectOption,
    IonItem, IonText,
  ],
  templateUrl: "./tab-calendar.page.html",
  styleUrl: "./tab-calendar.page.scss",
})
export class TabCalendarPage implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  readonly eventService = inject(EventService);

  events: CalendarEvent[] = [];
  allClassrooms: Classroom[] = [];
  selectedEvent: CalendarEvent | null = null;
  selectedEventClassroom: Classroom | null = null;
  loading = true;
  showModal = false;
  activeFilter: string | null = null;
  activeClassroomFilter: string | null = null;
  currentView: "dayGridMonth" | "timeGridWeek" | "timeGridDay" = "dayGridMonth";

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: "dayGridMonth",
    locale: "es",
    firstDay: 1,
    height: "auto",
    headerToolbar: false,
    events: [],
    eventClick: (arg) => this.onEventClick(arg),
    dayMaxEventRows: 3,
    eventTimeFormat: {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    },
  };

  readonly eventTypes = [
    { key: null, label: "Todos", color: "" },
    { key: "class", label: "Clases", color: "#3B82F6" },
    { key: "exam", label: "Exámenes", color: "#EF4444" },
    { key: "meeting", label: "Reuniones", color: "#22C55E" },
    { key: "workshop", label: "Talleres", color: "#F97316" },
    { key: "other", label: "Otros", color: "#6B7280" },
  ];

  ngOnInit(): void {
    addIcons({ calendar, today, arrowBack, arrowForward, time, location, person, alertCircle, business, school, repeat, funnel });
    this.loadClassrooms();
    this.loadEvents();
  }

  async loadClassrooms(): Promise<void> {
    try {
      this.allClassrooms = await this.eventService.getClassrooms(true);
    } catch {
      this.allClassrooms = [];
    }
  }

  async loadEvents(): Promise<void> {
    this.loading = true;
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59).toISOString();
      this.events = await this.eventService.getEvents(start, end);
      this.updateCalendarEvents();
    } catch {
      this.events = [];
    }
    this.loading = false;
    this.cdr.detectChanges();
  }

  private updateCalendarEvents(): void {
    let filtered = this.events;

    if (this.activeFilter) {
      filtered = filtered.filter((e) => e.event_type === this.activeFilter);
    }
    if (this.activeClassroomFilter) {
      filtered = filtered.filter((e) => e.classroom_id === this.activeClassroomFilter);
    }

    this.calendarOptions = {
      ...this.calendarOptions,
      events: filtered.map((e) => ({
        id: e.id,
        title: e.recurring_rule ? `⟳ ${e.title}` : e.title,
        start: e.start_time,
        end: e.end_time,
        backgroundColor: e.color || this.eventService.getEventColor(e.event_type),
        borderColor: e.color || this.eventService.getEventColor(e.event_type),
        textColor: "#fff",
        extendedProps: { event_type: e.event_type, is_recurring: !!e.recurring_rule, classroom_id: e.classroom_id },
      })),
    };
  }

  async doRefresh(event: CustomEvent): Promise<void> {
    await this.loadEvents();
    (event.target as HTMLIonRefresherElement).complete();
  }

  onEventClick(arg: EventClickArg): void {
    const eventId = arg.event.id;
    const found = this.events.find((e) => e.id === eventId);
    if (found) {
      this.selectedEvent = found;
      this.selectedEventClassroom = null;
      this.loadClassroomForEvent(found.classroom_id);
      this.showModal = true;
      this.cdr.detectChanges();
    }
  }

  private async loadClassroomForEvent(classroomId: string | null): Promise<void> {
    if (!classroomId) return;
    this.selectedEventClassroom = this.allClassrooms.find((c) => c.id === classroomId) ?? null;
    if (!this.selectedEventClassroom) {
      try {
        const classrooms = await this.eventService.getClassrooms(false);
        this.selectedEventClassroom = classrooms.find((c) => c.id === classroomId) ?? null;
        const activeClassrooms = classrooms.filter((c) => c.is_active);
        for (const ac of activeClassrooms) {
          if (!this.allClassrooms.find((c) => c.id === ac.id)) {
            this.allClassrooms.push(ac);
          }
        }
      } catch {
        this.selectedEventClassroom = null;
      }
    }
  }

  onCalendarViewChange(view: string | undefined): void {
    if (!view) return;
    this.currentView = view as "dayGridMonth" | "timeGridWeek" | "timeGridDay";
    this.calendarOptions = { ...this.calendarOptions, initialView: this.currentView };
  }

  goToToday(): void {
    this.calendarOptions = { ...this.calendarOptions };
    setTimeout(() => {
      const el = document.querySelector(".full-calendar") as unknown as { getApi: () => { today: () => void } };
      el?.getApi().today();
    });
  }

  navigateDate(direction: -1 | 1): void {
    this.calendarOptions = { ...this.calendarOptions };
    setTimeout(() => {
      const el = document.querySelector(".full-calendar") as unknown as { getApi: () => { prev: () => void; next: () => void } };
      if (direction === -1) el?.getApi().prev();
      else el?.getApi().next();
    });
  }

  filterByType(type: string | null): void {
    this.activeFilter = type;
    this.updateCalendarEvents();
  }

  filterByClassroom(classroomId: string | null): void {
    this.activeClassroomFilter = classroomId;
    this.updateCalendarEvents();
  }

  hasActiveFilters(): boolean {
    return this.activeFilter !== null || this.activeClassroomFilter !== null;
  }

  clearFilters(): void {
    this.activeFilter = null;
    this.activeClassroomFilter = null;
    this.updateCalendarEvents();
  }

  dismissModal(): void {
    this.showModal = false;
    this.selectedEvent = null;
    this.selectedEventClassroom = null;
  }

  getEventCountByType(type: string): number {
    return this.events.filter((e) => e.event_type === type).length;
  }

  getEventCountByClassroom(classroomId: string): number {
    return this.events.filter((e) => e.classroom_id === classroomId).length;
  }
}
