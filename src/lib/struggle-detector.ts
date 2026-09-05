import type { LearningState } from "./loop-types";

export type StruggleAssessment = {
  isStruggling: boolean;
  hintLevel: number; // 1 to 4
  recommendedAction: "scaffold" | "hint" | "advance" | "ask_question";
  rationale: string;
};

/**
 * Assesses whether the learner is struggling and selects the appropriate intervention level.
 * Never jumps directly to full code solutions. Escalates gradually:
 * Level 1: Socratic thinking question
 * Level 2: Conceptual clue
 * Level 3: Structural syntax clue
 * Level 4: Micro scaffold (tiny runnable example + simpler question)
 */
export function assessStruggle(
  state: LearningState,
  latestIntent: string,
  errorCount = 0
): StruggleAssessment {
  const attempts = state.attempts || 1;
  const hintsUsed = state.hintsUsed || 0;

  if (latestIntent === "DONT_KNOW" || latestIntent === "NEED_HELP") {
    const nextHintLevel = Math.min(4, Math.max(1, hintsUsed + 1));
    return {
      isStruggling: true,
      hintLevel: nextHintLevel,
      recommendedAction: nextHintLevel >= 3 ? "scaffold" : "hint",
      rationale: `Learner indicated they don't know (${attempts} attempts, ${hintsUsed} hints used).`,
    };
  }

  if (latestIntent === "REPEAT") {
    return {
      isStruggling: false,
      hintLevel: hintsUsed,
      recommendedAction: "advance",
      rationale: "Repetition detected; advance to avoid stuck conversation loop.",
    };
  }

  if (latestIntent === "READY" || latestIntent === "CORRECT") {
    return {
      isStruggling: false,
      hintLevel: 0,
      recommendedAction: "advance",
      rationale: "Learner provided verified evidence/positive response.",
    };
  }

  if (latestIntent === "INCORRECT" || errorCount >= 2 || attempts >= 2) {
    const nextHintLevel = Math.min(4, hintsUsed + 1);
    return {
      isStruggling: true,
      hintLevel: nextHintLevel,
      recommendedAction: nextHintLevel >= 3 ? "scaffold" : "hint",
      rationale: `Repeated attempt or failure (attempts: ${attempts}, errors: ${errorCount}). Escalating hint to Level ${nextHintLevel}.`,
    };
  }

  return {
    isStruggling: false,
    hintLevel: 0,
    recommendedAction: "ask_question",
    rationale: "Standard learning interaction.",
  };
}
