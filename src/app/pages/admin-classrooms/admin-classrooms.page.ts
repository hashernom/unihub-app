import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonButton, IonIcon, IonBadge,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonChip, IonLabel, IonSegment, IonSegmentButton,
  IonModal, IonToggle, IonToast,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, toggle, business, school, checkmarkCircle, time } from 'ionicons/icons';
import { EventService, type Classroom, type CalendarEvent } from '../../core/services/event.service';

@Component({
  selector: 'app-admin-classrooms',
  imports: [
    RouterLink, DatePipe,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton, IonButton, IonIcon, IonBadge,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonChip, IonLabel, IonSegment, IonSegmentButton,
    IonModal, IonToggle, IonToast,
  ],
  templateUrl: './admin-classrooms.page.html',
  styleUrl: './admin-classrooms.page.scss',
})
export class AdminClassroomsPage implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  readonly eventService = inject(EventService);

  classrooms: Classroom[] = [];
  filteredClassrooms: Classroom[] = [];
  buildings: string[] = [];
  activeBuildingFilter: string | null = null;
  loading = true;

  selectedClassroom: Classroom | null = null;
  showAvailability = false;
  availabilityEvents: CalendarEvent[] = [];
  availabilityLoading = false;
  weekDays: { date: Date; label: string }[] = [];
  weekStart = '';

  showToast = false;
  toastMessage = '';

  ngOnInit(): void {
    addIcons({ add, create, toggle, business, school, checkmarkCircle, time });
    this.loadAll();
  }

  async loadAll(): Promise<void> {
    this.loading = true;
    try {
      this.classrooms = await this.eventService.getClassrooms();
      this.buildings = await this.eventService.getBuildings();
      this.applyFilter();
    } catch {
      this.classrooms = [];
      this.toast('Error al cargar aulas');
    }
    this.loading = false;
    this.cdr.detectChanges();
  }

  filterByBuilding(building: string | null): void {
    this.activeBuildingFilter = building;
    this.applyFilter();
  }

  private applyFilter(): void {
    if (this.activeBuildingFilter) {
      this.filteredClassrooms = this.classrooms.filter(
        (c) => c.building === this.activeBuildingFilter,
      );
    } else {
      this.filteredClassrooms = [...this.classrooms];
    }
  }

  get buildingsWithCount(): { name: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const c of this.classrooms) {
      const b = c.building ?? 'Sin edificio';
      counts.set(b, (counts.get(b) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }

  async toggleActive(classroom: Classroom): Promise<void> {
    try {
      await this.eventService.updateClassroom(classroom.id, { is_active: !classroom.is_active });
      classroom.is_active = !classroom.is_active;
    } catch {
      this.toast('Error al cambiar estado');
    }
  }

  async openAvailability(classroom: Classroom): Promise<void> {
    this.selectedClassroom = classroom;
    this.showAvailability = true;
    this.availabilityLoading = true;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    this.weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      this.weekDays.push({
        date: d,
        label: d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
      });
    }

    this.weekStart = monday.toISOString();
    const weekEnd = new Date(monday);
    weekEnd.setDate(monday.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);

    try {
      this.availabilityEvents = await this.eventService.getClassroomAvailability(
        classroom.id,
        this.weekStart,
        weekEnd.toISOString(),
      );
    } catch {
      this.availabilityEvents = [];
    }
    this.availabilityLoading = false;
    this.cdr.detectChanges();
  }

  closeAvailability(): void {
    this.showAvailability = false;
    this.selectedClassroom = null;
    this.availabilityEvents = [];
  }

  getEventsForDay(date: Date): CalendarEvent[] {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return this.availabilityEvents.filter((e) => {
      const start = new Date(e.start_time);
      return start >= dayStart && start <= dayEnd;
    });
  }

  formatHour(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  private toast(msg: string): void {
    this.toastMessage = msg;
    this.showToast = true;
  }
}
