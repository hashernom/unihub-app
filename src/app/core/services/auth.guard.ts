import { Injectable, inject } from '@angular/core';
import {
  CanActivate,
  Router,
  type UrlTree,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  canActivate(): Observable<boolean | UrlTree> {
    return this.auth.isAuthenticated$.pipe(
      take(1),
      map((isAuth) => isAuth || this.router.parseUrl('/login')),
    );
  }
}

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  canActivate(): Observable<boolean | UrlTree> {
    return this.auth.isAdmin$.pipe(
      take(1),
      map((isAdmin) => isAdmin || this.router.parseUrl('/tabs/dashboard')),
    );
  }
}

@Injectable({ providedIn: 'root' })
export class NoAuthGuard implements CanActivate {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  canActivate(): Observable<boolean | UrlTree> {
    return this.auth.isAuthenticated$.pipe(
      take(1),
      switchMap((isAuth) => {
        if (!isAuth) return of(true);
        return this.auth.currentUser$.pipe(
          take(1),
          map((u) => {
            if (u?.profile.role === 'admin') return this.router.parseUrl('/admin/dashboard');
            return this.router.parseUrl('/tabs/dashboard');
          }),
        );
      }),
    );
  }
}

