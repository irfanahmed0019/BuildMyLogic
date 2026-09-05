import type { LearnerIntent } from "./loop-types";
import {
  C_CURRICULUM_MAP,
  CConceptId,
  C_FUNDAMENTALS,
  detectCurriculumIntent,
  evaluateCurriculumAnswer,
  parseDrillState,
  CurriculumStep,
} from "./curriculum-engine";

export type LessonState =
  | "hello_world"
  | "print_name"
  | "variables"
  | "input"
  | "sum"
  | "difference"
  | "multiplication"
  | "division"
  | "modulus"
  | "if"
  | "else"
  | "comparison"
  | "loops"
  | "cli_calculator"
  | string;

export type TeachResult = {
  message: string;
  question: string;
  memory: string;
  understood: boolean;
  nextConcept: string;
  readyForProject: boolean;
  lessonState: LessonState;
  return_to_build?: boolean;
};

const BEGINNER_PATTERNS = [
  /\bi\s*(?:really\s*)?(?:don't|do not)\s*know\b/i,
  /\bdon['’]?t\s*know\b/i,
  /\bnot\s*sure\b/i,
  /\bno\s*idea\b/i,
  /\b(?:confused|lost|stuck)\b/i,
  /\b(?:i'?m|i am)\s*(?:new|a beginner|beginner)\b/i,
  /\bstart\s*(?:from|at)\s*(?:the\s*)?(?:beginning|basics|zero)\b/i,
  /\b(?:i\s*)?(?:don't|do not)\s*(?:get|understand)\b/i,
  /\b(?:make|start)\s*it\s*(?:simpler|easier)\b/i,
  /\bexplain\s*more\s*simply\b/i,
  /\bteach\s*me\b/i,
  // Manglish stuck
  /\b(ariyilla|ariyathilla|enikku\s*ariyilla|manasilayilla|manasilaayilla|stuck\s*aayi|ith\s*entha)\b/i,
];

const REPEAT_PATTERNS = [
  /\bhallucinat(?:ing|ion|ed)?\b/i,
  /\brepeat(?:ed|ing)?\b/i,
  /\bsame\s*(?:question|thing|prompt|lesson|calculation|item)\b/i,
  /\balready\s*(?:did|ran|saw|answered|told|asked|paranju|said)\b/i,
  /\byou\s*already\s*asked\b/i,
  /\b(?:keep|keeps)\s*asking\s*(?:the\s*)?calculation\b/i,
  /\b(?:keep|keeps)\s*asking\b/i,
  /\bmanglish\s*(?:dont|doesn't|not)\s*work\b/i,
  /\b(?:teh\s*)?mangslih\b/i,
  /\bstuck\s*in\s*(?:a\s*)?loop\b/i,
];

const READY_PATTERNS = [
  /\b(yes|yeah|yep|yup|aye)\b/i,
  /\b(saw\s*that|i\s*saw|i\s*see\s*it|saw\s*it)\b/i,
  /\b(works|worked|ran|printed|done|completed|i\s*did\s*it|did\s*it)\b/i,
  /\b(got\s*it|makes\s*sense|understood|understand|i\s*get\s*it)\b/i,
  /\b(ready|next|let'?s\s*go)\b/i,
  /\b(athe|aahn|sheriya|sheriyaanu|ok\s*aayi|cheythu|kittiyatha|kollam|adipoli)\b/i,
];

const CASUAL_PATTERNS = [
  /^(?:hey|hi|hello|sup|yo|good\s*morning|good\s*afternoon|good\s*evening|hola|howdy)[!.]*$/i,
];

export function signalsBeginner(text: string): boolean {
  const value = text.trim();
  return value.length > 0 && BEGINNER_PATTERNS.some((pattern) => pattern.test(value));
}

export function isCContext(topic: string, missionTitle: string, missionDescription: string): boolean {
  const haystack = `${topic} ${missionTitle} ${missionDescription}`.toLowerCase();
  return /(^|[^a-z])(c|c language|c programming|cmake)([^a-z]|$)/i.test(haystack);
}

export function detectIntent(message: string, currentStep?: string): LearnerIntent {
  const text = message.toLowerCase().trim();
  if (!text) return "QUESTION";

  const curriculumIntent = detectCurriculumIntent(text);
  if (curriculumIntent === "PEDAGOGY_REQUEST") return "REPEAT";
  if (curriculumIntent === "REPEAT") return "REPEAT";
  if (curriculumIntent === "DONT_KNOW") return "DONT_KNOW";
  if (curriculumIntent === "READY") return "READY";

  if (REPEAT_PATTERNS.some((p) => p.test(text))) return "REPEAT";
  if (BEGINNER_PATTERNS.some((p) => p.test(text))) return "DONT_KNOW";
  if (CASUAL_PATTERNS.some((p) => p.test(text))) return "CASUAL";

  // Check deterministic answer
  if (currentStep) {
    const { conceptId, drillIndex } = parseDrillState(currentStep);
    if (conceptId in C_CURRICULUM_MAP) {
      const evalRes = evaluateCurriculumAnswer(conceptId, text, drillIndex);
      if (evalRes.isCorrect) return "CORRECT";
    }
  }

  if (READY_PATTERNS.some((p) => p.test(text))) return "READY";

  return "QUESTION";
}

export function isDuplicateResponse(response: string, previousMessages: string[]): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[`*_~#]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const candidate = normalize(response);
  if (!candidate || candidate.length < 15) return false;

  return previousMessages.some((prev) => {
    const normPrev = normalize(prev);
    if (!normPrev || normPrev.length < 15) return false;
    if (candidate === normPrev) return true;
    if (candidate.length > 35 && normPrev.length > 35) {
      if (candidate.includes(normPrev) || normPrev.includes(candidate)) return true;
    }
    return false;
  });
}

export function helloWorldFallback(): TeachResult {
  const step = C_CURRICULUM_MAP.hello_world;
  return {
    message: `**${step.title}**\n\n${step.initialQuestion}`,
    question: step.initialQuestion,
    memory: "C foundation: Hello World is the current verified checkpoint.",
    understood: false,
    nextConcept: "Hello World",
    readyForProject: false,
    lessonState: "hello_world",
  };
}

function getNextConceptId(current: CConceptId): CConceptId {
  const idx = C_FUNDAMENTALS.indexOf(current);
  if (idx >= 0 && idx < C_FUNDAMENTALS.length - 1) {
    return C_FUNDAMENTALS[idx + 1];
  }
  return "cli_calculator";
}

/**
 * Generates the prompt/question for a given curriculum state
 */
export function stepResult(state: LessonState): TeachResult {
  const { conceptId, drillIndex } = parseDrillState(state);
  const step = C_CURRICULUM_MAP[conceptId] || C_CURRICULUM_MAP.hello_world;

  // If in drill mode: Question 1/3, 2/3, 3/3
  if (drillIndex !== undefined && drillIndex >= 0 && drillIndex < step.drills.length) {
    const drill = step.drills[drillIndex];
    return {
      message: `**Question ${drillIndex + 1}/3**: ${drill.question}`,
      question: drill.question,
      memory: `C curriculum: ${step.shortName} drill ${drillIndex + 1}/3.`,
      understood: true,
      nextConcept: step.shortName,
      readyForProject: false,
      lessonState: state,
    };
  }

  // Initial concept question: ONLY the question + minimal hint
  const msg = `**${step.title}**\n\n${step.initialQuestion}`;
  return {
    message: msg,
    question: step.initialQuestion,
    memory: `C curriculum: step ${step.stepNumber}/14 (${step.shortName}) initial question.`,
    understood: true,
    nextConcept: step.shortName,
    readyForProject: conceptId === "cli_calculator",
    lessonState: conceptId,
    return_to_build: conceptId === "cli_calculator",
  };
}

/**
 * Teaching Scaffolding: ONLY teach if user says "I don't know" or requests explanation!
 */
export function handleScaffold(state: LessonState): TeachResult {
  const { conceptId, drillIndex } = parseDrillState(state);
  const step = C_CURRICULUM_MAP[conceptId] || C_CURRICULUM_MAP.hello_world;

  if (drillIndex !== undefined && drillIndex >= 0 && drillIndex < step.drills.length) {
    const drill = step.drills[drillIndex];
    return {
      message: `That's okay! Take your time.\n\n${drill.question}`,
      question: drill.question,
      memory: `C foundation: drill scaffold for ${step.shortName} (${drillIndex + 1}/3).`,
      understood: false,
      nextConcept: step.shortName,
      readyForProject: false,
      lessonState: state,
    };
  }

  // Initial question scaffold -> NOW we teach!
  return {
    message: `That's completely okay! Let me teach you:\n\n${step.teachingExplanation}\n\n\`\`\`c\n${step.cCodeSnippet}\n\`\`\`\n\nNow try: ${step.initialQuestion}`,
    question: step.initialQuestion,
    memory: `C foundation: taught explanation for ${step.shortName}.`,
    understood: false,
    nextConcept: step.shortName,
    readyForProject: false,
    lessonState: conceptId,
  };
}

function handleCasual(state: LessonState): TeachResult {
  const current = stepResult(state);
  return {
    ...current,
    message: `Hey 👋 Good to see you!\n\n${current.message}`,
  };
}

export function handleRepeatCorrection(state: LessonState): TeachResult {
  const { conceptId } = parseDrillState(state);
  const nextId = getNextConceptId(conceptId);
  const nextStep = C_CURRICULUM_MAP[nextId];

  return {
    message: `You got it! Moving right along:\n\n**${nextStep.title}**\n\n${nextStep.initialQuestion}`,
    question: nextStep.initialQuestion,
    memory: `C curriculum advanced to ${nextStep.shortName} after repeat note.`,
    understood: true,
    nextConcept: nextStep.shortName,
    readyForProject: nextId === "cli_calculator",
    lessonState: nextId,
    return_to_build: nextId === "cli_calculator",
  };
}

/**
 * Deterministic C state machine progression with 3-question drills
 */
export function advanceCBeginner(
  lessonState: LessonState | undefined,
  studentAnswer: string
): TeachResult | null {
  const state: LessonState = lessonState ?? "hello_world";
  const answer = studentAnswer.trim();
  if (!answer) return state === "hello_world" ? helloWorldFallback() : null;

  const curriculumIntent = detectCurriculumIntent(answer);

  // 1. Pedagogy request: user asked to give question first with hint, teach if don't know, then 3 drill questions with no hints
  if (curriculumIntent === "PEDAGOGY_REQUEST") {
    const { conceptId } = parseDrillState(state);
    const activeConcept = conceptId in C_CURRICULUM_MAP ? conceptId : "modulus";
    const step = C_CURRICULUM_MAP[activeConcept];
    return {
      message: `You got it! Exactly how we'll do it from now on:\n1. Question first with only a tiny operator hint.\n2. If you don't know, I'll teach you.\n3. Then 3 practice questions with **no hints**!\n\n**${step.title}**\n${step.initialQuestion}`,
      question: step.initialQuestion,
      memory: `Teaching style: question first, teach on don't know, 3 no-hint drills. Current: ${step.shortName}.`,
      understood: false,
      nextConcept: step.shortName,
      readyForProject: false,
      lessonState: activeConcept,
    };
  }

  // 2. Repetition / hallucination complaint
  if (curriculumIntent === "REPEAT") {
    return handleRepeatCorrection(state);
  }

  // 3. Learner says "I don't know" -> TEACH!
  if (curriculumIntent === "DONT_KNOW" || signalsBeginner(answer)) {
    return handleScaffold(state);
  }

  // 4. Casual greeting
  if (CASUAL_PATTERNS.some((p) => p.test(answer))) {
    return handleCasual(state);
  }

  // 5. Evaluate answer deterministically
  const { conceptId, drillIndex } = parseDrillState(state);
  const activeConcept: CConceptId = conceptId in C_CURRICULUM_MAP ? conceptId : "modulus";
  const step = C_CURRICULUM_MAP[activeConcept];

  const evalRes = evaluateCurriculumAnswer(activeConcept, answer, drillIndex);

  if (evalRes.isCorrect || curriculumIntent === "READY") {
    // A. If user just answered initial question -> Move to Drill 0 (Question 1/3 with NO hints)
    if (drillIndex === undefined) {
      const drill0 = step.drills[0];
      const nextState = `${activeConcept}_drill_0`;
      return {
        message: `Spot on! That's correct. 🎉\n\nNow, 3 quick practice questions (**no hints**) to lock it in:\n\n**Question 1/3**: ${drill0.question}`,
        question: drill0.question,
        memory: `C curriculum: ${step.shortName} initial passed. Starting drill 1/3.`,
        understood: true,
        nextConcept: step.shortName,
        readyForProject: false,
        lessonState: nextState,
      };
    }

    // B. If user answered Drill 0 (Question 1/3) -> Move to Drill 1 (Question 2/3)
    if (drillIndex === 0) {
      const drill1 = step.drills[1];
      const nextState = `${activeConcept}_drill_1`;
      return {
        message: `Correct! 👍\n\n**Question 2/3**: ${drill1.question}`,
        question: drill1.question,
        memory: `C curriculum: ${step.shortName} drill 1/3 passed. Starting drill 2/3.`,
        understood: true,
        nextConcept: step.shortName,
        readyForProject: false,
        lessonState: nextState,
      };
    }

    // C. If user answered Drill 1 (Question 2/3) -> Move to Drill 2 (Question 3/3)
    if (drillIndex === 1) {
      const drill2 = step.drills[2];
      const nextState = `${activeConcept}_drill_2`;
      return {
        message: `Great! 👍\n\n**Question 3/3**: ${drill2.question}`,
        question: drill2.question,
        memory: `C curriculum: ${step.shortName} drill 2/3 passed. Starting drill 3/3.`,
        understood: true,
        nextConcept: step.shortName,
        readyForProject: false,
        lessonState: nextState,
      };
    }

    // D. If user answered Drill 2 (Question 3/3) -> Mastered! Advance to NEXT concept!
    if (drillIndex === 2) {
      const nextId = getNextConceptId(activeConcept);
      const nextStep = C_CURRICULUM_MAP[nextId];
      return {
        message: `Boom! 3 out of 3 correct! ${step.shortName} is 100% mastered! 🎉\n\n**${nextStep.title}**\n${nextStep.initialQuestion}`,
        question: nextStep.initialQuestion,
        memory: `C curriculum: ${step.shortName} completed with 3/3 drills! Next: ${nextStep.shortName}.`,
        understood: true,
        nextConcept: nextStep.shortName,
        readyForProject: nextId === "cli_calculator",
        lessonState: nextId,
        return_to_build: nextId === "cli_calculator",
      };
    }
  }

  return null;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function normalizeTeachResult(
  raw: unknown,
  forceBeginnerReset: boolean,
  cContext: boolean,
  lessonState?: LessonState
): TeachResult {
  const candidate = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const candidateState = cleanText(candidate.lessonState, 80) || lessonState || "hello_world";

  const result: TeachResult = {
    message: cleanText(candidate.message, 1800) || "Let's take one small step at a time.",
    question: cleanText(candidate.question, 500),
    memory: cleanText(candidate.memory, 900),
    understood: candidate.understood === true,
    nextConcept: cleanText(candidate.nextConcept, 160) || cleanText(candidate.concept, 160),
    readyForProject: candidate.readyForProject === true || candidate.return_to_build === true,
    lessonState: candidateState,
    return_to_build: candidate.return_to_build === true,
  };

  if (forceBeginnerReset && cContext) return helloWorldFallback();
  if (forceBeginnerReset) {
    result.understood = false;
    result.readyForProject = false;
  }
  return result;
}

