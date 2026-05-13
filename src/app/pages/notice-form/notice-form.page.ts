import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonItem, IonLabel,
  IonInput, IonTextarea, IonSelect, IonSelectOption,
  IonButton, IonToggle, IonToast,
} from '@ionic/angular/standalone';
import { NoticeService, type Notice } from '../../core/services/notice.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-notice-form',
  imports: [
    FormsModule, RouterLink,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton, IonItem, IonLabel,
    IonInput, IonTextarea, IonSelect, IonSelectOption,
    IonButton, IonToggle, IonToast,
  ],
  templateUrl: './notice-form.page.html',
  styles: `.form-actions { padding: 16px 0; }`,
})
export class NoticeFormPage implements OnInit {
  private readonly noticeService = inject(NoticeService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  isEdit = false;
  noticeId: string | null = null;
  title = '';
  content = '';
  priority: 'low' | 'medium' | 'high' = 'medium';
  isActive = true;
  saving = false;
  showToast = false;
  toastMessage = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.noticeId = id;
      this.loadNotice(id);
    }
  }

  private async loadNotice(id: string): Promise<void> {
    try {
      const notices = await this.noticeService.getAllNotices();
      const notice = notices.find((n) => n.id === id);
      if (notice) {
        this.title = notice.title;
        this.content = notice.content;
        this.priority = notice.priority;
        this.isActive = notice.is_active;
      }
    } catch {
      this.toast('Error al cargar el aviso');
    }
  }

  async save(): Promise<void> {
    if (!this.title.trim() || !this.content.trim()) {
      this.toast('El título y el contenido son obligatorios');
      return;
    }

    this.saving = true;
    try {
      if (this.isEdit && this.noticeId) {
        await this.noticeService.updateNotice(this.noticeId, {
          title: this.title.trim(),
          content: this.content.trim(),
          priority: this.priority,
          is_active: this.isActive,
        } as Partial<Notice>);
        this.toast('Aviso actualizado');
      } else {
        const user = await firstValueFrom(this.auth.currentUser$);
        await this.noticeService.createNotice({
          title: this.title.trim(),
          content: this.content.trim(),
          priority: this.priority,
          is_active: this.isActive,
          created_by: user?.id ?? '',
        });
        this.toast('Aviso creado');
      }
      setTimeout(() => this.router.navigate(['/admin/notices']), 1000);
    } catch {
      this.toast('Error al guardar el aviso');
    }
    this.saving = false;
  }

  private toast(msg: string): void {
    this.toastMessage = msg;
    this.showToast = true;
  }
}
