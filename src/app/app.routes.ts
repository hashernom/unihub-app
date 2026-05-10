import { Routes } from '@angular/router';
import { AuthGuard, AdminGuard, NoAuthGuard } from './core/services/auth.guard';

export const routes: Routes = [
  // -- Auth pages (only for non-authenticated users) --
  {
    path: 'login',
    canActivate: [NoAuthGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [NoAuthGuard],
    loadComponent: () =>
      import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    canActivate: [NoAuthGuard],
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.page').then(
        (m) => m.ForgotPasswordPage,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.page').then(
        (m) => m.ResetPasswordPage,
      ),
  },

  // -- Protected routes --
  {
    path: 'home',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'student/dashboard',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage),
  },

  // -- Admin routes --
  {
    path: 'admin/dashboard',
    canActivate: [AuthGuard, AdminGuard],
    loadComponent: () =>
      import('./pages/admin-dashboard/admin-dashboard.page').then((m) => m.AdminDashboardPage),
  },
  {
    path: 'admin/register',
    canActivate: [AuthGuard, AdminGuard],
    loadComponent: () =>
      import('./pages/admin-register/admin-register.page').then((m) => m.AdminRegisterPage),
  },


  // -- Admin module pages --
  {
    path: 'admin/announcements',
    canActivate: [AuthGuard, AdminGuard],
    loadComponent: () => import('./pages/admin-announcements/admin-announcements.page').then(m => m.AdminAnnouncementsPage),
  },
  {
    path: 'admin/notices',
    canActivate: [AuthGuard, AdminGuard],
    loadComponent: () => import('./pages/admin-notices/admin-notices.page').then(m => m.AdminNoticesPage),
  },
  {
    path: 'admin/surveys',
    canActivate: [AuthGuard, AdminGuard],
    loadComponent: () => import('./pages/admin-surveys/admin-surveys.page').then(m => m.AdminSurveysPage),
  },
  {
    path: 'admin/events',
    canActivate: [AuthGuard, AdminGuard],
    loadComponent: () => import('./pages/admin-events/admin-events.page').then(m => m.AdminEventsPage),
  },
  {
    path: 'admin/faq',
    canActivate: [AuthGuard, AdminGuard],
    loadComponent: () => import('./pages/admin-faq/admin-faq.page').then(m => m.AdminFaqPage),
  },
  {
    path: 'admin/users',
    canActivate: [AuthGuard, AdminGuard],
    loadComponent: () => import('./pages/admin-users/admin-users.page').then(m => m.AdminUsersPage),
  },
  // -- Default redirects --
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];




