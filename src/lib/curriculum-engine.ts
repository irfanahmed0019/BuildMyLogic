import type { LearnerIntent } from "./loop-types";

export type CConceptId =
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
  | "cli_calculator";

export const C_FUNDAMENTALS: CConceptId[] = [
  "hello_world",
  "print_name",
  "variables",
  "input",
  "sum",
  "difference",
  "multiplication",
  "division",
  "modulus",
  "if",
  "else",
  "comparison",
  "loops",
  "cli_calculator",
];

export type DrillItem = {
  question: string;
  expectedKeywords: string[];
  expectedMathAnswer?: number;
};

export type CurriculumStep = {
  id: CConceptId;
  stepNumber: number;
  title: string;
  shortName: string;
  concept: string;
  // Initial prompt: ONLY the question + tiny operator hint (e.g. use %)
  initialQuestion: string;
  expectedKeywords: string[];
  expectedMathAnswer?: number;
  // Teaching explanation: ONLY shown if learner says "I don't know" or requests explanation
  teachingExplanation: string;
  cCodeSnippet: string;
  // 3 practice drill questions: NO hints!
  drills: [DrillItem, DrillItem, DrillItem];
};

export const C_CURRICULUM_MAP: Record<CConceptId, CurriculumStep> = {
  hello_world: {
    id: "hello_world",
    stepNumber: 1,
    title: "1 · Hello World",
    shortName: "Hello World",
    concept: "Running your very first C program",
    initialQuestion: "What C function outputs text to the terminal screen? (Hint: starts with 'p')",
    expectedKeywords: ["printf", "print", "printf()"],
    teachingExplanation: "In C, `printf` is the standard library function that displays text on the screen. Statements run inside `main()`.",
    cCodeSnippet: `#include <stdio.h>\n\nint main(void) {\n    printf("Hello World\\n");\n    return 0;\n}`,
    drills: [
      { question: "What is the name of the function that prints text to the screen in C?", expectedKeywords: ["printf"] },
      { question: "Where does program execution always begin in a C program?", expectedKeywords: ["main"] },
      { question: "What special character creates a new line in printf?", expectedKeywords: ["\\n", "newline"] },
    ],
  },
  print_name: {
    id: "print_name",
    stepNumber: 2,
    title: "2 · Print Your Name",
    shortName: "Print Name",
    concept: "Customizing text with printf",
    initialQuestion: "In `printf(\"Hello World\\n\");` what quotes wrap the text? (Hint: single or double)",
    expectedKeywords: ["double", "double quotes", "quotes", "\""],
    teachingExplanation: "In C, text strings must always be enclosed in double quotes `\"...\"`. Single quotes `'...'` are for single characters.",
    cCodeSnippet: `printf("Hello, Irfan!\\n");`,
    drills: [
      { question: "What punctuation mark ends every statement in C?", expectedKeywords: [";", "semicolon"] },
      { question: "What quotes wrap strings in C: single or double?", expectedKeywords: ["double"] },
      { question: "Can printf print your own name? (yes or no)", expectedKeywords: ["yes", "yup", "yeah"] },
    ],
  },
  variables: {
    id: "variables",
    stepNumber: 3,
    title: "3 · Variables",
    shortName: "Variables",
    concept: "A named box that stores a number",
    initialQuestion: "What keyword in C declares a whole number variable? (Hint: starts with 'i')",
    expectedKeywords: ["int", "integer"],
    teachingExplanation: "A variable is like a labeled box in memory. `int` stands for integer (whole number), like: `int score = 10;`.",
    cCodeSnippet: `int score = 10;`,
    drills: [
      { question: "In `int count = 5;`, what is the variable name?", expectedKeywords: ["count"] },
      { question: "What symbol assigns a value to a variable in C?", expectedKeywords: ["="] },
      { question: "What keyword declares an integer variable in C?", expectedKeywords: ["int"] },
    ],
  },
  input: {
    id: "input",
    stepNumber: 4,
    title: "4 · User Input with scanf",
    shortName: "User Input",
    concept: "Reading input from the keyboard",
    initialQuestion: "In `scanf(\"%d\", &num);` what symbol comes right before `num`? (Hint: use &)",
    expectedKeywords: ["&", "ampersand", "and"],
    teachingExplanation: "`scanf` pauses and waits for user input from the keyboard. The `&` (address-of) operator tells C where to save the value.",
    cCodeSnippet: `int num;\nscanf("%d", &num);`,
    drills: [
      { question: "What function reads keyboard input from the user in C?", expectedKeywords: ["scanf"] },
      { question: "What symbol must go before the variable name in scanf?", expectedKeywords: ["&", "ampersand"] },
      { question: "What format code reads a whole number in scanf: %d or %s?", expectedKeywords: ["%d"] },
    ],
  },
  sum: {
    id: "sum",
    stepNumber: 5,
    title: "5 · Sum (+)",
    shortName: "Sum (+)",
    concept: "Adding two numbers in C",
    initialQuestion: `Here is how you add two numbers in C:

\`\`\`c
int a = 5;
int b = 3;
int sum = a + b;
\`\`\`

Do you understand how the \`+\` works? (Say yes to continue)`,
    expectedKeywords: ["yes", "yeah", "yup", "ok", "understood"],
    teachingExplanation: "In C, the `+` operator adds two numbers together: `int sum = a + b;`.",
    cCodeSnippet: `int a = 5;\nint b = 3;\nint sum = a + b; // 8`,
    drills: [
      { question: "What is 12 + 6?", expectedKeywords: ["18"], expectedMathAnswer: 18 },
      { question: "What is 9 + 7?", expectedKeywords: ["16"], expectedMathAnswer: 16 },
      { question: "What is 15 + 8?", expectedKeywords: ["23"], expectedMathAnswer: 23 },
    ],
  },
  difference: {
    id: "difference",
    stepNumber: 6,
    title: "6 · Difference (-)",
    shortName: "Difference (-)",
    concept: "Subtracting two numbers in C",
    initialQuestion: "Now that you saw addition, how would you write the C code to subtract `b` from `a`? (Hint: use `-`)",
    expectedKeywords: ["a - b", "a-b"],
    teachingExplanation: "In C, the `-` operator subtracts the second number from the first: `int diff = a - b;`.",
    cCodeSnippet: `int a = 12;\nint b = 4;\nint diff = a - b; // 8`,
    drills: [
      { question: "What is 15 - 7?", expectedKeywords: ["8"], expectedMathAnswer: 8 },
      { question: "What is 20 - 9?", expectedKeywords: ["11"], expectedMathAnswer: 11 },
      { question: "What is 14 - 6?", expectedKeywords: ["8"], expectedMathAnswer: 8 },
    ],
  },
  multiplication: {
    id: "multiplication",
    stepNumber: 7,
    title: "7 · Multiplication (*)",
    shortName: "Multiplication (*)",
    concept: "Multiplying numbers in C with *",
    initialQuestion: "What is `4 * 5` in C? (Hint: use `*`)",
    expectedKeywords: ["20", "twenty", "result = 20"],
    expectedMathAnswer: 20,
    teachingExplanation: "In C, we use `*` (asterisk) to multiply numbers: `int result = a * b;`.",
    cCodeSnippet: `int a = 4;\nint b = 5;\nint result = a * b; // 20`,
    drills: [
      { question: "What is 6 * 3?", expectedKeywords: ["18"], expectedMathAnswer: 18 },
      { question: "What is 7 * 2?", expectedKeywords: ["14"], expectedMathAnswer: 14 },
      { question: "What is 8 * 4?", expectedKeywords: ["32"], expectedMathAnswer: 32 },
    ],
  },
  division: {
    id: "division",
    stepNumber: 8,
    title: "8 · Division (/)",
    shortName: "Division (/)",
    concept: "Dividing numbers in C with /",
    initialQuestion: "What is `20 / 4` in C? (Hint: use `/`)",
    expectedKeywords: ["5", "five", "result = 5"],
    expectedMathAnswer: 5,
    teachingExplanation: "In C, `/` (forward slash) divides numbers: `int result = a / b;`.",
    cCodeSnippet: `int a = 20;\nint b = 4;\nint result = a / b; // 5`,
    drills: [
      { question: "What is 15 / 3?", expectedKeywords: ["5"], expectedMathAnswer: 5 },
      { question: "What is 18 / 2?", expectedKeywords: ["9"], expectedMathAnswer: 9 },
      { question: "What is 30 / 5?", expectedKeywords: ["6"], expectedMathAnswer: 6 },
    ],
  },
  modulus: {
    id: "modulus",
    stepNumber: 9,
    title: "9 · Modulus (%)",
    shortName: "Modulus (%)",
    concept: "Getting the remainder of division with %",
    initialQuestion: "What is `10 % 3` in C? (Hint: use `%`)",
    expectedKeywords: ["1", "one", "rem = 1", "remainder 1"],
    expectedMathAnswer: 1,
    teachingExplanation: "In C, `%` (modulus) divides two numbers and gives you the remainder left over. 3 goes into 10 three times (9), so 1 is left over: `10 % 3 = 1`.",
    cCodeSnippet: `int rem = 10 % 3; // 1`,
    drills: [
      { question: "What is 7 % 2?", expectedKeywords: ["1"], expectedMathAnswer: 1 },
      { question: "What is 14 % 4?", expectedKeywords: ["2"], expectedMathAnswer: 2 },
      { question: "What is 20 % 5?", expectedKeywords: ["0", "zero"], expectedMathAnswer: 0 },
    ],
  },
  if: {
    id: "if",
    stepNumber: 10,
    title: "10 · if Conditions",
    shortName: "if Conditions",
    concept: "Making decisions and guarding against errors",
    initialQuestion: "Which keyword checks a condition in C? (Hint: use `if`)",
    expectedKeywords: ["if", "if statement", "if condition", "if()"],
    teachingExplanation: "An `if` statement tests a condition inside parentheses: `if (b == 0) { ... }`. If true, the code inside executes.",
    cCodeSnippet: `if (b == 0) {\n    printf("Error: Cannot divide by zero!\\n");\n}`,
    drills: [
      { question: "In `if (x == 5)`, what operator checks equality?", expectedKeywords: ["=="] },
      { question: "Does an if block execute when the condition is true or false?", expectedKeywords: ["true"] },
      { question: "What brackets wrap the condition in an if statement: ( ) or [ ]?", expectedKeywords: ["()", "( )", "parentheses", "round"] },
    ],
  },
  else: {
    id: "else",
    stepNumber: 11,
    title: "11 · else Statements",
    shortName: "else Statements",
    concept: "Running code when the if condition is false",
    initialQuestion: "Which keyword runs fallback code when `if` is false? (Hint: use `else`)",
    expectedKeywords: ["else", "else statement", "else block"],
    teachingExplanation: "`else` runs when the matching `if` condition evaluated to false: `if (b == 0) { ... } else { ... }`.",
    cCodeSnippet: `if (b == 0) {\n    printf("Cannot divide by 0\\n");\n} else {\n    printf("Result: %d\\n", a / b);\n}`,
    drills: [
      { question: "Can an else block exist without an if before it? (yes or no)", expectedKeywords: ["no"] },
      { question: "Does else have its own condition like else (x == 5)? (yes or no)", expectedKeywords: ["no"] },
      { question: "If condition is true, does the else block run? (yes or no)", expectedKeywords: ["no"] },
    ],
  },
  comparison: {
    id: "comparison",
    stepNumber: 12,
    title: "12 · Comparison Operators",
    shortName: "Comparison",
    concept: "Comparing numbers in C",
    initialQuestion: "What symbol means 'not equal to' in C? (Hint: use `!` and `=`)",
    expectedKeywords: ["!=", "not equal", "! =", "exclamation"],
    teachingExplanation: "In C, `==` checks equal to, and `!=` checks not equal to. The `!` character means NOT.",
    cCodeSnippet: `if (choice != 0) { ... }`,
    drills: [
      { question: "What operator checks 'greater than' in C?", expectedKeywords: [">"] },
      { question: "What operator checks 'less than' in C?", expectedKeywords: ["<"] },
      { question: "What operator checks 'equal to' in C: = or ==?", expectedKeywords: ["=="] },
    ],
  },
  loops: {
    id: "loops",
    stepNumber: 13,
    title: "13 · Loops (while)",
    shortName: "Loops",
    concept: "Repeating calculations without closing the app",
    initialQuestion: "Which keyword in C repeats code while a condition is true? (Hint: use `while`)",
    expectedKeywords: ["while", "while loop", "while()"],
    teachingExplanation: "A `while` loop keeps repeating instructions as long as its condition stays true: `while (choice != 0) { ... }`.",
    cCodeSnippet: `while (choice != 0) {\n    // calculate again!\n}`,
    drills: [
      { question: "What keyword creates a loop in C: while or when?", expectedKeywords: ["while"] },
      { question: "In `while (choice != 0);`, what number stops the loop?", expectedKeywords: ["0", "zero"] },
      { question: "Why does a calculator use a loop: to repeat or to exit immediately?", expectedKeywords: ["repeat"] },
    ],
  },
  cli_calculator: {
    id: "cli_calculator",
    stepNumber: 14,
    title: "14 · Build CLI Calculator",
    shortName: "CLI Calculator",
    concept: "You are ready to build the complete CLI Calculator!",
    initialQuestion: "You've mastered all 13 C building blocks! Are you ready to open VS Code and assemble your CLI Calculator?",
    expectedKeywords: ["yes", "ready", "let's go", "sure", "ok", "yup", "yeah", "open", "athe", "aahn"],
    teachingExplanation: "You now have demonstrated mastery of printf, variables, scanf, +, -, *, /, %, if/else, and while loops!",
    cCodeSnippet: `// Ready to build in VS Code!`,
    drills: [
      { question: "Are you ready to build?", expectedKeywords: ["yes"] },
      { question: "Are you ready to build?", expectedKeywords: ["yes"] },
      { question: "Are you ready to build?", expectedKeywords: ["yes"] },
    ],
  },
};

// ── Manglish, Repetition & Pedagogy Intent Classifier ────────────────────────

const MANGLISH_DONT_KNOW = [
  /\b(ariyilla|ariyathilla|enikku\s*ariyilla|onnum\s*ariyilla)\b/i,
  /\b(manasilayilla|manasilaayilla|manasilakilla)\b/i,
  /\b(oru\s*pidiyum\s*illa|thettipoyi|stuck\s*aayi)\b/i,
  /\b(ith\s*entha|entharu|enthaa\s*ith|evidunnu\s*thudangum)\b/i,
  /\b(paranju\s*tharu|manasilakki\s*tharu|help\s*bro)\b/i,
  /\b(i\s*don['’]?t\s*know|not\s*sure|no\s*idea|confused|stuck)\b/i,
  /\b(explain\s*more\s*simply|make\s*it\s*simpler|easier)\b/i,
  /\b(teach\s*me|please\s*explain|how\s*to\s*do)\b/i,
];

// Detect user instruction to adopt the "ask with hint -> if don't know teach -> then 3 practice questions" pedagogy
const PEDAGOGY_REQUEST = [
  /\b(?:just\s*give\s*the\s*qn|ask\s*(?:teh|the)\s*qns?\s*first)\b/i,
  /\b(?:ask\s*3\s*similar\s*qn|3\s*similar\s*qn|no\s*hints?)\b/i,
  /\b(?:with\s*the\s*hint\s*like\s*use|if\s*(?:the\s*)?user\s*dont\s*know\s*then\s*t?yeach)\b/i,
];

const MANGLISH_REPEAT_COMPLAINT = [
  /\b(hallucinat(?:ing|ion|ed)?)\b/i,
  /\b(keep\s*asking|keeps\s*asking|asking\s*again)\b/i,
  /\b(same\s*question|same\s*item|same\s*calculation)\b/i,
  /\b(pinneyum\s*pinneyum|ith\s*thanne|veruthe\s*chothikkalle)\b/i,
  /\b(already\s*(?:did|ran|saw|answered|told|asked|paranju|said))\b/i,
  /\b(loop\s*aayi|stuck\s*in\s*(?:a\s*)?loop|loopil\s*aayi)\b/i,
  /\b(manglish\s*(?:dont|doesn't|not)\s*work)\b/i,
  /\b(?:teh\s*)?mangslih\b/i,
  /\b(keep\s*asking\s*the\s*calculation)\b/i,
];

const MANGLISH_READY = [
  /\b(athe|aahn|sheriya|sheriyaanu|ok\s*aayi|cheythu|kittiyatha|kollam|adipoli)\b/i,
  /\b(ready\s*bro|next\s*parayu|next\s*concept|angane\s*cheyyam)\b/i,
  /\b(yes|yeah|yep|yup|saw\s*that|works|printed|done|got\s*it|ready|next)\b/i,
];

export function detectCurriculumIntent(input: string): LearnerIntent | "PEDAGOGY_REQUEST" {
  const text = input.trim().toLowerCase();
  if (!text) return "QUESTION";

  if (PEDAGOGY_REQUEST.some((p) => p.test(text))) {
    return "PEDAGOGY_REQUEST";
  }

  if (MANGLISH_REPEAT_COMPLAINT.some((p) => p.test(text))) {
    return "REPEAT";
  }

  if (MANGLISH_DONT_KNOW.some((p) => p.test(text))) {
    return "DONT_KNOW";
  }

  if (MANGLISH_READY.some((p) => p.test(text))) {
    return "READY";
  }

  return "QUESTION";
}

/**
 * Deterministic Answer Evaluator (Math Safety & Keyword Matcher)
 */
export function evaluateCurriculumAnswer(
  conceptId: CConceptId,
  rawAnswer: string,
  drillIndex?: number
): {
  isCorrect: boolean;
  userValue?: number | string;
  feedback?: string;
} {
  const text = rawAnswer.trim().toLowerCase();
  const step = C_CURRICULUM_MAP[conceptId];
  if (!step) return { isCorrect: false };

  let expectedMath: number | undefined = step.expectedMathAnswer;
  let expectedKw: string[] = step.expectedKeywords;

  // If in drill mode (drillIndex: 0, 1, 2)
  if (drillIndex !== undefined && drillIndex >= 0 && drillIndex < step.drills.length) {
    const drill = step.drills[drillIndex];
    expectedMath = drill.expectedMathAnswer;
    expectedKw = drill.expectedKeywords;
  }

  // 1. Math Safety: Check numeric answer if target is a number
  if (typeof expectedMath === "number") {
    const numbers = text.match(/-?\d+/g);
    if (numbers) {
      for (const numStr of numbers) {
        const val = parseInt(numStr, 10);
        if (val === expectedMath) {
          return {
            isCorrect: true,
            userValue: val,
            feedback: `Spot on! ${expectedMath} is correct. 🎉`,
          };
        }
      }
    }
  }

  // 2. Keyword & Symbol matching
  for (const kw of expectedKw) {
    if (text === kw.toLowerCase() || text.includes(kw.toLowerCase())) {
      return {
        isCorrect: true,
        userValue: kw,
        feedback: `Great job! That's correct. 🎉`,
      };
    }
  }

  return { isCorrect: false };
}

export function parseDrillState(lessonState: string): { conceptId: CConceptId; drillIndex?: number } {
  const parts = lessonState.split("_drill_");
  const conceptId = parts[0] as CConceptId;
  const drillIndex = parts.length > 1 ? parseInt(parts[1], 10) : undefined;
  return { conceptId, drillIndex };
}

export function getNextCurriculumConcept(completed: CConceptId[]): CConceptId {
  const next = C_FUNDAMENTALS.find((id) => !completed.includes(id));
  return next ?? "cli_calculator";
}

export function getCurriculumProgress(completed: CConceptId[]): {
  currentStepIndex: number;
  totalSteps: number;
  currentConcept: CConceptId;
  completedList: CConceptId[];
} {
  const current = getNextCurriculumConcept(completed);
  const currentStep = C_CURRICULUM_MAP[current] || C_CURRICULUM_MAP.hello_world;
  return {
    currentStepIndex: currentStep.stepNumber,
    totalSteps: C_FUNDAMENTALS.length,
    currentConcept: current,
    completedList: completed,
  };
}

