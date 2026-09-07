import { createServerFn } from "@tanstack/react-start";
import type { ActivityItem, CodeFile, Mission, Plan, Profile, TechItem } from "./loop-types";
import {
  advanceCBeginner,
  detectIntent,
  isCContext,
  isDuplicateResponse,
  normalizeTeachResult,
  signalsBeginner,
  helloWorldFallback,
  type LessonState,
} from "./teaching-guard";
import { C_CURRICULUM_MAP } from "./curriculum-engine";

function key(): string {
  // Read the secret at request time. In Cloudflare/Lovable the custom Worker
  // entry (src/server.ts) bridges env.SARVAM_API_KEY into process.env.
  const value = process.env["SARVAM_API_KEY"]?.trim();
  if (!value) {
    throw new Error("Some error found.");
  }
  return value;
}

function profileBrief(profile: Profile): string {
  return [
    `Name: ${profile.name || "Builder"}`,
    `Known technologies: ${profile.technologies.map((t) => `${t.name} (${t.level})`).join(", ") || "not stated"}`,
    `Primary goal: ${profile.goal}${profile.goalDetail ? ` — ${profile.goalDetail}` : ""}`,
    `Building experience: ${profile.experience}${profile.experienceDetail ? ` — ${profile.experienceDetail}` : ""}`,
    `Daily build window: ${profile.startTime}–${profile.endTime}${profile.repeatDaily ? " (every day)" : ""}`,
    `Challenge preference: ${profile.challenge || "balanced"}`,
    `Chosen project: ${profile.projectIdea || "not chosen yet"}`,
    profile.resumeSummary ? `Resume summary: ${profile.resumeSummary}` : "",
    profile.followUps.length
      ? `Follow-up answers:\n${profile.followUps.map((f) => `- ${f.question} → ${f.answer}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const COACH =
  "You are BuildMyLogic, an AI build coach that turns learners into builders through real projects. You are practical, concise and never generic.";

type AiTeachMicroLessonResponse = {
  action?: string;
  message: string;
  question: string;
  memory: string;
  understood: boolean;
  nextConcept?: string;
  concept?: string;
  readyForProject?: boolean;
  return_to_build?: boolean;
  lessonState?: LessonState;
};

export const aiAnalyzeResume = createServerFn({ method: "POST" })
  .validator((input: { text: string }) => ({ text: String(input.text).slice(0, 12000) }))
  .handler(async ({ data }) => {
    return await import("./sarvam.server").then(({ sarvamJson }) =>
      sarvamJson<{ name: string; summary: string; technologies: TechItem[]; experience: string }>(
        key(),
        COACH,
        `Read this resume text and extract a builder profile.
Return JSON: {"name": string, "summary": string (2 sentences about what they can already build), "technologies": [{"name": string, "level": "beginner"|"intermediate"|"advanced"}] (max 10), "experience": one of "Yes, and succeeded" | "Yes, but got stuck" | "Started but never finished" | "First time building"}

RESUME:
${data.text}`,
        1200,
      ),
    );
  });

export const aiFollowUpQuestions = createServerFn({ method: "POST" })
  .validator((input: { profile: Profile }) => input)
  .handler(async ({ data }) => {
    return await import("./sarvam.server").then(({ sarvamJson }) =>
      sarvamJson<{ questions: { question: string; placeholder: string }[] }>(
        key(),
        COACH,
        `Based on this builder profile, ask exactly 3 short follow-up questions that you still need answered before designing their build path. Ask about intent, constraints or the specific outcome they want — never about things already answered.
Return JSON: {"questions": [{"question": string, "placeholder": string}]}

PROFILE:
${profileBrief(data.profile)}`,
        700,
      ),
    );
  });

export const aiSuggestProjects = createServerFn({ method: "POST" })
  .validator((input: { profile: Profile }) => input)
  .handler(async ({ data }) => {
    const isBeginner =
      data.profile.experience === "First time building" ||
      data.profile.experience === "Started but never finished" ||
      data.profile.challenge === "Guide me" ||
      data.profile.technologies.some((t) => t.level === "beginner") ||
      !data.profile.technologies.length;

    const instructions = isBeginner
      ? `STRICT BEGINNER PROJECT REQUIREMENT:
The builder is a true BEGINNER. They need accessible, practical, high-confidence starter projects.
DO NOT suggest memory allocators, memory wrappers, compilers, kernels, order books, or systems software.
YOU MUST SUGGEST 4 SIMPLE, PRACTICAL STARTER PROJECTS:
1. "CLI Multi-Tool Calculator" (Stack: C, basic arithmetic, terminal I/O, error handling)
2. "Student Marks & Grade Evaluator" (Stack: C, variables, averages, grade conditionals)
3. "Number Guessing Game & Scoreboard" (Stack: C, loops, comparison logic, game state)
4. "Personal Expense & Budget Logger" (Stack: C, totals, basic structure, persistence)
Return JSON: {"projects": [{"title": string, "summary": string (1 sentence), "stack": string, "why": string}]}`
      : `Research-informed project selection: propose 4 real-world project options that would create the strongest evidence for this person's stated goal.
Return JSON: {"projects": [{"title": string, "summary": string (1 sentence), "stack": string, "why": string}]}`;

    return await import("./sarvam.server").then(({ sarvamJson }) =>
      sarvamJson<{ projects: { title: string; summary: string; stack: string; why: string }[] }>(
        key(),
        COACH,
        `${instructions}

PROFILE:
${profileBrief(data.profile)}`,
        1200,
      ),
    );
  });

const PLAN_SHAPE = `{
 "headline": string (one line spoken to them),
 "profileSummary": string (2 sentences),
 "projectTitle": string,
 "projectPitch": string (2 sentences describing what they will ship),
 "quote": string (short motivating line),
 "skills": [{"name": string, "level": 0-100, "note": string}] (5-6 items),
 "missions": [{"id": "m1", "title": string, "stack": string, "difficulty": 0-5, "minutes": number, "description": string, "skills": [string], "steps": [{"title": string, "detail": string}] (3-5), "deliverable": string, "required_skills": [string], "teaches": [string], "prerequisites": [string]}] (6-8 missions, increasing difficulty starting at 0 or 1, ids m1..mN),
 "session": {"focus": string, "tasks": [{"title": string, "minutes": number}] (3-4), "totalMinutes": number, "tip": string},
 "progress": {"momentum": 0-100, "weeklyGoal": string, "insights": [string] (3)}
}`;

export const aiGeneratePlan = createServerFn({ method: "POST" })
  .validator((input: { profile: Profile }) => input)
  .handler(async ({ data }) => {
    const isBeginner =
      data.profile.experience === "First time building" ||
      data.profile.experience === "Started but never finished" ||
      data.profile.challenge === "Guide me" ||
      data.profile.technologies.some((t) => t.level === "beginner") ||
      !data.profile.technologies.length;

    const planInstructions = isBeginner
      ? `STRICT BEGINNER BUILD PATH:
The builder is a BEGINNER. You MUST start from the very beginning.
DO NOT jump to memory allocators, memory wrappers, structs, pointers, or complex algorithms in early missions.
The mission sequence MUST follow this exact staged ladder:
- Mission 1 (Difficulty 0): Hello World & Program Structure (teaches printf, main, compilation)
- Mission 2 (Difficulty 0): Variables & Numeric Types (teaches int, double, printf formatting)
- Mission 3 (Difficulty 1): Terminal Input with scanf (teaches scanf, interactive prompt)
- Mission 4 (Difficulty 1): Conditionals & Input Validation (teaches if/else, zero division guard)
- Mission 5 (Difficulty 1): Loops & Repeated Execution (teaches while loop, repeat until quit)
- Mission 6 (Difficulty 2): Modular Functions (teaches separate calculation functions)
- Mission 7 (Difficulty 2): Complete Project Assembly (brings it all together into the final deliverable)

Return JSON exactly in this shape:
${PLAN_SHAPE}`
      : `Design a complete personalised build path for this person. Every mission must be a step toward shipping their chosen project, sized to their daily window.
Return JSON exactly in this shape:
${PLAN_SHAPE}`;

    return await import("./sarvam.server").then(({ sarvamJson }) =>
      sarvamJson<Plan>(
        key(),
        COACH,
        `${planInstructions}

PROFILE:
${profileBrief(data.profile)}`,
        3000,
      ),
    );
  });

export const aiRetunePlan = createServerFn({ method: "POST" })
  .validator((input: { profile: Profile; plan: Plan; activity: ActivityItem[] }) => input)
  .handler(async ({ data }) => {
    const recent = data.activity
      .slice(0, 12)
      .map((a) => `- ${new Date(a.at).toISOString().slice(0, 16)} ${a.text}`)
      .join("\n");
    return await import("./sarvam.server").then(({ sarvamJson }) =>
      sarvamJson<Plan>(
        key(),
        COACH,
        `Re-tune this build path based on how the builder is actually performing. Raise skill levels they proved, adjust difficulty and remaining missions, rewrite the session plan and progress insights. Keep completed missions but mark harder follow-ups.
Return JSON in the same shape:
${PLAN_SHAPE}

PROFILE:
${profileBrief(data.profile)}

CURRENT PLAN:
${JSON.stringify(data.plan).slice(0, 6000)}

RECENT ACTIVITY:
${recent || "no activity yet"}`,
        3000,
      ),
    );
  });

export const aiGenerateCode = createServerFn({ method: "POST" })
  .validator((input: { mission: Mission; projectTitle: string }) => input)
  .handler(async ({ data }) => {
    return await import("./sarvam.server").then(({ sarvamJson }) =>
      sarvamJson<{ files: CodeFile[]; notes: string }>(
        key(),
        COACH,
        `Write the starter workspace for this mission so the builder can open it in VS Code and start coding immediately. Include real runnable code with clear TODOs where they must think, plus a README with run instructions.
Return JSON: {"files": [{"name": string (path like src/main.py), "language": string, "content": string}] (2-4 files), "notes": string (how to run it)}

PROJECT: ${data.projectTitle}
MISSION: ${JSON.stringify(data.mission).slice(0, 3000)}`,
        3000,
      ),
    );
  });

export const aiTeachMicroLesson = createServerFn({ method: "POST" })
  .validator((input: {
    topic: string;
    missionTitle: string;
    missionDescription: string;
    level: string;
    learningMode: "practical" | "balanced" | "theory";
    history: { role: "mentor" | "student"; text: string }[];
    memory?: string;
    lessonState?: string;
    studentAnswer?: string;
    wantsSimpler?: boolean;
    attachmentContext?: string;
  }) => ({
    topic: String(input.topic).slice(0, 160),
    missionTitle: String(input.missionTitle).slice(0, 240),
    missionDescription: String(input.missionDescription).slice(0, 700),
    level: String(input.level).slice(0, 80),
    learningMode: input.learningMode,
    history: (input.history ?? []).slice(-8).map((item) => ({ role: item.role, text: String(item.text).slice(0, 700) })),
    memory: String(input.memory ?? "").slice(0, 900),
    studentAnswer: String(input.studentAnswer ?? "").slice(0, 1200),
    wantsSimpler: Boolean(input.wantsSimpler),
    attachmentContext: String(input.attachmentContext ?? "").slice(0, 40000),
    lessonState: String(input.lessonState ?? "hello_world") as LessonState,
  }))
  .handler(async ({ data }) => {
    const isCurriculum = Boolean(
      data.lessonState &&
      (data.lessonState in C_CURRICULUM_MAP ||
       data.lessonState === "arithmetic" ||
       data.lessonState === "hello_world" ||
       data.lessonState === "printf" ||
       data.lessonState === "variables")
    );
    const cContext = isCurriculum || isCContext(data.topic, data.missionTitle, data.missionDescription);
    const intent = detectIntent(data.studentAnswer, data.lessonState);
    const learnerAskedToReset = signalsBeginner(data.studentAnswer) || data.wantsSimpler || intent === "DONT_KNOW";

    // 1. Check deterministic state machine progression first for C foundations.
    // This guarantees immediate, correct handling of "i don't know" (scaffold),
    // "yes / saw that" (advance), "hey" (friendly greeting), and repetition.
    if (cContext) {
      const deterministic = advanceCBeginner(data.lessonState as LessonState, data.studentAnswer);
      if (deterministic) {
        return deterministic;
      }
    }

    const forceBeginnerReset = learnerAskedToReset;

    // 2. Authoritative Vibe System Prompt — Simple English + Manglish
    const system = `You are Vibe, the friendly coding mentor inside BuildMyLogic.

Your job: Teach ONE small thing at a time. Keep it simple. Go at the learner's pace.

==================================================
CORE RULE
==================================================
NEVER assume the learner knows something just because:
- it is in the mission name
- they picked a hard project
- they know another language
- the AI already explained it before

Only believe the learner knows something when they SHOW it.
If not shown → treat as unknown → start simple.

==================================================
BEGINNER RULE
==================================================
If learner says anything like:
"I don't know", "I don't understand", "start from basic",
"make it easier", "what is this?", "manasilayilla", "ariyilla"
→ STOP the current concept.
→ Go back to the simplest thing first.

C beginner order (NEVER skip steps):
1. Hello World
2. printf
3. main()
4. variables
5. basic types (int, float)
6. scanf (input)
7. arithmetic (+ - * /)
8. if/else
9. loops (while, for)
10. functions
11. arrays
12. strings
13. pointers
14. structs
15. file handling
16. bigger projects

==================================================
IF LEARNER DOES NOT KNOW
==================================================
Do NOT repeat same question.
Do NOT say "Let's stay on this".

Instead do this:
1. Say "That's okay!" — don't make them feel bad.
2. Explain in 1-2 very simple sentences.
3. Give one tiny example.
4. Ask ONE small question.
5. Wait for their answer.
6. Move forward only after they show they understand.

==================================================
NEVER REPEAT & MATH SAFETY
==================================================
Check the chat history.
If your answer is same as before → DON'T send it.
Instead: try a different example, a different question, or go one step back.

CRITICAL MATH & CALCULATION RULES:
- NEVER ask endless math calculation questions!
- NEVER hallucinate that 12 - 4 = 8 is wrong! 12 - 4 = 8 is 100% correct!
- Once a learner answers subtraction (12 - 4 = 8), SUBTRACTION IS DONE!
  Do NOT ask another subtraction question!
  Advance immediately to Multiplication (*) or C code!
- Maximum 1 calculation question per concept.
- If the learner says you are repeating, hallucinating, or stuck:
  Apologize in 1 short sentence, celebrate their correct answer, and immediately advance to the next concept!

==================================================
LANGUAGE RULES — VERY IMPORTANT
==================================================
SPEAK LIKE YOU ARE EXPLAINING TO A CHILD OR A NEW ENGLISH LEARNER.

Rules:
- Short sentences. Max 8-10 words each.
- Use easy, everyday words.
- If something is technical, explain it with a real-life example first.
  Example: "Variable is like a box. You put a number in the box."
- ONE idea at a time. Not many ideas together.

MANGLISH SUPPORT:
The learner may write in Manglish (Malayalam + English mixed). This is totally fine and normal.

Common Manglish words and what they mean:
- "ith entha" = "what is this"
- "manasilayilla" = "I don't understand"
- "ariyilla" = "I don't know"
- "evidunnu thudangum" = "where do I start"
- "parayande" / "parayam" = "please explain" / "tell me"
- "sheriyaa?" = "is it correct?"
- "adipoli" = "awesome / great"
- "kollam" = "good / nice"
- "enthu cheyyum" = "what should I do"
- "ok ayi" = "it worked / okay done"
- "eviduthu varum" = "where does this come from"
- "pinne?" = "then what? / and then?"
- "aahn" = "yes / okay / I see"
- "enthaa" = "what is it"
- "ingane cheyyamo?" = "can I do it like this?"

When you see Manglish → understand it → reply in simple English.
NEVER say "I don't understand your language". Just get the meaning and reply simply.

TONE:
- Friendly. Like a helpful friend, not a strict teacher.
- Light and encouraging. Never boring.
- Use a simple emoji sometimes 😊 👍 
- When they get something right, celebrate a little! "Yes! That's it! 🎉"

EXAMPLES OF GOOD RESPONSES:
Good: "A variable is like a box. You give the box a name. You put a number inside."
Bad: "In C programming, variables are named memory locations that store values of a specific data type."

Good: "Let's try something small. Can you type: printf("Hello");"
Bad: "Now we will proceed to examine the printf function which is part of the stdio.h library and is used for formatted output."

==================================================
LEARNING STYLE
==================================================
- Patient. Friendly. Never rush.
- One concept at a time.
- Never give the full solution unless they are truly stuck and asked many times.
- When concept is learned and ready to practice → set return_to_build: true.

OUTPUT CONTRACT:
Return JSON with:
{
  "action": "ask_question" | "give_hint" | "scaffold" | "return_to_build",
  "concept": string,
  "message": string,
  "question": string,
  "memory": string (<=400 chars),
  "understood": boolean,
  "nextConcept": string,
  "readyForProject": boolean,
  "return_to_build": boolean,
  "lessonState": string
}`;

    const historySummary = data.history.map((item) => `${item.role.toUpperCase()}: ${item.text}`).join("\n");

    const user = `AUTHORITATIVE STATE:
Topic: ${data.topic}
Mission: ${data.missionTitle}
Level: ${data.level}
Current Checkpoint: ${data.lessonState}
Detected Intent: ${intent}

HIDDEN MEMORY:
${data.memory || "none"}

RECENT CHAT:
${historySummary || "none"}

LATEST LEARNER ANSWER:
"${data.studentAnswer || "Starting interaction"}"

WANTS SIMPLER: ${data.wantsSimpler ? "yes" : "no"}

UNTRUSTED ATTACHMENT CONTEXT:
${data.attachmentContext || "none"}

Provide the next single intervention conforming to the output contract.`;

    try {
      let raw = await import("./sarvam.server").then(({ sarvamJson }) =>
        sarvamJson<AiTeachMicroLessonResponse>(key(), system, user, 900),
      );

      // Anti-Repeat Guard: If the model generated something matching previous assistant messages,
      // re-prompt with explicit instruction to break repetition.
      const previousAssistantMsgs = data.history.filter((m) => m.role === "mentor").map((m) => m.text);
      if (isDuplicateResponse(raw.message, previousAssistantMsgs)) {
        const retryUser = `${user}\n\nCRITICAL ANTI-REPEAT ALERT:\nYour previous proposed response was already sent earlier: "${raw.message.slice(0, 100)}...". DO NOT repeat it. You MUST advance the checkpoint or ask a DIFFERENT scaffold question.`;
        try {
          raw = await import("./sarvam.server").then(({ sarvamJson }) =>
            sarvamJson<AiTeachMicroLessonResponse>(key(), system, retryUser, 900),
          );
        } catch {
          // If retry fails, use deterministic fallback
        }
      }

      return normalizeTeachResult(raw, forceBeginnerReset, cContext, data.lessonState as LessonState);
    } catch (error) {
      if (forceBeginnerReset && cContext) return helloWorldFallback();
      throw error;
    }
  });

export const aiReviewSession = createServerFn({ method: "POST" })
  .validator((input: { missionTitle: string; note: string; minutes: number }) => input)
  .handler(async ({ data }) => {
    return await import("./sarvam.server").then(({ sarvamJson }) =>
      sarvamJson<{ feedback: string; nextStep: string; skillBoost: string }>(
        key(),
        COACH,
        `The builder just finished a ${data.minutes} minute session on "${data.missionTitle}". Their note: "${data.note || "no note"}".
Return JSON: {"feedback": string (2 sentences, honest), "nextStep": string (one concrete next action), "skillBoost": string (the skill that improved most)}`,
        500,
      ),
    );
  });

export const aiReviewProjectZip = createServerFn({ method: "POST" })
  .validator((input: { fileName: string; dataBase64: string; missionTitle?: string }) => ({
    fileName: String(input.fileName).slice(0, 180),
    dataBase64: String(input.dataBase64).slice(0, 12_000_000),
    missionTitle: String(input.missionTitle ?? "").slice(0, 240),
  }))
  .handler(async ({ data }) => {
    const { unzipSync } = await import("fflate");
    if (!data.fileName.toLowerCase().endsWith(".zip")) throw new Error("Please upload a .zip project file.");

    const binary = atob(data.dataBase64);
    if (binary.length > 8 * 1024 * 1024) throw new Error("That ZIP is too large. Please keep project uploads under 8 MB.");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

    let files: Record<string, Uint8Array>;
    try {
      files = unzipSync(bytes);
    } catch {
      throw new Error("I couldn't open that ZIP. Make sure it is a valid project archive.");
    }

    const ignored = /(^|\/)(node_modules|dist|build|\.git|\.next|coverage)(\/|$)/i;
    const binaryExt = /\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|mp4|mov|woff2?|ttf|eot|mp3|wav|sqlite|db)$/i;
    const entries = Object.entries(files)
      .filter(([name, content]) => !name.endsWith("/") && !ignored.test(name) && !binaryExt.test(name) && content.length < 120_000)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 80);

    const decoder = new TextDecoder();
    let snapshot = entries.map(([name, content]) => `FILE: ${name}\n${decoder.decode(content).slice(0, 6000)}`).join("\n\n---\n\n");
    snapshot = snapshot.slice(0, 70_000);
    if (!snapshot.trim()) throw new Error("The ZIP did not contain readable source files.");

    return await import("./sarvam.server").then(({ sarvamJson }) =>
      sarvamJson<{
        score: number;
        verdict: string;
        strengths: string[];
        issues: string[];
        security: string[];
        missing: string[];
        nextSteps: string[];
      }>(
        key(),
        COACH,
        `Review a student's completed project ZIP as a practical code reviewer. Do not give a certification or claim that security is guaranteed. Use the actual files below as evidence. Evaluate whether it looks runnable, complete for the mission, understandable, maintainable and reasonably secure. Prioritize functional gaps, error handling, tests, configuration, secrets, dependency risks, and README/run instructions. Return JSON exactly: {"score":0-100,"verdict":"one sentence","strengths":["..."],"issues":["..."],"security":["..."],"missing":["..."],"nextSteps":["..."]}. Keep each array to at most 5 concise items.

MISSION: ${data.missionTitle || "Not provided"}
UPLOADED FILES:\n${snapshot}`,
        2200,
      ),
    );
  });
