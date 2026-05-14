import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute  } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonItem, IonLabel,
  IonInput, IonTextarea, IonSelect, IonSelectOption,
  IonButton, IonToggle, IonDatetime, IonToast,
} from '@ionic/angular/standalone';
import { AnnouncementService, type Announcement } from '../../core/services/announcement.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-announcement-form',
  imports: [
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton, IonItem, IonLabel,
    IonInput, IonTextarea, IonSelect, IonSelectOption,
    IonButton, IonToggle, IonDatetime, IonToast,
  ],
  templateUrl: './announcement-form.page.html',
  styleUrl: './announcement-form.page.scss',
})
export class AnnouncementFormPage implements OnInit {
  private readonly announcementService = inject(AnnouncementService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  isEdit = false;
  announcementId: string | null = null;
  title = '';
  body = '';
  category: 'general' | 'academic' | 'event' | 'urgent' = 'general';
  isPinned = false;
  expiresAt: string | null = null;
  saving = false;
  showToast = false;
  toastMessage = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.announcementId = id;
      this.loadAnnouncement(id);
    }
  }

  private async loadAnnouncement(id: string): Promise<void> {
    try {
      const announcements = await this.announcementService.getAllAnnouncements();
      const announcement = announcements.find((a) => a.id === id);
      if (announcement) {
        this.title = announcement.title;
        this.body = announcement.body;
        this.category = announcement.category;
        this.isPinned = announcement.is_pinned;
        this.expiresAt = announcement.expires_at;
      }
    } catch {
      this.toast('Error al cargar el anuncio');
    }
  }

  async save(): Promise<void> {
    if (!this.title.trim() || !this.body.trim()) {
      this.toast('El título y el contenido son obligatorios');
      return;
    }

    this.saving = true;
    try {
      if (this.isEdit && this.announcementId) {
        await this.announcementService.updateAnnouncement(this.announcementId, {
          title: this.title.trim(),
          body: this.body.trim(),
          category: this.category,
          is_pinned: this.isPinned,
          expires_at: this.expiresAt,
        } as Partial<Announcement>);
        this.toast('Anuncio actualizado');
      } else {
        const user = await firstValueFrom(this.auth.currentUser$);
        const userId = user?.id ?? '';
        await this.announcementService.createAnnouncement({
          title: this.title.trim(),
          body: this.body.trim(),
          category: this.category,
          is_pinned: this.isPinned,
          expires_at: this.expiresAt,
          created_by: userId,
        });
        this.toast('Anuncio creado');
      }
      setTimeout(() => this.router.navigate(['/admin/announcements']), 1000);
    } catch {
      this.toast('Error al guardar el anuncio');
    }
    this.saving = false;
  }

  private toast(msg: string): void {
    this.toastMessage = msg;
    this.showToast = true;
  }
}
