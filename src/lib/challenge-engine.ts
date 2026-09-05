import type { Mission } from "./loop-types";

export type Challenge = Mission & {
  required_skills: string[];
  teaches: string[];
  prerequisites: string[];
  hint_ladder?: string[];
  tests?: string[];
};

export const C_FOUNDATIONAL_CHALLENGES: Challenge[] = [
  {
    id: "c_hello_world",
    title: "Hello World & Program Structure",
    stack: "C",
    difficulty: 0,
    minutes: 10,
    description: "Write your first C program, understand main() and output formatted text using printf.",
    skills: ["printf", "program_structure"],
    required_skills: [],
    teaches: ["program_structure", "printf"],
    prerequisites: [],
    next_mission: "c_variables",
    deliverable: "Run hello.c and see 'Hello World' in the terminal.",
    steps: [
      { title: "Create hello.c", detail: "Include stdio.h and declare the main function." },
      { title: "Print greeting", detail: "Use printf(\"Hello World\\n\"); to print to stdout." },
      { title: "Compile and run", detail: "Compile with gcc hello.c -o hello and execute ./hello." },
    ],
    hint_ladder: [
      "What is the starting function where every C program begins?",
      "Remember to include <stdio.h> to access printf.",
      "Syntax clue: printf(\"Hello World\\n\"); return 0;",
    ],
    tests: ["output_matches_hello_world"],
  },
  {
    id: "c_variables",
    title: "Simple Variables & Types",
    stack: "C",
    difficulty: 0,
    minutes: 15,
    description: "Store numbers in named variables, understand int and double data types, and print them.",
    skills: ["variables", "data_types"],
    required_skills: ["printf"],
    teaches: ["variables", "int", "double"],
    prerequisites: ["c_hello_world"],
    next_mission: "c_input_output",
    deliverable: "Declare an integer and a floating-point number and print their values.",
    steps: [
      { title: "Declare variables", detail: "Declare int count = 10; and double price = 9.99;" },
      { title: "Format output", detail: "Print variables using %d for int and %.2f for double." },
    ],
    hint_ladder: [
      "A variable needs a type and a name before you can assign a value.",
      "Format specifiers: %d is for integers, %f is for floating point numbers.",
      "Example: printf(\"Count: %d, Price: %.2f\\n\", count, price);",
    ],
    tests: ["variables_declared_and_printed"],
  },
  {
    id: "c_input_output",
    title: "Terminal Input with scanf",
    stack: "C",
    difficulty: 1,
    minutes: 20,
    description: "Make programs interactive by reading numbers and characters from the user via stdin.",
    skills: ["input_handling", "scanf"],
    required_skills: ["variables"],
    teaches: ["scanf", "terminal_io", "address_of_operator"],
    prerequisites: ["c_variables"],
    next_mission: "c_conditionals",
    deliverable: "Prompt the user for two numbers and print their sum.",
    steps: [
      { title: "Prompt user", detail: "Print a clear prompt telling the user what to enter." },
      { title: "Read with scanf", detail: "Use scanf(\"%d\", &variable); to store input." },
      { title: "Display result", detail: "Compute the sum and display it back." },
    ],
    hint_ladder: [
      "Notice the & operator before the variable name in scanf(&var).",
      "scanf needs to know WHERE to store the incoming value in memory.",
      "Example: scanf(\"%d %d\", &a, &b);",
    ],
    tests: ["interactive_sum_calculation"],
  },
  {
    id: "c_conditionals",
    title: "Branching Logic & Guard Rails",
    stack: "C",
    difficulty: 1,
    minutes: 25,
    description: "Use if/else statements to make decisions and validate input, such as preventing division by zero.",
    skills: ["conditionals", "validation"],
    required_skills: ["variables", "input_handling"],
    teaches: ["if_else", "comparison_operators", "zero_validation"],
    prerequisites: ["c_input_output"],
    next_mission: "c_loops",
    deliverable: "A division calculator that cleanly prevents zero division.",
    steps: [
      { title: "Check divisor", detail: "Compare divisor to 0 before doing arithmetic." },
      { title: "Branch execution", detail: "If divisor is 0, print an error; else compute and display." },
    ],
    hint_ladder: [
      "What happens if the second number is zero during division?",
      "Can you check the condition before dividing?",
      "Syntax clue: if (b == 0) { ... } else { ... }",
    ],
    tests: ["normal_division", "division_by_zero_prevented"],
  },
  {
    id: "c_loops",
    title: "Loops & Repeated Execution",
    stack: "C",
    difficulty: 1,
    minutes: 30,
    description: "Use while and for loops to keep your program running or iterate over numeric ranges.",
    skills: ["loops", "while_loop", "for_loop"],
    required_skills: ["conditionals"],
    teaches: ["while_loop", "for_loop", "loop_control"],
    prerequisites: ["c_conditionals"],
    next_mission: "c_functions",
    deliverable: "Make a calculator repeatedly prompt for operations until the user types 'q' to quit.",
    steps: [
      { title: "Form loop condition", detail: "Use a while loop that checks if exit was requested." },
      { title: "Execute body", detail: "Run calculation inside loop." },
      { title: "Break or continue", detail: "Cleanly terminate when user chooses to quit." },
    ],
    hint_ladder: [
      "Why does a program terminate after one calculation without a loop?",
      "A while loop repeats its code as long as its condition remains true.",
      "Example: while (choice != 'q') { ... }",
    ],
    tests: ["repeats_calculation", "exits_on_quit_command"],
  },
  {
    id: "c_functions",
    title: "Modular Functions & Clean Architecture",
    stack: "C",
    difficulty: 2,
    minutes: 30,
    description: "Break monolithic main() code into small, single-responsibility functions with return types.",
    skills: ["functions", "refactoring"],
    required_skills: ["loops"],
    teaches: ["functions", "parameters", "return_values"],
    prerequisites: ["c_loops"],
    next_mission: "c_arrays",
    deliverable: "Separate arithmetic operations into individual functions (add, subtract, multiply, divide).",
    steps: [
      { title: "Define signatures", detail: "Write double add(double a, double b);" },
      { title: "Implement functions", detail: "Return computed results." },
      { title: "Call in main", detail: "Replace raw calculations in main with function calls." },
    ],
    hint_ladder: [
      "Functions let you isolate logic and reuse it without repeating code.",
      "A function signature specifies: return_type name(param1, param2);",
    ],
    tests: ["functions_isolated_and_tested"],
  },
  {
    id: "c_arrays",
    title: "Arrays & Data Sequences",
    stack: "C",
    difficulty: 2,
    minutes: 35,
    description: "Store and iterate through collections of numbers or records using arrays.",
    skills: ["arrays", "indexing"],
    required_skills: ["functions"],
    teaches: ["arrays", "indexing", "bounds_safety"],
    prerequisites: ["c_functions"],
    next_mission: "c_structs",
    deliverable: "Store calculation history in an array and print the last 5 results.",
    steps: [
      { title: "Declare array", detail: "double history[10]; int count = 0;" },
      { title: "Store elements", detail: "Insert each result into the array index." },
      { title: "Iterate with for", detail: "Loop through the array to display history." },
    ],
    hint_ladder: [
      "In C, array indices start at 0 and end at length - 1.",
      "Always check that index < capacity before writing to avoid buffer overflows.",
    ],
    tests: ["array_storage_and_iteration"],
  },
  {
    id: "c_structs",
    title: "Structs & Domain Data Modeling",
    stack: "C",
    difficulty: 2,
    minutes: 40,
    description: "Group related data fields into custom struct types to model real entities.",
    skills: ["structs", "data_modeling"],
    required_skills: ["variables", "functions", "arrays"],
    teaches: ["structs", "composite_types", "field_access"],
    prerequisites: ["c_arrays"],
    next_mission: "c_pointers",
    deliverable: "Define a Calculation record with timestamp, operation symbol, operands, and result.",
    steps: [
      { title: "Define struct", detail: "typedef struct { double a, b, result; char op; } Calculation;" },
      { title: "Create instance", detail: "Fill a Calculation instance with operation details." },
      { title: "Access fields", detail: "Pass struct or print fields with dot notation (calc.result)." },
    ],
    hint_ladder: [
      "A struct lets you bundle multiple related variables under one cohesive name.",
      "Access fields using dot notation: record.price = 100.5;",
    ],
    tests: ["struct_instantiated_and_accessed"],
  },
  {
    id: "c_pointers",
    title: "Pointers & Memory References",
    stack: "C",
    difficulty: 3,
    minutes: 45,
    description: "Understand memory addresses, pass-by-reference, and pointer manipulation.",
    skills: ["pointers", "memory_management"],
    required_skills: ["structs"],
    teaches: ["pointers", "dereferencing", "pass_by_reference", "arrow_operator"],
    prerequisites: ["c_structs"],
    next_mission: "c_files",
    deliverable: "Write a function that updates a Calculation struct in-place via pointer.",
    steps: [
      { title: "Pass pointer", detail: "void update_calc(Calculation *calc, double new_result);" },
      { title: "Use arrow operator", detail: "Modify fields via calc->result = new_result;" },
    ],
    hint_ladder: [
      "A pointer stores the memory address of another variable (*ptr points to value).",
      "When working with struct pointers, ptr->field is shorthand for (*ptr).field.",
    ],
    tests: ["pointer_mutation_in_place"],
  },
  {
    id: "c_files",
    title: "File Handling & Persistence",
    stack: "C",
    difficulty: 3,
    minutes: 45,
    description: "Read and write data to disk using fopen, fprintf, and fscanf so state survives restarts.",
    skills: ["file_handling", "persistence"],
    required_skills: ["pointers"],
    teaches: ["fopen", "fclose", "fprintf", "file_io_safety"],
    prerequisites: ["c_pointers"],
    next_mission: "market_data_simulator",
    deliverable: "Save calculation history to a CSV file and load it back on startup.",
    steps: [
      { title: "Open file safely", detail: "FILE *f = fopen(\"history.csv\", \"a\"); check if (f == NULL)." },
      { title: "Write records", detail: "fprintf(f, \"%lf,%c,%lf,%lf\\n\", a, op, b, res);" },
      { title: "Close file", detail: "Always call fclose(f) to flush and release handles." },
    ],
    hint_ladder: [
      "Always check if fopen returned NULL before reading or writing.",
      "Remember to fclose every file you open.",
    ],
    tests: ["file_saved_and_reloaded"],
  },
  {
    id: "market_data_simulator",
    title: "C Market Data Simulator",
    stack: "C",
    difficulty: 4,
    minutes: 90,
    description: "Build an in-memory limit order book and live market feed simulator in C.",
    skills: ["structs", "arrays", "functions", "pointers", "file_handling", "simulation"],
    required_skills: ["structs", "arrays", "functions", "pointers", "file_handling"],
    teaches: ["order_books", "market_simulation", "performance"],
    prerequisites: ["c_files"],
    deliverable: "An interactive order book tracking bids/asks with simulated trade execution.",
    steps: [
      { title: "Model OrderLevel", detail: "Define OrderLevel struct with price, quantity, and order count." },
      { title: "Implement Book", detail: "Maintain sorted arrays/lists of bids and asks." },
      { title: "Process Orders", detail: "Match incoming orders against opposite book levels." },
      { title: "Stream Feed", detail: "Log executed trades and update depth display." },
    ],
    hint_ladder: [
      "Break the simulator into: models, matching engine, and event loop.",
      "An order book matches the highest bid with the lowest ask when bid >= ask.",
    ],
    tests: ["order_book_insert_match_trade"],
  },
];

/**
 * Deterministically recommends the next challenge based on proven learner evidence.
 * If the learner has 0 demonstrated skills or is marked beginner, it ALWAYS returns
 * the foundational Hello World challenge.
 */
export function recommendNextChallenge(
  learner: {
    demonstratedSkills: string[];
    completedChallenges: string[];
    isBeginner?: boolean;
  },
  challenges: Challenge[] = C_FOUNDATIONAL_CHALLENGES
): Challenge {
  const completed = new Set(learner.completedChallenges.map((id) => id.toLowerCase()));
  const skills = new Set(learner.demonstratedSkills.map((s) => s.toLowerCase().trim()));

  // Emergency beginner fallback: if learner has no demonstrated skills or is beginner,
  // ensure the foundational challenge is presented first.
  if (learner.isBeginner || skills.size === 0) {
    const beginner = challenges.find((c) => c.difficulty === 0 && c.required_skills.length === 0);
    if (beginner && !completed.has(beginner.id.toLowerCase())) {
      return beginner;
    }
  }

  // Filter candidates where:
  // 1. Not already completed
  // 2. All required_skills are a subset of demonstrated skills
  const candidates = challenges.filter((c) => {
    if (completed.has(c.id.toLowerCase())) return false;
    const reqs = (c.required_skills || []).map((s) => s.toLowerCase().trim());
    return reqs.every((req) => skills.has(req));
  });

  if (candidates.length === 0) {
    // If no candidate is fully unlocked, pick the earliest uncompleted challenge
    const uncompleted = challenges.find((c) => !completed.has(c.id.toLowerCase()));
    return uncompleted ?? challenges[0];
  }

  // Sort by lowest difficulty, then estimated minutes
  return candidates.sort((a, b) => a.difficulty - b.difficulty || a.minutes - b.minutes)[0];
}

/**
 * Evaluates whether a challenge is currently unlocked given the learner's demonstrated skills.
 */
export function isChallengeUnlocked(
  challenge: Challenge | Mission,
  demonstratedSkills: string[],
  completedChallenges: string[] = []
): { unlocked: boolean; missingSkills: string[]; missingPrerequisites: string[] } {
  const skills = new Set(demonstratedSkills.map((s) => s.toLowerCase().trim()));
  const completed = new Set(completedChallenges.map((c) => c.toLowerCase().trim()));

  const reqSkills = (challenge.required_skills || []).map((s) => s.toLowerCase().trim());
  const missingSkills = reqSkills.filter((req) => !skills.has(req));

  const prereqs = (challenge.prerequisites || []).map((p) => p.toLowerCase().trim());
  const missingPrerequisites = prereqs.filter((p) => !completed.has(p));

  const unlocked = missingSkills.length === 0 && missingPrerequisites.length === 0;
  return { unlocked, missingSkills, missingPrerequisites };
}
