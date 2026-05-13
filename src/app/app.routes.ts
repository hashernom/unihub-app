import { Routes } from '@angular/router';
import { AuthGuard, AdminGuard, NoAuthGuard } from './core/services/auth.guard';

export const routes: Routes = [
  // -- Auth pages (no auth required) --
  { path: 'login', canActivate: [NoAuthGuard], loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage) },
  { path: 'forgot-password', canActivate: [NoAuthGuard], loadComponent: () => import('./pages/forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage) },
  { path: 'reset-password', loadComponent: () => import('./pages/reset-password/reset-password.page').then(m => m.ResetPasswordPage) },

  // -- Tab navigation (authenticated users) --
  {
    path: 'tabs',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/tabs/tabs.page').then(m => m.TabsPage),
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/tab-dashboard/tab-dashboard.page').then(m => m.TabDashboardPage) },
      { path: 'surveys', loadComponent: () => import('./pages/tab-surveys/tab-surveys.page').then(m => m.TabSurveysPage) },
      { path: 'calendar', loadComponent: () => import('./pages/tab-calendar/tab-calendar.page').then(m => m.TabCalendarPage) },
      { path: 'help', loadComponent: () => import('./pages/tab-help/tab-help.page').then(m => m.TabHelpPage) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // -- Profile page --
  { path: 'profile', canActivate: [AuthGuard], loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage) },

  // -- Admin routes --
  { path: 'admin/dashboard', canActivate: [AuthGuard, AdminGuard], loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.page').then(m => m.AdminDashboardPage) },
  { path: 'admin/register', canActivate: [AuthGuard, AdminGuard], loadComponent: () => import('./pages/admin-register/admin-register.page').then(m => m.AdminRegisterPage) },
  { path: 'admin/announcements', canActivate: [AuthGuard, AdminGuard], loadComponent: () => import('./pages/admin-announcements/admin-announcements.page').then(m => m.AdminAnnouncementsPage) },
  { path: 'admin/announcements/new', canActivate: [AuthGuard, AdminGuard], loadComponent: () => import('./pages/announcement-form/announcement-form.page').then(m => m.AnnouncementFormPage) },
  { path: 'admin/announcements/edit/:id', canActivate: [AuthGuard, AdminGuard], loadComponent: () => import('./pages/announcement-form/announcement-form.page').then(m => m.AnnouncementFormPage) },
  { path: 'admin/notices', canActivate: [AuthGuard, AdminGuard], loadComponent: () => import('./pages/admin-notices/admin-notices.page').then(m => m.AdminNoticesPage) },
  { path: 'admin/notices/new', canActivate: [AuthGuard, AdminGuard], loadComponent: () => import('./pages/notice-form/notice-form.page').then(m => m.NoticeFormPage) },
  { path: 'admin/notices/edit/:id', canActivate: [AuthGuard, AdminGuard], loadComponent: () => import('./pages/notice-form/notice-form.page').then(m => m.NoticeFormPage) },
  { path: 'admin/surveys', canActivate: [AuthGuard, AdminGuard], loadComponent: () => import('./pages/admin-surveys/admin-surveys.page').then(m => m.AdminSurveysPage) },
  { path: 'admin/events', canActivate: [AuthGuard, AdminGuard], loadComponent: () => import('./pages/admin-events/admin-events.page').then(m => m.AdminEventsPage) },
  { path: 'admin/faq', canActivate: [AuthGuard, AdminGuard], loadComponent: () => import('./pages/admin-faq/admin-faq.page').then(m => m.AdminFaqPage) },
  { path: 'admin/users', canActivate: [AuthGuard, AdminGuard], loadComponent: () => import('./pages/admin-users/admin-users.page').then(m => m.AdminUsersPage) },

  // -- Redirects --
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];
