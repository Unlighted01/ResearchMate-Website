// ============================================
// PARAMETRIC TWIN PROBLEM SYNTHESIZER
// Generates mathematically verified twin questions and distractors locally.
// 0ms Latency · $0 API Cost · 100% Deterministic Arithmetic
// ============================================

import { ExamQuestion, generateUUID } from "./examService";

export type TemplateType =
  | "work_rate"
  | "harmonic_speed"
  | "successive_discount"
  | "ratio_partition"
  | "number_series"
  | "syllogism";

interface ProblemTemplate {
  type: TemplateType;
  matcher: RegExp;
  generate: () => ExamQuestion;
}

// Helper: Shuffles choices while tracking the new correct index
function createShuffledQuestion(
  stem: string,
  correctChoice: string,
  distractors: string[],
  explanation: string,
  topicTag: string = "Numerical Reasoning"
): ExamQuestion {
  // Ensure exactly 3 unique distractors that don't match the correct choice
  const uniqueDistractors = Array.from(
    new Set(distractors.filter((d) => d.trim() !== correctChoice.trim()))
  ).slice(0, 3);

  while (uniqueDistractors.length < 3) {
    uniqueDistractors.push(`Option ${uniqueDistractors.length + 1}`);
  }

  const allChoices = [correctChoice, ...uniqueDistractors];

  // Fisher-Yates shuffle
  const indexed = allChoices.map((choice, i) => ({ choice, isCorrect: i === 0 }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }

  const correctIndex = indexed.findIndex((item) => item.isCorrect);

  return {
    question: stem,
    options: indexed.map((item) => item.choice),
    correctAnswer: correctChoice,
    explanation,
    topic: topicTag,
  };
}

// 1. WORK & PIPE RATES: T = (A * B) / (A + B)
export function generateWorkRateTwin(): ExamQuestion {
  const PAIRS = [
    { a: 3, b: 6, ans: 2, names: ["Pipe A", "Pipe B", "pool"] },
    { a: 4, b: 12, ans: 3, names: ["Inlet 1", "Inlet 2", "cistern"] },
    { a: 6, b: 12, ans: 4, names: ["Pump X", "Pump Y", "reservoir"] },
    { a: 5, b: 20, ans: 4, names: ["Machine A", "Machine B", "batch"] },
    { a: 10, b: 15, ans: 6, names: ["Pipe Alpha", "Pipe Beta", "tank"] },
    { a: 8, b: 24, ans: 6, names: ["Worker A", "Worker B", "project"] },
    { a: 12, b: 24, ans: 8, names: ["Inlet A", "Inlet B", "storage tank"] },
  ];

  const pick = PAIRS[Math.floor(Math.random() * PAIRS.length)];
  const [sourceA, sourceB, target] = pick.names;
  const unit = target === "project" || target === "batch" ? "days" : "hours";

  const stem = `${sourceA} can complete/fill the ${target} in ${pick.a} ${unit}, while ${sourceB} takes ${pick.b} ${unit}. If both work simultaneously, how many ${unit} will it take?`;
  const correct = `${pick.ans} ${unit}`;
  const trapArithmeticAvg = `${(pick.a + pick.b) / 2} ${unit}`;
  const trapSum = `${pick.a + pick.b} ${unit}`;
  const trapMinus = `${Math.abs(pick.b - pick.a)} ${unit}`;

  const explanation = `⚡ 30-Second Shortcut: T = (A × B) / (A + B) = (${pick.a} × ${pick.b}) / (${pick.a} + ${pick.b}) = ${pick.a * pick.b} / ${pick.a + pick.b} = ${pick.ans} ${unit}. Trap alert: Never take the simple average (${trapArithmeticAvg})!`;

  return createShuffledQuestion(
    stem,
    correct,
    [trapArithmeticAvg, trapSum, trapMinus],
    explanation,
    "Numerical Reasoning"
  );
}

// 2. HARMONIC SPEED: V_avg = 2 * v1 * v2 / (v1 + v2)
export function generateHarmonicSpeedTwin(): ExamQuestion {
  const PAIRS = [
    { v1: 30, v2: 60, ans: 40, trip: "from City A to City B" },
    { v1: 40, v2: 60, ans: 48, trip: "from Manila to Laguna" },
    { v1: 45, v2: 90, ans: 60, trip: "to the province" },
    { v1: 20, v2: 30, ans: 24, trip: "from campus to the library" },
    { v1: 60, v2: 90, ans: 72, trip: "between two ports" },
  ];

  const pick = PAIRS[Math.floor(Math.random() * PAIRS.length)];
  const stem = `A commuter drives ${pick.trip} at ${pick.v1} km/h and returns along the exact same route at ${pick.v2} km/h. What is the average speed for the entire round trip?`;
  const correct = `${pick.ans} km/h`;
  const trapArithmeticAvg = `${(pick.v1 + pick.v2) / 2} km/h`;
  const trapDiff = `${Math.abs(pick.v2 - pick.v1)} km/h`;
  const trapOffByOne = `${pick.ans + 4} km/h`;

  const explanation = `⚡ 30-Second Shortcut: Average round-trip speed is the Harmonic Mean: V = (2 × v₁ × v₂) / (v₁ + v₂) = (2 × ${pick.v1} × ${pick.v2}) / (${pick.v1} + ${pick.v2}) = ${2 * pick.v1 * pick.v2} / ${pick.v1 + pick.v2} = ${pick.ans} km/h. Trap alert: Never average speeds linearly (${trapArithmeticAvg}) because more time is spent at the slower speed!`;

  return createShuffledQuestion(
    stem,
    correct,
    [trapArithmeticAvg, trapDiff, trapOffByOne],
    explanation,
    "Numerical Reasoning"
  );
}

// 3. SUCCESSIVE DISCOUNTS: D = A + B - (A * B / 100)
export function generateSuccessiveDiscountTwin(): ExamQuestion {
  const PAIRS = [
    { a: 20, b: 10, ans: 28, item: "scientific calculator" },
    { a: 30, b: 20, ans: 44, item: "laptop workstation" },
    { a: 25, b: 20, ans: 40, item: "medical textbook" },
    { a: 50, b: 20, ans: 60, item: "laboratory microscope" },
    { a: 40, b: 10, ans: 46, item: "reference handbook" },
  ];

  const pick = PAIRS[Math.floor(Math.random() * PAIRS.length)];
  const stem = `A bookstore offers successive discounts of ${pick.a}% and ${pick.b}% on a ${pick.item}. What single equivalent percentage discount is this equal to?`;
  const correct = `${pick.ans}%`;
  const trapSum = `${pick.a + pick.b}%`;
  const trapProduct = `${(pick.a * pick.b) / 10}%`;
  const trapOff = `${pick.ans - 3}%`;

  const explanation = `⚡ 30-Second Shortcut: Successive Discount Formula: Equivalent = A + B - (A × B / 100) = ${pick.a} + ${pick.b} - (${pick.a} × ${pick.b} / 100) = ${pick.a + pick.b} - ${(pick.a * pick.b) / 100} = ${pick.ans}%. Trap alert: Never simply add percentages (${trapSum})!`;

  return createShuffledQuestion(
    stem,
    correct,
    [trapSum, trapProduct, trapOff],
    explanation,
    "Numerical Reasoning"
  );
}

// 4. RATIO & PARTITIONS
export function generateRatioTwin(): ExamQuestion {
  const SETS = [
    { r1: 3, r2: 5, mult: 40, total: 320, name1: "Ana", name2: "Bea" },
    { r1: 2, r2: 3, mult: 50, total: 250, name1: "Team Alpha", name2: "Team Beta" },
    { r1: 4, r2: 7, mult: 20, total: 220, name1: "Project A", name2: "Project B" },
    { r1: 5, r2: 6, mult: 15, total: 165, name1: "Department X", name2: "Department Y" },
  ];

  const pick = SETS[Math.floor(Math.random() * SETS.length)];
  const share1 = pick.r1 * pick.mult;
  const share2 = pick.r2 * pick.mult;

  const stem = `An endowment of \$${pick.total} is divided between ${pick.name1} and ${pick.name2} in the ratio of ${pick.r1} : ${pick.r2}. How much does ${pick.name2} receive?`;
  const correct = `\$${share2}`;
  const trapShare1 = `\$${share1}`;
  const trapDiff = `\$${share2 - share1}`;
  const trapHalf = `\$${Math.round(pick.total / 2)}`;

  const explanation = `⚡ 30-Second Shortcut: Total parts = ${pick.r1} + ${pick.r2} = ${pick.r1 + pick.r2}. Value per part = \$${pick.total} / ${pick.r1 + pick.r2} = \$${pick.mult}. ${pick.name2}'s share = ${pick.r2} × \$${pick.mult} = \$${share2}.`;

  return createShuffledQuestion(
    stem,
    correct,
    [trapShare1, trapDiff, trapHalf],
    explanation,
    "Numerical Reasoning"
  );
}

// 5. NUMBER SERIES: a_n = a_{n-1} * 2 + 1 or similar
export function generateNumberSeriesTwin(): ExamQuestion {
  const SERIES = [
    { seq: [3, 7, 15, 31], next: 63, rule: "× 2 + 1", desc: "each number is double the previous plus 1" },
    { seq: [2, 6, 18, 54], next: 162, rule: "× 3", desc: "geometric progression with ratio 3" },
    { seq: [4, 9, 16, 25], next: 36, rule: "squares", desc: "consecutive perfect squares (2², 3², 4², 5², 6²)" },
    { seq: [5, 11, 23, 47], next: 95, rule: "× 2 + 1", desc: "each number is double the previous plus 1" },
  ];

  const pick = SERIES[Math.floor(Math.random() * SERIES.length)];
  const stem = `Find the next number in the sequence: ${pick.seq.join(", ")}, ___ ?`;
  const correct = `${pick.next}`;
  const trapClose = `${pick.next - 2}`;
  const trapAdd = `${pick.seq[pick.seq.length - 1] + (pick.seq[pick.seq.length - 1] - pick.seq[pick.seq.length - 2])}`;
  const trapFar = `${pick.next + 4}`;

  const explanation = `⚡ Pattern Recognition: The rule is ${pick.rule} (${pick.desc}). Next term = ${pick.next}.`;

  return createShuffledQuestion(
    stem,
    correct,
    [trapClose, trapAdd, trapFar],
    explanation,
    "Analytical Reasoning"
  );
}

// 6. SYLLOGISMS & SET LOGIC
export function generateSyllogismTwin(): ExamQuestion {
  const SYLLOGISMS = [
    {
      p1: "All biologists are scientists.",
      p2: "All scientists are researchers.",
      valid: "All biologists are researchers.",
      invalids: [
        "All researchers are biologists.",
        "No biologists are researchers.",
        "Some scientists are not researchers.",
      ],
      expl: "Universal Affirmative Transit: If A ⊆ B and B ⊆ C, then A ⊆ C.",
    },
    {
      p1: "All squares are rectangles.",
      p2: "All rectangles are quadrilaterals.",
      valid: "All squares are quadrilaterals.",
      invalids: [
        "All quadrilaterals are squares.",
        "No squares are quadrilaterals.",
        "Some rectangles are not quadrilaterals.",
      ],
      expl: "Set Inclusion: Squares ⊆ Rectangles ⊆ Quadrilaterals.",
    },
    {
      p1: "No reptiles have feathers.",
      p2: "All snakes are reptiles.",
      valid: "No snakes have feathers.",
      invalids: [
        "Some snakes have feathers.",
        "All reptiles are snakes.",
        "Feathers are only found on reptiles.",
      ],
      expl: "Universal Negative Deduction: If Set A has no B, and C is in A, C has no B.",
    },
  ];

  const pick = SYLLOGISMS[Math.floor(Math.random() * SYLLOGISMS.length)];
  const stem = `Given the premises:\n1. ${pick.p1}\n2. ${pick.p2}\nWhich of the following must logically follow?`;

  return createShuffledQuestion(
    stem,
    pick.valid,
    pick.invalids,
    `⚡ Logical Law: ${pick.expl}`,
    "Analytical Reasoning"
  );
}

// Master Template Registry
const TEMPLATE_REGISTRY: ProblemTemplate[] = [
  {
    type: "work_rate",
    matcher: /(?:pipe|inlet|reservoir|pump|worker|simultaneously|takes?\s+\d+\s+hours?|fill|empty)/i,
    generate: generateWorkRateTwin,
  },
  {
    type: "harmonic_speed",
    matcher: /(?:km\/h|mph|average speed|round trip|drives?\s+at|travels?\s+at|returns along)/i,
    generate: generateHarmonicSpeedTwin,
  },
  {
    type: "successive_discount",
    matcher: /(?:successive discounts?|equivalent discount|single discount|bookstore offers)/i,
    generate: generateSuccessiveDiscountTwin,
  },
  {
    type: "ratio_partition",
    matcher: /(?:ratio of \d+\s*:\s*\d+|divided between|endowment|share)/i,
    generate: generateRatioTwin,
  },
  {
    type: "number_series",
    matcher: /(?:next number in the sequence|sequence:\s*[\d\s,]+|find the next)/i,
    generate: generateNumberSeriesTwin,
  },
  {
    type: "syllogism",
    matcher: /(?:all \w+ are \w+|no \w+ are \w+|premises?:|logically follow)/i,
    generate: generateSyllogismTwin,
  },
];

/**
 * Detects the mathematical template of a question and generates an algorithmic twin in 0ms.
 * Returns null if no template matches.
 */
export function generateParametricTwin(question: {
  question: string;
  explanation?: string;
  category?: string;
}): ExamQuestion | null {
  const text = `${question.question || ""} ${question.explanation || ""} ${question.category || ""}`;

  for (const t of TEMPLATE_REGISTRY) {
    if (t.matcher.test(text)) {
      return t.generate();
    }
  }

  return null;
}

/**
 * Produces wrong-path distractors reflecting common student calculation errors
 * for templated math questions (work rates, harmonic speeds, discounts, ratios, series).
 */
export function generateWrongPathDistractorsForMath(
  stem: string,
  correctAnswer: string,
  templateType?: TemplateType
): string[] {
  // Extract unit from correct answer if present
  const unitMatch = correctAnswer.match(/^(?:[\$€£₱])?\s*([\d,.]+)\s*(%|[a-zA-Z\/]+)?$/);
  const numVal = unitMatch ? parseFloat(unitMatch[1].replace(/,/g, "")) : NaN;
  const unitSuffix = unitMatch && unitMatch[2] ? ` ${unitMatch[2]}` : "";
  const prefix = correctAnswer.trim().startsWith("$") ? "$" : "";

  // 1. Identify template type if not provided
  let matchedType = templateType;
  if (!matchedType) {
    for (const t of TEMPLATE_REGISTRY) {
      if (t.matcher.test(stem)) {
        matchedType = t.type;
        break;
      }
    }
  }

  // 2. Extract numbers from stem
  const stemNums = (stem.match(/\b\d+(?:\.\d+)?\b/g) || []).map(Number);

  const traps: string[] = [];

  if (matchedType === "work_rate" && stemNums.length >= 2) {
    const a = stemNums[0];
    const b = stemNums[1];
    traps.push(`${prefix}${(a + b) / 2}${unitSuffix}`); // Trap 1: simple average
    traps.push(`${prefix}${a + b}${unitSuffix}`); // Trap 2: simple sum
    traps.push(`${prefix}${Math.abs(b - a)}${unitSuffix}`); // Trap 3: simple difference
  } else if (matchedType === "harmonic_speed" && stemNums.length >= 2) {
    const v1 = stemNums[0];
    const v2 = stemNums[1];
    traps.push(`${prefix}${(v1 + v2) / 2}${unitSuffix}`); // Trap 1: linear average
    traps.push(`${prefix}${Math.abs(v2 - v1)}${unitSuffix}`); // Trap 2: difference
    traps.push(`${prefix}${Math.round(2 * v1 * v2 / (v1 + v2)) + 4}${unitSuffix}`); // Trap 3: near miss
  } else if (matchedType === "successive_discount" && stemNums.length >= 2) {
    const a = stemNums[0];
    const b = stemNums[1];
    traps.push(`${prefix}${a + b}%`); // Trap 1: linear addition
    traps.push(`${prefix}${Math.round((a * b) / 10)}%`); // Trap 2: multiplication error
    if (!isNaN(numVal)) traps.push(`${prefix}${Math.max(1, numVal - 3)}%`); // Trap 3: offset
  } else if (matchedType === "ratio_partition" && !isNaN(numVal)) {
    traps.push(`${prefix}${Math.round(numVal * 0.6)}${unitSuffix}`); // Trap 1: other share
    traps.push(`${prefix}${Math.round(numVal * 1.5)}${unitSuffix}`); // Trap 2: total parts mismatch
    traps.push(`${prefix}${Math.round(numVal * 0.5)}${unitSuffix}`); // Trap 3: 50% split
  } else if (!isNaN(numVal) && numVal > 0) {
    // General numeric wrong-path generator (percentage shift, off-by-magnitude, swapped operations)
    traps.push(`${prefix}${Math.round(numVal * 1.25 * 100) / 100}${unitSuffix}`);
    traps.push(`${prefix}${Math.round(numVal * 0.75 * 100) / 100}${unitSuffix}`);
    traps.push(`${prefix}${Math.round(numVal * 2 * 100) / 100}${unitSuffix}`);
  }

  // Filter out any that equal correct answer and deduplicate
  const cleanCorrect = correctAnswer.trim().toLowerCase();
  const valid = Array.from(new Set(traps.filter((t) => t.trim().toLowerCase() !== cleanCorrect)));

  while (valid.length < 3 && !isNaN(numVal)) {
    const fallback = `${prefix}${Math.round((numVal + valid.length + 2) * 10) / 10}${unitSuffix}`;
    if (!valid.includes(fallback)) valid.push(fallback);
  }

  return valid.slice(0, 3);
}
