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
    this.restoreSession();
  }

  /** Attempts to restore an existing Supabase session on app start. */
  private async restoreSession(): Promise<void> {
    const { data } = await this.supabase.client.auth.getSession();
    if (data.session?.user) {
      await this.loadProfile(data.session.user);
    }
  }

  /** Fetches the user profile and updates the BehaviourSubject. */
  private async loadProfile(user: User): Promise<void> {
    const profile = await this.supabase.fetchProfile(user.id);
    if (profile) {
      this.currentUserSubject.next({
        id: user.id,
        email: user.email ?? '',
        profile,
      });
    }
  }

  /** Registers a new user and creates a profile entry. */
  signUp(
    email: string,
    password: string,
    studentCode: string,
    fullName: string,
  ): Observable<AuthUser> {
    // First check if the student code is already taken
    return from(this.isStudentCodeTaken(studentCode)).pipe(
      switchMap((taken) => {
        if (taken) return throwError(() => new Error('already registered'));
        return from(this.supabase.signUp(email, password));
      }),
      switchMap((res) => {
        if (res.error) return throwError(() => res.error);
        const user = res.data.user;
        if (!user) return throwError(() => new Error('No user returned from signUp'));

        return from(
          this.supabase.createProfile({
            id: user.id,
            student_code: studentCode,
            full_name: fullName,
            role: 'student',
            avatar_url: null,
          }),
        ).pipe(
          switchMap(() => {
            const authUser: AuthUser = {
              id: user.id,
              email: user.email ?? '',
              profile: {
                id: user.id,
                student_code: studentCode,
                full_name: fullName,
                role: 'student',
                avatar_url: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            };
            this.currentUserSubject.next(authUser);
            return of(authUser);
          }),
          catchError((profileErr) => {
            // Profile creation failed (e.g. race condition on student_code).
            const message =
              profileErr?.message?.includes('duplicate key') ||
              profileErr?.message?.includes('unique')
                ? 'already registered'
                : profileErr?.message ?? 'Error creating profile';
            return throwError(() => new Error(message));
          }),
        );
      }),
    );
  }

  /** Checks whether a student code is already in use. */
  private async isStudentCodeTaken(studentCode: string): Promise<boolean> {
    const { data } = await this.supabase.client
      .from('profiles')
      .select('id')
      .eq('student_code', studentCode)
      .maybeSingle();
    return data !== null;
  }

  /** Signs in with email + password and loads the profile. */
  signIn(email: string, password: string): Observable<AuthUser> {
    return from(this.supabase.signIn(email, password)).pipe(
      switchMap((res) => {
        if (res.error) return throwError(() => res.error);
        const user = res.data.user;
        if (!user) return throwError(() => new Error('No user returned from signIn'));

        return from(this.supabase.fetchProfile(user.id)).pipe(
          map((profile) => {
            if (!profile) throw new Error('Profile not found');
            const authUser: AuthUser = {
              id: user.id,
              email: user.email ?? '',
              profile,
            };
            this.currentUserSubject.next(authUser);
            return authUser;
          }),
        );
      }),
    );
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
