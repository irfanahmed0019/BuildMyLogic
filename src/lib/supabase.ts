import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { LoopState } from "./loop-types";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || "";

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type LearningScheduleRecord = {
  id?: string;
  user_id: string;
  start_time: string;
  end_time: string;
  timezone: string;
  repeat_daily: boolean;
  calendar_enabled: boolean;
  reminder_minutes: number;
  updated_at?: string;
};

export type SkillEvidenceRecord = {
  id?: string;
  user_id: string;
  skill_name: string;
  evidence_text: string;
  weight: number;
  source: string;
  created_at?: string;
};

export type SessionEventRecord = {
  id?: string;
  session_id: string;
  user_id: string;
  challenge_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at?: string;
};

/**
 * Saves complete learner state into Supabase PostgreSQL database
 */
export async function saveLearnerStateToSupabase(userId: string, state: LoopState): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("learner_memory").upsert(
      {
        user_id: userId,
        state_json: state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.warn("Supabase learner_memory save error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase save exception:", err);
    return false;
  }
}

/**
 * Loads learner state from Supabase PostgreSQL database
 */
export async function loadLearnerStateFromSupabase(userId: string): Promise<LoopState | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("learner_memory")
      .select("state_json")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return (data.state_json as LoopState) ?? null;
  } catch (err) {
    console.warn("Supabase load exception:", err);
    return null;
  }
}

/**
 * Saves or updates learning schedule in Supabase
 */
export async function saveLearningScheduleToSupabase(schedule: LearningScheduleRecord): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("learning_schedules").upsert(
      {
        ...schedule,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    return !error;
  } catch (err) {
    console.warn("Supabase schedule save exception:", err);
    return false;
  }
}

/**
 * Records granular skill evidence into Supabase PostgreSQL
 */
export async function recordSkillEvidenceToSupabase(evidence: SkillEvidenceRecord): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("skill_evidence").insert({
      ...evidence,
      created_at: new Date().toISOString(),
    });
    return !error;
  } catch (err) {
    console.warn("Supabase skill evidence exception:", err);
    return false;
  }
}

/**
 * Triggers Supabase Google OAuth sign in
 */
export async function signInWithSupabaseGoogle() {
  if (!supabase) throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
  if (error) throw error;
  return data;
}
