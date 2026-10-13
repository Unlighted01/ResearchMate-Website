// ============================================
// KNOWLEDGE DATASETS - Curated Subject Reference Libraries
// Provides verified formulas, constants, and grammar rules for STEM & Literature
// ============================================

export interface FormulaEntry {
  category: "math" | "science" | "literature";
  topic: string;
  name: string;
  formula: string;
  latex: string;
  explanation: string;
  variables: Record<string, string>;
}

export const STEM_FORMULAS: FormulaEntry[] = [
  // --- ALGEBRA & MATH ---
  {
    category: "math",
    topic: "Algebra",
    name: "Quadratic Formula",
    formula: "x = (-b ± sqrt(b^2 - 4ac)) / (2a)",
    latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
    explanation: "Finds the roots of any quadratic equation ax^2 + bx + c = 0.",
    variables: { a: "x^2 coefficient", b: "x coefficient", c: "constant term" },
  },
  {
    category: "math",
    topic: "Geometry",
    name: "Pythagorean Theorem",
    formula: "a^2 + b^2 = c^2",
    latex: "a^2 + b^2 = c^2",
    explanation: "Relates the three sides of a right triangle.",
    variables: { a: "leg 1", b: "leg 2", c: "hypotenuse" },
  },
  {
    category: "math",
    topic: "Geometry",
    name: "Area of a Circle",
    formula: "A = π * r^2",
    latex: "A = \\pi r^2",
    explanation: "Area of a circle given its radius.",
    variables: { r: "radius", A: "area" },
  },
  {
    category: "math",
    topic: "Statistics",
    name: "Arithmetic Mean",
    formula: "mean = sum(x) / n",
    latex: "\\bar{x} = \\frac{\\sum x_i}{n}",
    explanation: "Average value of a dataset.",
    variables: { n: "sample size", "x_i": "individual data points" },
  },
  {
    category: "math",
    topic: "Calculus",
    name: "Derivative Power Rule",
    formula: "d/dx(x^n) = n * x^(n-1)",
    latex: "\\frac{d}{dx}(x^n) = n x^{n-1}",
    explanation: "Derivative of a polynomial power term.",
    variables: { n: "exponent" },
  },

  // --- PHYSICS ---
  {
    category: "science",
    topic: "Kinematics",
    name: "Velocity-Time Equation",
    formula: "v = u + a * t",
    latex: "v = u + at",
    explanation: "Final velocity under uniform acceleration.",
    variables: { v: "final velocity (m/s)", u: "initial velocity (m/s)", a: "acceleration (m/s²)", t: "time (s)" },
  },
  {
    category: "science",
    topic: "Kinematics",
    name: "Displacement Equation",
    formula: "s = u*t + 0.5*a*t^2",
    latex: "s = ut + \\frac{1}{2}at^2",
    explanation: "Distance traveled under uniform acceleration.",
    variables: { s: "displacement (m)", u: "initial velocity", a: "acceleration", t: "time" },
  },
  {
    category: "science",
    topic: "Dynamics",
    name: "Newton's Second Law",
    formula: "F = m * a",
    latex: "F = ma",
    explanation: "Net force acting on an object equals mass times acceleration.",
    variables: { F: "Force (N)", m: "mass (kg)", a: "acceleration (m/s²)" },
  },
  {
    category: "science",
    topic: "Electricity",
    name: "Ohm's Law",
    formula: "V = I * R",
    latex: "V = IR",
    explanation: "Relationship between voltage, current, and electrical resistance.",
    variables: { V: "Voltage (V)", I: "Current (A)", R: "Resistance (Ω)" },
  },
  {
    category: "science",
    topic: "Energy",
    name: "Kinetic Energy",
    formula: "KE = 0.5 * m * v^2",
    latex: "KE = \\frac{1}{2}mv^2",
    explanation: "Energy possessed by an object due to motion.",
    variables: { KE: "Kinetic Energy (J)", m: "mass (kg)", v: "velocity (m/s)" },
  },

  // --- CHEMISTRY ---
  {
    category: "science",
    topic: "Chemistry",
    name: "Ideal Gas Law",
    formula: "P * V = n * R * T",
    latex: "PV = nRT",
    explanation: "Equation of state of a hypothetical ideal gas.",
    variables: { P: "pressure (atm or Pa)", V: "volume (L or m³)", n: "moles", R: "gas constant (0.0821 L·atm/mol·K)", T: "temperature (K)" },
  },
  {
    category: "science",
    topic: "Chemistry",
    name: "Molarity",
    formula: "M = moles_solute / liters_solution",
    latex: "M = \\frac{n_{\\text{solute}}}{V_{\\text{solution}}}",
    explanation: "Concentration measure in moles per liter.",
    variables: { M: "molarity (mol/L)", n: "moles of solute", V: "liters of solution" },
  },
];

export const PHYSICAL_CONSTANTS = {
  g: { name: "Acceleration due to gravity (Earth)", value: "9.80665 m/s²", symbol: "g" },
  c: { name: "Speed of light in vacuum", value: "2.99792 × 10⁸ m/s", symbol: "c" },
  G: { name: "Gravitational constant", value: "6.67430 × 10⁻¹¹ N·m²/kg²", symbol: "G" },
  h: { name: "Planck constant", value: "6.62607 × 10⁻³⁴ J·s", symbol: "h" },
  R: { name: "Universal gas constant", value: "8.31446 J/(mol·K)", symbol: "R" },
  e: { name: "Elementary charge", value: "1.60218 × 10⁻¹⁹ C", symbol: "e" },
};

export const GRAMMAR_LITERATURE_GUIDE = {
  rules: [
    {
      title: "Subject-Verb Agreement",
      guideline: "Singular subjects require singular verbs (with 's' in present tense); plural subjects require plural verbs.",
      exampleBad: "The collection of problems were difficult.",
      exampleGood: "The collection of problems was difficult. (Subject is 'collection', singular)",
    },
    {
      title: "Tense Consistency",
      guideline: "Maintain consistent verb tense across related clauses unless describing an intentional shift in timeframe.",
      exampleBad: "She conducts the experiment and analyzed the findings.",
      exampleGood: "She conducted the experiment and analyzed the findings. (Consistent past tense)",
    },
    {
      title: "Active vs. Passive Voice",
      guideline: "Prefer active voice for direct, energetic scholarly prose. Use passive only when the agent is unknown or the recipient is the primary focus.",
      exampleBad: "The math solution was derived by the student.",
      exampleGood: "The student derived the math solution. (Direct active voice)",
    },
  ],
  literaryDevices: [
    { name: "Metaphor", description: "Direct comparison between two unrelated things without 'like' or 'as'." },
    { name: "Simile", description: "Comparison between two distinct things using 'like' or 'as'." },
    { name: "Irony", description: "Contradiction between expectation and reality (dramatic, situational, or verbal)." },
    { name: "Personification", description: "Attribution of human characteristics to non-human things." },
    { name: "Hyperbole", description: "Intentional extreme exaggeration for emphasis or rhetorical effect." },
  ],
};

/**
 * Searches curated formulas and constants for any matching concepts in a prompt.
 */
export function findRelevantKnowledge(query: string): string[] {
  const lower = query.toLowerCase();
  const results: string[] = [];

  for (const f of STEM_FORMULAS) {
    if (
      lower.includes(f.name.toLowerCase()) ||
      lower.includes(f.topic.toLowerCase()) ||
      f.formula.toLowerCase().split(/[\s\+\-\*\/=]+/).some(token => token.length > 2 && lower.includes(token))
    ) {
      results.push(`📌 **${f.name}** (${f.topic}): $${f.latex}$ — ${f.explanation}`);
    }
  }

  // Check for constants
  for (const [key, constant] of Object.entries(PHYSICAL_CONSTANTS)) {
    if (lower.includes(constant.name.toLowerCase()) || lower.includes(`constant ${key}`)) {
      results.push(`📐 Constant **${constant.name}** ($${constant.symbol}$): ${constant.value}`);
    }
  }

  return results.slice(0, 3);
}
