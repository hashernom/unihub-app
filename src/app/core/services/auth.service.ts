import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  from,
  of,
  throwError,
} from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import type { User } from '@supabase/supabase-js';
import { SupabaseService, type Profile } from './supabase.service';

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  readonly currentUser$: Observable<AuthUser | null> =
    this.currentUserSubject.asObservable();

  readonly isAdmin$: Observable<boolean> = this.currentUser$.pipe(
    map((u) => u?.profile.role === 'admin'),
  );

  readonly isAuthenticated$: Observable<boolean> = this.currentUser$.pipe(
    map((u) => u !== null),
  );

  constructor() {
    // initialize() is called via APP_INITIALIZER
  }

  async initialize(): Promise<void> {
    await this.restoreSession();
  }

  /** Allows the register page to set the user after successful signup. */
  setCurrentUser(user: AuthUser): void {
    this.currentUserSubject.next(user);
  }

  /** Attempts to restore an existing Supabase session on app start. */
  private async restoreSession(): Promise<void> {
    const { data } = await this.supabase.client.auth.getSession();
    if (data.session?.user) {
      try {
        console.log("[Auth] Restoring session:", data.session.user.email);
        await this.ensureProfile(data.session.user);
      } catch {
        console.warn("[Auth] Stale session detected, signing out...");
        await this.supabase.client.auth.signOut();
        this.currentUserSubject.next(null);
      }
    }
  }

  /** Registers a new user. Profile is auto-created by DB trigger. */
  signUp(email: string, password: string, fullName: string, carrera: string, semestre: string, role: "student" | "admin" = "student"): Observable<AuthUser> {
    console.log("[Auth] signUp:", email);
    const studentCode = email.split("@")[0] ?? "";
    return from(this.supabase.signUp(email, password, {
      student_code: studentCode,
      full_name: fullName,
      role: role,
      carrera: carrera,
      semestre: semestre,
    })).pipe(
      switchMap((res) => {
        console.log("[Auth] signUp response:", { error: res.error?.message, hasUser: !!res.data.user });
        if (res.error) return throwError(() => res.error);
        const user = res.data.user;
        if (!user) return throwError(() => new Error('Registro exitoso. Revisa tu email para verificar tu cuenta.'));
        const authUser: AuthUser = {
          id: user.id,
          email: user.email ?? '',
          profile: {
            id: user.id,
            student_code: studentCode,
            full_name: fullName,
            role: role,
            avatar_url: null,
            carrera: carrera,
            semestre: semestre,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };
        return of(authUser);
      }),
    );
  }

  /** Signs in with email + password and loads the profile. */
  signIn(email: string, password: string): Observable<AuthUser> {
    console.log("[Auth] signIn:", email);
    return from(this.supabase.signIn(email, password)).pipe(
      switchMap((res) => {
        console.log("[Auth] signIn response:", { error: res.error?.message, hasUser: !!res.data.user });
        if (res.error) return throwError(() => res.error);
        const user = res.data.user;
        if (!user) return throwError(() => new Error('No user returned from signIn'));
        return from(this.ensureProfile(user));
      }),
    );
  }

  /** Ensures a profile exists for the given user. Signs out if profile cannot be created. */
  private async ensureProfile(user: User): Promise<AuthUser> {
    console.log("[Auth] ensureProfile:", user.id, user.email);
    const existing = await this.supabase.fetchProfile(user.id);
    console.log("[Auth] fetchProfile result:", existing ? "found" : "not found");
    if (existing) {
      const authUser: AuthUser = { id: user.id, email: user.email ?? '', profile: existing };
      this.currentUserSubject.next(authUser);
      return authUser;
    }
    const meta = user.user_metadata ?? {};
    try {
      await this.supabase.createProfile({
        id: user.id,
        student_code: meta['student_code'] ?? '',
        full_name: meta['full_name'] ?? user.email ?? '',
        role: meta['role'] ?? 'student',
        avatar_url: null,
        carrera: meta['carrera'] ?? '',
        semestre: meta['semestre'] ?? '',
      });
      console.log("[Auth] Profile created via fallback");
      const profile = await this.supabase.fetchProfile(user.id);
      if (profile) {
        const authUser: AuthUser = { id: user.id, email: user.email ?? '', profile };
        this.currentUserSubject.next(authUser);
        return authUser;
      }
    } catch (e) {
      console.warn("[Auth] createProfile failed:", e);
      throw e;
    }
    console.warn("[Auth] Could not load or create profile, signing out");
    await this.supabase.client.auth.signOut();
    this.currentUserSubject.next(null);
    throw new Error("Profile could not be created");
  }

  /** Signs out, clears state, and navigates to login. */
  signOut(): Observable<void> {
    return from(this.supabase.signOut()).pipe(
      tap(() => {
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
      }),
      map(() => undefined),
      catchError(() => {
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
        return of(undefined);
      }),
    );
  }

  /** Requests a password reset email. */
  resetPassword(email: string): Observable<void> {
    return from(this.supabase.resetPassword(email)).pipe(
      map(() => undefined),
      catchError((err) => throwError(() => err)),
    );
  }

  /** Updates the user's password after a reset. */
  updatePassword(password: string): Observable<void> {
    return from(this.supabase.updatePassword(password)).pipe(
      map(() => undefined),
      catchError((err) => throwError(() => err)),
    );
  }
}
