export type TechItem = { name: string; level: "beginner" | "intermediate" | "advanced" };
export type FollowUpAnswer = { question: string; answer: string };
export type Profile = {
  name: string;
  resumeText: string;
  resumeSummary: string;
  technologies: TechItem[];
  goal: string;
  goalDetail: string;
  experience: string;
  experienceDetail: string;
  startTime: string;
  endTime: string;
  repeatDaily: boolean;
  followUps: FollowUpAnswer[];
  projectIdea: string;
  challenge: string;
};

export type PlanSkill = { name: string; level: number; note: string };
export type MissionStep = { title: string; detail: string };

export type Mission = {
  id: string;
  title: string;
  stack: string;
  difficulty: number;
  minutes: number;
  description: string;
  skills: string[];
  steps: MissionStep[];
  deliverable: string;
  required_skills?: string[];
  teaches?: string[];
  prerequisites?: string[];
  next_mission?: string;
};

export type SessionTask = { title: string; minutes: number };
export type SessionReview = { feedback: string; nextStep: string; skillBoost: string };
export type Plan = {
  headline: string;
  profileSummary: string;
  projectTitle: string;
  projectPitch: string;
  quote: string;
  skills: PlanSkill[];
  missions: Mission[];
  session: { focus: string; tasks: SessionTask[]; totalMinutes: number; tip: string };
  progress: { momentum: number; weeklyGoal: string; insights: string[] };
};

export type CodeFile = { name: string; language: string; content: string };
export type MissionProgress = { status: "locked" | "active" | "done"; completedSteps: number[]; code?: CodeFile[]; codeNotes?: string };
export type ActivityItem = { at: number; text: string; kind: "mission" | "session" | "ai" | "skill" };
export type SessionLog = { at: number; minutes: number; missionTitle: string; note: string; tasks?: SessionTask[]; completedTasks?: number[]; review?: SessionReview };

// ── Three-Layer Memory Architecture ───────────────────────────────────────────

// Layer 1: Permanent Learner Memory
export type PermanentLearnerMemory = {
  userId: string;
  name: string;
  primaryGoal: string;
  preferredLanguage: string;
  experienceLevel: "beginner" | "intermediate" | "advanced";
  learningStyle: "practical" | "balanced" | "theory";
  currentTrack: string;
};

// Layer 2: Skill Memory (deterministic evidence-driven metrics)
export type SkillEvidenceItem = {
  description: string;
  at: number;
  weight: number;
  source: "code_test" | "checkpoint_answer" | "scaffold_completed" | "independent_solution";
};

export type SkillMemoryItem = {
  level: number; // 0 to 100
  evidence: SkillEvidenceItem[];
  lastPracticedAt?: number;
};

export type SkillMemoryMap = Record<string, SkillMemoryItem>;

// Layer 3: AI Conversational & Compressed Memory
export type LearnerIntent =
  | "CORRECT"
  | "INCORRECT"
  | "DONT_KNOW"
  | "QUESTION"
  | "READY"
  | "CASUAL"
  | "REPEAT"
  | "OFF_TOPIC";

export type LearningState = {
  concept: string;
  stepId: string;
  status: "active" | "completed";
  attempts: number;
  lastQuestion: string;
  lastAnswer: string;
  understood: boolean;
  hintsUsed: number;
  demonstratedSkills: string[];
  struggling?: boolean;
};

export type CompressedMemorySummary = {
  learnerName: string;
  currentMission: string;
  currentObjective: string;
  knownConcepts: string[];
  weakConcepts: string[];
  recentActivity: string[];
  teachingApproach: string;
  currentTeachingState: string;
  nextGoal: string;
};

export type VibeAction = "ask_question" | "give_hint" | "scaffold" | "return_to_build" | "clarify";

export type VibeStructuredResponse = {
  action: VibeAction;
  concept: string;
  teaching_state: string;
  message: string;
  question?: string;
  return_to_build: boolean;
  expected_evidence?: string;
  hint_level?: number;
  understood?: boolean;
  readyForProject?: boolean;
  memory?: string;
  lessonState?: string;
};

export type LearningMode = "practical" | "balanced" | "theory";
export type LearningChat = {
  mode: LearningMode;
  lessonState?: string;
  learningState?: LearningState;
  memorySummary?: CompressedMemorySummary;
  messages: { role: "mentor" | "student"; text: string; attachments?: { name: string; size: number }[] }[];
  memory?: string;
  updatedAt: number;
};

export type LoopState = {
  onboarded: boolean;
  profile: Profile | null;
  plan: Plan | null;
  missionProgress: Record<string, MissionProgress>;
  activity: ActivityItem[];
  sessions: SessionLog[];
  learningChats: Record<string, LearningChat>;
  selectedLearningMissionId: string | null;
  skillMemory?: SkillMemoryMap;
};

export const defaultStarterProfile: Profile = {
  name: "Builder",
  resumeText: "",
  resumeSummary: "Logic learner starting the systems programming track.",
  technologies: [
    { name: "C", level: "beginner" },
    { name: "Logic & Algorithms", level: "beginner" },
  ],
  goal: "Build real-world software logic and projects",
  goalDetail: "Master programming fundamentals through guided logic drills and shipping code.",
  experience: "Beginner",
  experienceDetail: "Starting with C syntax, input/output, and arithmetic systems.",
  startTime: "19:00",
  endTime: "20:00",
  repeatDaily: true,
  followUps: [],
  projectIdea: "CLI Arithmetic Calculator in C",
  challenge: "Build a clean, robust CLI calculator with error handling.",
};

export const defaultStarterPlan: Plan = {
  headline: "From Logic Fundamentals to Shipped Systems.",
  profileSummary: "Beginner software builder focusing on systems programming, core logic and problem solving.",
  projectTitle: "CLI Arithmetic & Logic Engine",
  projectPitch: "Build a robust command-line arithmetic calculator in C that parses inputs, evaluates operations safely, and prevents runtime edge-case errors.",
  quote: "Ship the system, then explain the design.",
  skills: [
    { name: "C Fundamentals", level: 10, note: "Core syntax, data types, and standard library" },
    { name: "Input & Output", level: 5, note: "Safe terminal reading with scanf and printf" },
    { name: "Arithmetic & Modulus", level: 15, note: "Operator precedence and mathematical logic" },
    { name: "Conditionals & Logic", level: 5, note: "Branching execution with if/else statements" },
    { name: "Problem Solving", level: 10, note: "Deconstructing problems into verifiable steps" },
  ],
  missions: [
    {
      id: "cli-calculator",
      title: "CLI Arithmetic Calculator",
      stack: "C (GCC / Clang)",
      difficulty: 1,
      minutes: 30,
      description: "Build an interactive command-line calculator in C that supports addition, subtraction, multiplication, division, and remainder with input validation.",
      skills: ["C Fundamentals", "Input & Output", "Arithmetic & Modulus", "Conditionals & Logic"],
      steps: [
        { title: "Initialize Project & Variables", detail: "Create main.c and declare integer variables for user input." },
        { title: "Capture User Input", detail: "Use scanf to read numbers and arithmetic operators from terminal." },
        { title: "Implement Operator Branching", detail: "Use switch/if-else to perform the right arithmetic calculation." },
        { title: "Handle Division by Zero", detail: "Add defensive guard to prevent runtime crashes on zero divisors." },
      ],
      deliverable: "Working main.c that compiles with gcc -o calc main.c and runs tests.",
    },
    {
      id: "memory-inspector",
      title: "Memory Buffer & String Reverser",
      stack: "C",
      difficulty: 2,
      minutes: 45,
      description: "Manipulate character arrays and pointers in memory to reverse and sanitize text inputs.",
      skills: ["Pointers", "Memory Management", "Strings"],
      steps: [
        { title: "Array Allocation", detail: "Allocate character buffer for user strings." },
        { title: "Two-Pointer Swap", detail: "Implement in-place character reversal with pointers." },
        { title: "Null Terminator Safety", detail: "Ensure strings are correctly null-terminated." },
      ],
      deliverable: "Robust memory string utility with pointer verification.",
    },
    {
      id: "file-data-parser",
      title: "Structured CSV Record Parser",
      stack: "C",
      difficulty: 3,
      minutes: 60,
      description: "Read structured record files from disk, parse fields into C structs, and compute summary statistics.",
      skills: ["File I/O", "Structs", "Data Parsing"],
      steps: [
        { title: "File Stream Handling", detail: "Open and validate file descriptors with fopen and fclose." },
        { title: "Struct Definition", detail: "Define data structures to model incoming records." },
        { title: "Format Analysis", detail: "Parse comma-separated values and output structured reports." },
      ],
      deliverable: "Clean CSV parsing CLI tool with file safety checks.",
    },
  ],
  session: {
    focus: "Implement CLI Calculator in C",
    tasks: [
      { title: "Learn arithmetic operators in Vibe Coach", minutes: 10 },
      { title: "Open VS Code and write main.c scaffold", minutes: 20 },
      { title: "Compile and run unit tests", minutes: 10 },
      { title: "Review score and log evidence", minutes: 5 },
    ],
    totalMinutes: 45,
    tip: "Keep variables descriptive and always check scanf return values.",
  },
  progress: {
    momentum: 1,
    weeklyGoal: "Complete CLI Arithmetic Calculator and earn your first 5 skills",
    insights: ["Starting with arithmetic gives you immediate mastery over operators and data types."],
  },
};

export const emptyState: LoopState = {
  onboarded: true,
  profile: defaultStarterProfile,
  plan: defaultStarterPlan,
  missionProgress: {
    "cli-calculator": { status: "active", completedSteps: [] },
    "memory-inspector": { status: "locked", completedSteps: [] },
    "file-data-parser": { status: "locked", completedSteps: [] },
  },
  activity: [
    { at: Date.now(), text: "Welcome to BuildMyLogic! Starter build path initialized.", kind: "ai" }
  ],
  sessions: [],
  learningChats: {},
  selectedLearningMissionId: "cli-calculator",
  skillMemory: {},
};

