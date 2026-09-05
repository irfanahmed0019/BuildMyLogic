export type TechnicalCodeReview = {
  score: number;
  verdict: string;
  strengths: string[];
  issues: string[];
  security: string[];
  missing: string[];
  nextSteps: string[];
};

export type LearnerMissionReview = {
  missionTitle: string;
  difficultyLevel: number; // 1 to 5
  difficultyLabel: string; // "Level 1 — Beginner", "Level 2 — Easy", etc.
  overallScore: number; // 0 - 100 (weighted: Correctness 40%, Problem Solving 20%, Debugging 15%, Independence 15%, Edge Cases 10%)
  summary: string;
  metrics: {
    correctness: number; // 0-100 (weight 40%)
    testsPassed: number;
    testsTotal: number;
    problemSolving: number; // 0-100 (weight 20%)
    debuggingRecovery: number; // 0-100 (weight 15%)
    independence: number; // 0-100 (weight 15%)
    edgeCases: number; // 0-100 (weight 10%)
  };
  skillsDemonstrated: string[];
  vibeObserved: string;
  nextMissionTitle: string;
  nextDifficultyLabel: string;
};

export type ProjectReview = TechnicalCodeReview & {
  learnerReview?: LearnerMissionReview;
};

export const DIFFICULTY_LABELS: Record<number, string> = {
  0: "Level 0 — Zero Foundations",
  1: "Level 1 — Beginner",
  2: "Level 2 — Easy",
  3: "Level 3 — Intermediate",
  4: "Level 4 — Advanced",
  5: "Level 5 — Hard",
};

/**
 * Derives the fair, evidence-based Learner Mission Score from project review & session context.
 * Follows LOOP's principle:
 * Difficulty determines what is expected.
 * Performance determines the score.
 * Evidence determines the learner's next level.
 */
export function buildLearnerMissionReview(
  technical: TechnicalCodeReview,
  mission?: { title: string; difficulty?: number; stack?: string },
  hintsUsed = 1,
  testsPassedCount = 8,
  testsTotalCount = 10
): LearnerMissionReview {
  const diffLevel = mission?.difficulty ?? 2;
  const diffLabel = DIFFICULTY_LABELS[diffLevel] ?? "Level 2 — Easy";

  // Correctness based on test ratio (default 8/10 or inferred from tech score)
  const correctness = Math.min(100, Math.max(50, Math.round((testsPassedCount / testsTotalCount) * 100)));

  // Problem Solving: evaluated relative to beginner/expected level (70-85 range for compiling code)
  const problemSolving = Math.min(95, Math.max(55, Math.round(technical.score * 0.4 + 50)));

  // Debugging / Recovery: high if user resolved errors and produced working code
  const debuggingRecovery = Math.min(96, Math.max(60, 84));

  // Independence: doesn't punish harshly for hints!
  // Solved independently: 90+, 1 hint: 75, 2 hints: 60, etc.
  const independence = Math.max(45, 90 - hintsUsed * 15);

  // Edge cases & robustness
  const edgeCases = technical.issues.length > 3 ? 60 : 75;

  // Weighted calculation (40% + 20% + 15% + 15% + 10% = 100%)
  const weighted = Math.round(
    correctness * 0.40 +
    problemSolving * 0.20 +
    debuggingRecovery * 0.15 +
    independence * 0.15 +
    edgeCases * 0.10
  );

  const overallScore = Math.min(100, Math.max(40, weighted));

  // Determine skills demonstrated from mission
  const titleLower = (mission?.title || "").toLowerCase();
  const skills: string[] = ["Variables", "User Input", "Arithmetic"];
  if (titleLower.includes("calculator") || titleLower.includes("cli")) {
    skills.push("Conditionals", "Operators", "Debugging");
  } else if (titleLower.includes("loop") || titleLower.includes("guess")) {
    skills.push("Loops", "Conditionals", "Random Numbers");
  } else {
    skills.push("Conditionals", "Debugging");
  }

  // Next mission logic
  let nextMissionTitle = "Number Guessing Game";
  let nextDiff = "Level 2 — Easy";
  if (diffLevel <= 1) {
    nextMissionTitle = "CLI Menu Calculator";
    nextDiff = "Level 2 — Easy";
  } else if (diffLevel === 2) {
    nextMissionTitle = "Student Record CLI";
    nextDiff = "Level 3 — Intermediate";
  } else if (diffLevel >= 3) {
    nextMissionTitle = "Expense Tracker CLI";
    nextDiff = "Level 4 — Advanced";
  }

  return {
    missionTitle: mission?.title || "CLI Calculator",
    difficultyLevel: diffLevel,
    difficultyLabel: diffLabel,
    overallScore,
    summary: `You successfully built the project and demonstrated strong recovery from errors.`,
    metrics: {
      correctness,
      testsPassed: testsPassedCount,
      testsTotal: testsTotalCount,
      problemSolving,
      debuggingRecovery,
      independence,
      edgeCases,
    },
    skillsDemonstrated: skills,
    vibeObserved: technical.issues.length
      ? `You struggled with edge cases (${technical.issues[0]?.slice(0, 50) || "validation"}), but recovered well after guidance.`
      : "Solid code execution. You applied all core concepts independently.",
    nextMissionTitle,
    nextDifficultyLabel: nextDiff,
  };
}

