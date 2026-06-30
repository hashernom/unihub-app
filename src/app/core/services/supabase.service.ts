import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, type AuthResponse, type UserResponse } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface Profile {
  id: string;
  student_code: string;
  full_name: string;
  role: 'student' | 'admin';
  avatar_url: string | null;
  carrera: string;
  semestre: string;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly _client: SupabaseClient;

  constructor() {
    this._client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }

  get client(): SupabaseClient { return this._client; }

  signUp(email: string, password: string, metadata?: Record<string, unknown>): Promise<AuthResponse> {
    return this._client.auth.signUp({ 
      email, 
      password, 
      options: { data: metadata } 
    });
  }

  signIn(email: string, password: string): Promise<AuthResponse> {
    return this._client.auth.signInWithPassword({ email, password });
  }

  signOut(): Promise<{ error: Error | null }> {
    return this._client.auth.signOut();
  }

  resetPassword(email: string): Promise<{ error: Error | null }> {
    return this._client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
  }

  updatePassword(password: string): Promise<UserResponse> {
    return this._client.auth.updateUser({ password });
  }

  async fetchProfile(userId: string): Promise<Profile | null> {
    const { data } = await this._client.from("profiles").select("*").eq("id", userId).single<Profile>();
    return data ?? null;
  }

  async createProfile(profile: Omit<Profile, "created_at" | "updated_at">): Promise<void> {
    await this._client.from("profiles").insert(profile as Record<string, unknown>);
  }

  async upsertProfile(profile: Omit<Profile, "created_at" | "updated_at">): Promise<void> {
    await this._client.from("profiles").upsert(profile as Record<string, unknown>, { onConflict: 'id' });
  }

  async promoteToAdmin(userId: string): Promise<void> {
    const { error } = await this._client.rpc('promote_to_admin', { target_user_id: userId });
    if (error) throw error;
  }

  async uploadAvatar(userId: string, base64: string): Promise<string | null> {
    const blob = this.base64ToBlob(base64);
    if (blob.size > 5242880) throw new Error("FILE_TOO_LARGE");
    const ext = base64.match(/^data:image\/(\w+);/)?.at(1) ?? "png";
    const path = userId + "/avatar." + ext;
    const { error } = await this._client.storage.from("avatars").upload(path, blob, { upsert: true });
    if (error) throw error;
    const { data } = this._client.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  }

  private base64ToBlob(base64: string): Blob {
    const parts = base64.split(",");
    const byteString = atob(parts[1]);
    const mime = parts[0].match(/:(.*?);/)?.at(1) ?? "image/png";
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: mime });
  }
}

