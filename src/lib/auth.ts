import { useSyncExternalStore } from "react";
import {
  supabase,
  hasSupabaseConfig,
  saveLearnerStateToSupabase,
  loadLearnerStateFromSupabase,
  signInWithSupabaseGoogle,
} from "./supabase";
import type { LoopState } from "./loop-types";

export type AuthUser = {
  uid: string;
  email: string;
  displayName: string;
  photoUrl?: string;
};

export type AuthSession = AuthUser & {
  idToken?: string;
  refreshToken?: string;
  expiresAt: number;
};

const AUTH_KEY = "loop.auth.v1";
const listeners = new Set<() => void>();
let session: AuthSession | null = null;
let loaded = false;

function load() {
  if (typeof window === "undefined" || loaded) return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    session = raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    session = null;
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function persist() {
  if (typeof window === "undefined") return;
  if (session) window.localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(AUTH_KEY);
  notify();
}

export function useAuth() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => {
      load();
      return session;
    },
    () => null,
  );
}

export function getAuthSession(): AuthSession | null {
  load();
  return session;
}

export function hasCloudConfig(): boolean {
  return hasSupabaseConfig;
}

// Backward compatibility alias
export function hasFirebaseConfig(): boolean {
  return hasSupabaseConfig;
}

// Automatically listen to Supabase Auth state changes if configured
if (supabase) {
  supabase.auth.onAuthStateChange((_event, supabaseSession) => {
    if (supabaseSession?.user) {
      const u = supabaseSession.user;
      session = {
        uid: u.id,
        email: u.email ?? "",
        displayName:
          (u.user_metadata?.full_name as string) ||
          (u.user_metadata?.name as string) ||
          u.email?.split("@")[0] ||
          "Builder",
        photoUrl: (u.user_metadata?.avatar_url as string) || undefined,
        expiresAt: (supabaseSession.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000,
      };
      persist();
    } else {
      session = null;
      persist();
    }
  });
}

export async function signInWithGoogle() {
  if (hasSupabaseConfig) {
    return await signInWithSupabaseGoogle();
  }
  // Fallback demo local login
  session = {
    uid: "local-builder",
    email: "builder@buildmylogic.local",
    displayName: "Builder",
    expiresAt: Date.now() + 86400 * 1000,
  };
  persist();
  return session;
}

export async function signInWithGoogleCredential(credential: string) {
  if (!credential) throw new Error("Google credential missing.");
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: credential,
    });
    if (error) throw error;
    if (data.user) {
      session = {
        uid: data.user.id,
        email: data.user.email ?? "",
        displayName:
          (data.user.user_metadata?.full_name as string) ||
          data.user.email?.split("@")[0] ||
          "Builder",
        photoUrl: (data.user.user_metadata?.avatar_url as string) || undefined,
        expiresAt: Date.now() + 3600 * 1000,
      };
      persist();
      return session;
    }
  }

  // Fallback if no Supabase configured: parse JWT safely or set local session
  session = {
    uid: "google-user",
    email: "user@gmail.com",
    displayName: "Google User",
    expiresAt: Date.now() + 3600 * 1000,
  };
  persist();
  return session;
}

export async function signOut() {
  if (supabase) {
    await supabase.auth.signOut().catch(() => {});
  }
  session = null;
  persist();
}

export async function saveLoopStateToCloud(state: unknown): Promise<boolean> {
  const current = getAuthSession();
  if (!current?.uid) return false;
  return await saveLearnerStateToSupabase(current.uid, state as LoopState);
}

export async function loadLoopStateFromCloud(): Promise<unknown | null> {
  const current = getAuthSession();
  if (!current?.uid) return null;
  return await loadLearnerStateFromSupabase(current.uid);
}

export async function renderGoogleButton(
  element: HTMLElement,
  onCredential: (credential: string) => void,
  options?: Record<string, unknown>
) {
  // If Supabase is available, we render a clean Google button
  element.replaceChildren();
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-base btn-outline flex items-center gap-2 text-xs font-bold w-full justify-center";
  btn.innerHTML = `<svg class="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg> Continue with Google`;
  btn.onclick = async () => {
    try {
      await signInWithGoogle();
      onCredential("supabase-token");
    } catch (err) {
      console.error(err);
    }
  };
  element.appendChild(btn);
}

