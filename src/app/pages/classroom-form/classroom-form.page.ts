import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonItem, IonLabel,
  IonInput, IonButton, IonToast,
  IonList, IonListHeader,
} from '@ionic/angular/standalone';
import { EventService } from '../../core/services/event.service';

@Component({
  selector: 'app-classroom-form',
  imports: [
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton, IonItem, IonLabel,
    IonInput, IonButton, IonToast,
    IonList, IonListHeader,
  ],
  templateUrl: './classroom-form.page.html',
  styleUrl: './classroom-form.page.scss',
})
export class ClassroomFormPage implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  isEdit = false;
  classroomId: string | null = null;
  name = '';
  building = '';
  capacity: number | null = null;
  saving = false;
  showToast = false;
  toastMessage = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.classroomId = id;
      this.loadClassroom(id);
    }
  }

  private async loadClassroom(id: string): Promise<void> {
    try {
      const classrooms = await this.eventService.getClassrooms();
      const classroom = classrooms.find((c) => c.id === id);
      if (classroom) {
        this.name = classroom.name;
        this.building = classroom.building ?? '';
        this.capacity = classroom.capacity;
      }
    } catch {
      this.toast('Error al cargar el aula');
    }
  }

  async save(): Promise<void> {
    const trimmedName = this.name.trim();
    if (!trimmedName) {
      this.toast('El nombre del aula es obligatorio');
      return;
    }

    if (this.capacity !== null && this.capacity <= 0) {
      this.toast('La capacidad debe ser mayor a 0');
      return;
    }

    this.saving = true;
    try {
      if (this.isEdit && this.classroomId) {
        await this.eventService.updateClassroom(this.classroomId, {
          name: trimmedName,
          building: this.building.trim() || null,
          capacity: this.capacity,
        });
        this.toast('Aula actualizada');
      } else {
        await this.eventService.createClassroom({
          name: trimmedName,
          building: this.building.trim() || null,
          capacity: this.capacity,
        });
        this.toast('Aula creada');
      }
      setTimeout(() => this.router.navigate(['/admin/classrooms']), 1000);
    } catch {
      this.toast('Error al guardar el aula');
    }
    this.saving = false;
  }

  private toast(msg: string): void {
    this.toastMessage = msg;
    this.showToast = true;
  }
}
