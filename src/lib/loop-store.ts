/**
 * BuildMyLogic — Reactive Learner State Store
 * 
 * Provides a lightweight, external store synchronized across React components
 * via `useSyncExternalStore`. Integrates seamlessly with localStorage caching
 * and asynchronous Supabase cloud persistence.
 */

import { useSyncExternalStore } from "react";
import { emptyState, type ActivityItem, type LearningChat, type LoopState, type MissionProgress } from "./loop-types";

const KEY = "loop.state.v1";

let state: LoopState = emptyState;
let loaded = false;
const listeners = new Set<() => void>();

/**
 * Hydrates learner state from local cache on client startup
 */
function load(): LoopState {
  if (typeof window === "undefined") return emptyState;
  if (loaded) return state;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LoopState>;
      state = {
        ...emptyState,
        ...parsed,
        onboarded: parsed.onboarded ?? true,
        profile: parsed.profile ?? emptyState.profile,
        plan: parsed.plan ?? emptyState.plan,
        missionProgress: Object.keys(parsed.missionProgress ?? {}).length > 0
          ? parsed.missionProgress!
          : emptyState.missionProgress,
        learningChats: parsed.learningChats ?? {},
        selectedLearningMissionId: parsed.selectedLearningMissionId ?? emptyState.selectedLearningMissionId,
        skillMemory: parsed.skillMemory ?? {},
      };
    } else {
      state = emptyState;
    }
  } catch {
    state = emptyState;
  }
  return state;
}

/**
 * Synchronizes in-memory state to localStorage and notifies React subscribers
 */
function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable */
  }
  listeners.forEach((l) => l());
}

/**
 * Synchronously retrieves current snapshot of the learner state
 */
export function getLoopState(): LoopState {
  return load();
}

/**
 * Updates learner state with functional transformer and triggers persistence
 */
export function setLoopState(update: (prev: LoopState) => LoopState) {
  state = update(load());
  persist();
}

/**
 * Resets state to clean slate (e.g., on sign-out)
 */
export function resetLoop() {
  state = emptyState;
  persist();
}

/**
 * Appends a timestamped telemetry or milestone event to the activity log
 */
export function logActivity(item: Omit<ActivityItem, "at">) {
  setLoopState((prev) => ({
    ...prev,
    activity: [{ ...item, at: Date.now() }, ...prev.activity].slice(0, 40),
  }));
}

/**
 * Records evidence for a specific programming concept or skill
 * Evidence is weighted depending on source (test pass, checkpoint solve, scaffold)
 */
export function recordSkillEvidence(
  skillName: string,
  description: string,
  weight = 5,
  source: "code_test" | "checkpoint_answer" | "scaffold_completed" | "independent_solution" = "checkpoint_answer"
) {
  setLoopState((prev) => {
    const key = skillName.toLowerCase().trim();
    const existing = prev.skillMemory?.[key] ?? { level: 0, evidence: [] };
    const newLevel = Math.min(100, existing.level + weight);
    const newEvidence = [{ description, at: Date.now(), weight, source }, ...existing.evidence].slice(0, 50);
    const updatedSkillMemory = {
      ...(prev.skillMemory ?? {}),
      [key]: { level: newLevel, evidence: newEvidence, lastPracticedAt: Date.now() },
    };
    return { ...prev, skillMemory: updatedSkillMemory };
  });
}

/**
 * Advances overall mission-level skill competency when milestones are achieved
 */
export function recordMissionEvidence(missionId: string, amount = 2) {
  setLoopState((prev) => {
    if (!prev.plan) return prev;
    const mission = prev.plan.missions.find((item) => item.id === missionId);
    if (!mission) return prev;
    const missionSkills = mission.skills.map((skill) => skill.toLowerCase());
    const skills = prev.plan.skills.map((skill) => {
      const name = skill.name.toLowerCase();
      const matches = missionSkills.some((missionSkill) => name.includes(missionSkill) || missionSkill.includes(name));
      return matches ? { ...skill, level: Math.min(100, skill.level + amount) } : skill;
    });
    return { ...prev, plan: { ...prev.plan, skills } };
  });
}

/**
 * Patches progress for a specific mission (status, completed checkpoints)
 */
export function setMissionProgress(id: string, patch: Partial<MissionProgress>) {
  setLoopState((prev) => {
    const current: MissionProgress = prev.missionProgress[id] ?? { status: "active", completedSteps: [] };
    return { ...prev, missionProgress: { ...prev.missionProgress, [id]: { ...current, ...patch } } };
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * React hook that returns live reactive state with automatic re-renders
 */
export function useLoop(): LoopState {
  return useSyncExternalStore(
    subscribe,
    () => load(),
    () => emptyState,
  );
}

/**
 * Selects an active learning mission in the Vibe chat coach
 */
export function selectLearningMission(missionId: string) {
  setLoopState((prev) => ({ ...prev, selectedLearningMissionId: missionId }));
}

/**
 * Persists an ongoing conversation thread and its micro-lesson state
 */
export function saveLearningChat(key: string, chat: LearningChat) {
  setLoopState((prev) => ({
    ...prev,
    learningChats: { ...prev.learningChats, [key]: chat },
  }));
}

/**
 * Clears conversation history for a topic while preserving learned state
 */
export function clearLearningChatMessages(key: string) {
  setLoopState((prev) => {
    const existing = prev.learningChats[key];
    if (!existing) return prev;
    return {
      ...prev,
      learningChats: { ...prev.learningChats, [key]: { ...existing, messages: [], updatedAt: Date.now() } },
    };
  });
}
