import type {
  CompressedMemorySummary,
  LearningState,
  Mission,
  Profile,
  SkillMemoryMap,
} from "./loop-types";

export type ContextInput = {
  profile?: Profile | null;
  mission: Mission;
  learningState: LearningState;
  skillMemory?: SkillMemoryMap;
  recentHistory: { role: "mentor" | "student"; text: string }[];
  latestAnswer?: string;
  detectedIntent?: string;
  attachmentContext?: string;
};

export type BuiltContext = {
  systemPrompt: string;
  userPrompt: string;
  compressedMemory: CompressedMemorySummary;
};

export function buildCompressedMemory(
  learnerName: string,
  mission: Mission,
  state: LearningState,
  latestAnswer?: string
): CompressedMemorySummary {
  const known = [...(state.demonstratedSkills || [])];
  if (state.understood && state.concept && !known.includes(state.concept)) {
    known.push(state.concept);
  }

  const weak = state.hintsUsed > 0 && !state.understood ? [state.concept] : [];

  return {
    learnerName: learnerName || "Learner",
    currentMission: mission.title,
    currentObjective: `Master ${state.concept} for ${mission.title}`,
    knownConcepts: known,
    weakConcepts: weak,
    recentActivity: latestAnswer ? [`Latest response: "${latestAnswer.slice(0, 80)}"`] : [],
    teachingApproach: state.hintsUsed > 1 ? "Scaffold with tiny examples and simpler questions" : "Socratic, 1 concept at a time",
    currentTeachingState: `Concept: ${state.concept}, Step: ${state.stepId}, Attempts: ${state.attempts}, Status: ${state.status}`,
    nextGoal: state.understood ? `Advance beyond ${state.concept}` : `Clarify and verify ${state.concept}`,
  };
}

export function buildAiContext(input: ContextInput, systemPrompt: string): BuiltContext {
  const name = input.profile?.name?.trim() || "Learner";
  const memory = buildCompressedMemory(name, input.mission, input.learningState, input.latestAnswer);

  const skillsList = Object.entries(input.skillMemory || {})
    .map(([skill, item]) => `${skill}: ${item.level}% (${item.evidence.length} evidence pts)`)
    .join(", ") || (input.learningState.demonstratedSkills.length > 0 ? input.learningState.demonstratedSkills.join(", ") : "None demonstrated yet");

  const recentChatStr = (input.recentHistory || [])
    .slice(-6)
    .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
    .join("\n") || "No prior messages";

  const userPrompt = `AUTHORITATIVE LEARNER STATE:
Learner: ${name}
Goal: ${input.profile?.goal || "Learn practical programming"}
Experience level: ${input.profile?.experience || "beginner"}

MISSION:
Title: ${input.mission.title}
Stack: ${input.mission.stack}
Difficulty: ${input.mission.difficulty}
Description: ${input.mission.description}

COMPRESSED LEARNING MEMORY (Layer 3):
- Current Concept: ${input.learningState.concept}
- Step ID: ${input.learningState.stepId}
- Step Status: ${input.learningState.status} (Understood: ${input.learningState.understood})
- Attempts on this step: ${input.learningState.attempts}
- Hints used: ${input.learningState.hintsUsed}
- Known/Demonstrated Skills: ${skillsList}
- Weak Concepts: ${memory.weakConcepts.join(", ") || "None"}
- Last Question Asked: "${input.learningState.lastQuestion || "none"}"
- Teaching Approach: ${memory.teachingApproach}

LATEST LEARNER EVENT:
- Latest Answer: "${input.latestAnswer || "Starting interaction"}"
- Detected Intent: ${input.detectedIntent || "QUESTION"}
${input.attachmentContext ? `\nATTACHED CODE CONTEXT:\n${input.attachmentContext.slice(0, 8000)}` : ""}

RECENT CONVERSATION:
${recentChatStr}

INSTRUCTIONS FOR THIS RESPONSE:
1. Act as Vibe, strictly obeying the authoritative learner state.
2. If the learner answered correctly, acknowledge briefly, mark concept complete, advance to the NEXT concept in the progression, and ask the next question.
3. If the learner said "I don't know" or is struggling, DO NOT repeat the question or reset to Hello World. Provide a SCAFFOLD (1-2 sentences explanation + tiny example + simpler question).
4. Return JSON only with:
   {
     "action": "ask_question" | "give_hint" | "scaffold" | "return_to_build",
     "concept": string,
     "teaching_state": string,
     "message": string,
     "question": string,
     "return_to_build": boolean,
     "understood": boolean,
     "memory": string
   }`;

  return {
    systemPrompt,
    userPrompt,
    compressedMemory: memory,
  };
}
