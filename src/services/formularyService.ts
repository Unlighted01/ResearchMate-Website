// ============================================
// FORMULARY SERVICE - Universal Academic Micro-Datasets
// ============================================
// Provides lightweight, authoritative formula and law references (<15KB)
// for Grade 11 to College 2nd-Year Core (STEM, CS, General Ed)
// ============================================

export interface FormularyEntry {
  category: "discrete_math" | "calculus_ode" | "physics_chem" | "english_verbal";
  keywords: string[];
  rules: string[];
}

export const ACADEMIC_FORMULARY: FormularyEntry[] = [
  // -------------------------------------------------------------
  // 1. DISCRETE MATHEMATICS & SYMBOLIC LOGIC
  // -------------------------------------------------------------
  {
    category: "discrete_math",
    keywords: ["truth table", "tautology", "contradiction", "contingency", "proposition", "logic", "modus ponens", "modus tollens"],
    rules: [
      "Truth Value Conventions: True = T (or 1), False = F (or 0).",
      "Conjunction (P ∧ Q): True only if both P and Q are True.",
      "Disjunction (P ∨ Q): False only if both P and Q are False.",
      "Implication (P → Q): False ONLY when P is True and Q is False. Equivalent to ¬P ∨ Q.",
      "Biconditional (P ↔ Q): True when P and Q have identical truth values. Equivalent to (P → Q) ∧ (Q → P).",
      "Exclusive OR (P ⊕ Q): True when exactly one of P, Q is True.",
      "Tautology = Always True for all assignments; Contradiction = Always False; Contingency = Mixed T and F.",
    ],
  },
  {
    category: "discrete_math",
    keywords: ["de morgan", "contrapositive", "converse", "inverse", "equivalence law", "absorption", "distributive"],
    rules: [
      "De Morgan's Laws (Logic): ¬(P ∧ Q) ≡ ¬P ∨ ¬Q; ¬(P ∨ Q) ≡ ¬P ∧ ¬Q.",
      "Conditional Equivalence: P → Q ≡ ¬P ∨ Q ≡ ¬Q → ¬P (Contrapositive).",
      "Converse of P → Q is Q → P (NOT logically equivalent to original conditional).",
      "Inverse of P → Q is ¬P → ¬Q (equivalent to Converse, NOT original conditional).",
      "Distributive Laws: P ∧ (Q ∨ R) ≡ (P ∧ Q) ∨ (P ∧ R); P ∨ (Q ∧ R) ≡ (P ∨ Q) ∧ (P ∨ R).",
      "Double Negation: ¬(¬P) ≡ P. Idempotent: P ∧ P ≡ P, P ∨ P ≡ P.",
    ],
  },
  {
    category: "discrete_math",
    keywords: ["set", "subset", "union", "intersection", "power set", "cartesian product", "cardinality"],
    rules: [
      "Union (A ∪ B) = {x | x ∈ A ∨ x ∈ B}; Intersection (A ∩ B) = {x | x ∈ A ∧ x ∈ B}.",
      "Set Difference (A \\ B or A - B) = {x | x ∈ A ∧ x ∉ B} = A ∩ B^c.",
      "Power Set P(S): If |S| = n, then |P(S)| = 2^n elements.",
      "Cartesian Product |A × B| = |A| × |B|.",
      "De Morgan's (Sets): (A ∪ B)^c = A^c ∩ B^c; (A ∩ B)^c = A^c ∪ B^c.",
    ],
  },
  {
    category: "discrete_math",
    keywords: ["induction", "mathematical induction", "base case", "inductive step"],
    rules: [
      "Principle of Mathematical Induction: 1) Base Case: Prove P(n_0) holds (usually n=0 or 1). 2) Inductive Hypothesis: Assume P(k) holds for arbitrary integer k ≥ n_0. 3) Inductive Step: Prove P(k+1) must follow logically from P(k). Conclude P(n) holds for all n ≥ n_0.",
    ],
  },

  // -------------------------------------------------------------
  // 2. CALCULUS 1, 2, 3 & DIFFERENTIAL EQUATIONS (ODEs)
  // -------------------------------------------------------------
  {
    category: "calculus_ode",
    keywords: ["derivative", "differentiation", "chain rule", "product rule", "quotient rule", "power rule"],
    rules: [
      "Power Rule: d/dx(x^n) = n x^(n-1).",
      "Product Rule: d/dx(u · v) = u'v + uv'.",
      "Quotient Rule: d/dx(u/v) = (u'v - uv') / v^2.",
      "Chain Rule: d/dx[f(g(x))] = f'(g(x)) · g'(x).",
      "Trig Derivatives: d/dx(sin x) = cos x, d/dx(cos x) = -sin x, d/dx(tan x) = sec^2 x, d/dx(sec x) = sec x tan x.",
      "Exponentials & Logs: d/dx(e^(kx)) = k e^(kx), d/dx(ln x) = 1/x for x > 0.",
    ],
  },
  {
    category: "calculus_ode",
    keywords: ["integral", "integration", "antiderivative", "by parts", "u-substitution", "trig substitution"],
    rules: [
      "Integration by Parts: ∫ u dv = u v - ∫ v du. (Selection heuristic: LIATE = Log, Inverse trig, Algebraic, Trig, Exponential).",
      "Power Rule for Integrals: ∫ x^n dx = (x^(n+1))/(n+1) + C (for n ≠ -1); ∫ (1/x) dx = ln|x| + C.",
      "Common Trig Integrals: ∫ sin x dx = -cos x + C; ∫ cos x dx = sin x + C; ∫ sec^2 x dx = tan x + C.",
      "Trig Substitutions: For √(a^2 - x^2) let x = a sin θ; for √(a^2 + x^2) let x = a tan θ; for √(x^2 - a^2) let x = a sec θ.",
    ],
  },
  {
    category: "calculus_ode",
    keywords: ["differential equation", "ode", "integrating factor", "separable", "first order linear", "exact"],
    rules: [
      "1st-Order Linear ODE: dy/dx + P(x)y = Q(x). Integrating Factor I(x) = exp(∫ P(x) dx). General Solution: y · I(x) = ∫ [Q(x) · I(x)] dx + C.",
      "Separable ODE: dy/dx = g(x)h(y) ⟹ (1/h(y)) dy = g(x) dx ⟹ Integrate both sides.",
      "2nd-Order Linear Homogeneous: ay'' + by' + cy = 0 with characteristic ar^2 + br + c = 0. Distinct real roots r1, r2: y = c1 e^(r1 x) + c2 e^(r2 x); Repeated root r: y = (c1 + c2 x)e^(rx); Complex roots α ± βi: y = e^(α x)[c1 cos(β x) + c2 sin(β x)].",
      "Standard Laplace Transforms: L{1} = 1/s; L{t^n} = n! / s^(n+1); L{e^(at)} = 1/(s - a); L{sin(ωt)} = ω/(s^2 + ω^2); L{cos(ωt)} = s/(s^2 + ω^2).",
    ],
  },

  // -------------------------------------------------------------
  // 3. GENERAL PHYSICS & CHEMISTRY (SI UNITS & GOVERNING LAWS)
  // -------------------------------------------------------------
  {
    category: "physics_chem",
    keywords: ["kinematics", "velocity", "acceleration", "projectile", "free fall", "newton"],
    rules: [
      "Standard Earth Gravity: g = 9.81 m/s^2 (downward). Wrap all physical units upright in KaTeX (e.g., 9.81\\text{ m/s}^2).",
      "Kinematic Equations (Constant a): 1) v = v_0 + at; 2) x = v_0 t + (1/2)at^2; 3) v^2 = v_0^2 + 2aΔx; 4) Δx = ((v_0 + v)/2)t.",
      "Newton's 2nd Law: ΣF = m a (Force in Newtons, N = kg·m/s^2). Friction: f_k = μ_k N.",
      "Work-Energy Theorem: W_net = ΔK = (1/2)m v_f^2 - (1/2)m v_i^2. Gravitational Potential Energy: U_g = m g h.",
    ],
  },
  {
    category: "physics_chem",
    keywords: ["fluid", "pressure", "hydrostatic", "bernoulli", "density", "buoyancy", "archimedes"],
    rules: [
      "Density of Water: ρ_water = 1000 kg/m^3; Specific weight of water: γ_water = 9.81 kN/m^3 (9810 N/m^3).",
      "Hydrostatic Pressure: P = P_0 + ρ g h = P_0 + γ h.",
      "Archimedes Principle (Buoyant Force): F_b = ρ_fluid · V_displaced · g.",
      "Continuity Equation: A_1 v_1 = A_2 v_2 (incompressible flow, Q in m^3/s).",
      "Bernoulli's Equation: P_1 + (1/2)ρ v_1^2 + ρ g z_1 = P_2 + (1/2)ρ v_2^2 + ρ g z_2.",
    ],
  },
  {
    category: "physics_chem",
    keywords: ["chemistry", "stoichiometry", "mole", "ideal gas", "molarity", "ph", "equilibrium"],
    rules: [
      "Avogadro's Number: N_A = 6.022 × 10^23 particles/mol. Universal Gas Constant: R = 8.314 J/(mol·K) = 0.08206 L·atm/(mol·K).",
      "Ideal Gas Law: P V = n R T (T must be in Kelvin: T(K) = T(°C) + 273.15).",
      "Molarity: M = moles of solute / liters of solution (mol/L).",
      "pH Definition: pH = -log10[H^+]; pOH = -log10[OH^-]; pH + pOH = 14.00 (at 25°C).",
    ],
  },

  // -------------------------------------------------------------
  // 4. ENGLISH GRAMMAR, LOGIC & VERBAL CORE
  // -------------------------------------------------------------
  {
    category: "english_verbal",
    keywords: ["grammar", "error recognition", "subject verb", "parallelism", "modifier", "pronoun"],
    rules: [
      "Subject-Verb Agreement: Neither/Nor & Either/Or take verb agreeing with the CLOSER subject (e.g., 'Neither the teacher nor the students were present').",
      "Indefinite Pronouns: Everyone, everybody, someone, nobody, each, either, neither are grammatically SINGULAR.",
      "Parallel Structure: Items in a series or comparison must share grammatical form (e.g., 'She likes swimming, running, and cycling', NOT 'to cycle').",
      "Dangling Modifier Trap: A modifier must immediately precede or follow the noun it actually modifies.",
    ],
  },
  {
    category: "english_verbal",
    keywords: ["filipino", "balarila", "ng at nang", "may at mayroon", "din at rin", "pinto at pintuan"],
    rules: [
      "Gamit ng 'Nang': 1) Panghalili sa 'noong' (Nang dumating siya); 2) Panghalili sa 'upang/para' (Mag-aral ka nang makapasa); 3) Paraan o paano ginawa ang kilos (Tumakbo nang mabilis); 4) Pag-uulit ng pandiwa (Iyak nang iyak).",
      "Gamit ng 'Ng': 1) Pantukoy sa layon ng pandiwa (Kumain siya ng mangga); 2) Pagmamay-ari (Aklat ng guro).",
      "Gamit ng 'May' vs 'Mayroon': 'May' ang gamit kung sinusundan ng pangngalan, pandiwa, o pang-uri (May pera, May darating). 'Mayroon' kung sinusundan ng kataga (Mayroon ba?), panghalip (Mayroon kaming...), o panagot sa tanong.",
      "Gamit ng 'Din/Daw' vs 'Rin/Raw': 'Rin/Raw' kung ang sinusundang salita ay nagtatapos sa patinig (a, e, i, o, u) o malapatinig (w, y). 'Din/Daw' kung nagtatapos sa katinig.",
    ],
  },
];

export type AcademicDomain = "math" | "science" | "verbal" | "general";

/**
 * Infers the high-level academic domain of a document based on its title and text sample.
 */
export function inferDocumentDomain(title: string = "", sampleText: string = ""): AcademicDomain {
  const combined = `${title} ${sampleText}`.toLowerCase();

  const hasMath = /\b(math|algebra|calculus|geometry|trigonometry|differential|integral|derivative|arithmetic|discrete|equation|numbers?|fractions?|decimals?|percents?|matrix|linear)\b/i.test(combined);
  const hasScience = /\b(physics|chemistry|biology|kinematics|fluid|thermodynamics|stoichiometry|gas law|molarity|velocity|acceleration)\b/i.test(combined);
  const hasVerbal = /\b(english|grammar|literature|balarila|filipino|reading comprehension|vocabulary|sentence|paragraph|essay|rhetoric|syntax|clause)\b/i.test(combined);

  if (hasMath && !hasVerbal) return "math";
  if (hasVerbal && !hasMath) return "verbal";
  if (hasScience && !hasVerbal) return "science";
  return "general";
}

/**
 * Searches and returns relevant authoritative formula rules based on user question or document terms.
 * Supports domain filtering to prevent cross-subject contamination (e.g., injecting grammar into math documents).
 */
export function findRelevantFormulary(query: string, domainFilter?: AcademicDomain): string[] {
  if (!query || typeof query !== "string") return [];
  const lower = query.toLowerCase();

  const matchedRules: string[] = [];

  for (const entry of ACADEMIC_FORMULARY) {
    // Prevent cross-domain leakage when inside a domain-specific document
    if (domainFilter === "math" && entry.category === "english_verbal") continue;
    if (domainFilter === "verbal" && entry.category !== "english_verbal") continue;
    if (domainFilter === "science" && entry.category === "english_verbal") continue;

    const isMatched = entry.keywords.some((kw) => lower.includes(kw));
    if (isMatched) {
      matchedRules.push(...entry.rules);
    }
  }

  // Deduplicate and cap to 10 most relevant rules to prevent token bloat
  const uniqueRules = Array.from(new Set(matchedRules));
  return uniqueRules.slice(0, 10);
}
