// ============================================
// MATH SOLVER ENGINE - Deterministic Heavy-Lifting Math & Unit Solver
// Powered by Math.js (Exact Arithmetic, Algebra, SI Units, and Fractions)
// Conserves 100% AI API Credits for Pure Computations & Calculations
// ============================================

import { create, all } from "mathjs";

// Initialize math instance with fraction/number support
const math = create(all, {
  number: "number",
  precision: 64,
});

export interface MathSolveResult {
  success: boolean;
  query: string;
  expression: string;
  numericResult?: string;
  fractionResult?: string;
  latex?: string;
  unit?: string;
  steps: string[];
  explanationMarkdown: string;
}

/**
 * Checks if a query is a direct calculation, conversion, or arithmetic problem.
 */
export function isPureMathCalculation(query: string): boolean {
  if (!query) return false;
  const trimmed = query.trim().toLowerCase();

  // Strip prefix words like "what is", "calculate", "evaluate", "solve"
  const stripped = trimmed
    .replace(/^(?:what\s+is|calculate|evaluate|solve|compute|find)\s+/i, "")
    .replace(/[?=]+$/g, "")
    .trim();

  // Pattern 1: Pure numbers and operators (e.g. "(3/4) ÷ (2/3)", "15 * 4 + 2", "sqrt(144)")
  const arithmeticPattern = /^[\d\s\+\-\*\/\^÷×\(\)\.\,]+$/;
  if (arithmeticPattern.test(stripped) && /[0-9]/.test(stripped) && /[\+\-\*\/\^÷×]/.test(stripped)) {
    return true;
  }

  // Pattern 2: Unit conversion (e.g. "50 km to m", "100 km/h in mph", "25 celsius to fahrenheit")
  const unitConversionPattern = /^(\d+(?:\.\d+)?)\s*([a-zA-Z\/°℃℉]+)\s+(?:to|in|into)\s+([a-zA-Z\/°℃℉]+)$/i;
  if (unitConversionPattern.test(stripped)) {
    return true;
  }

  // Pattern 3: Simple linear equation (e.g. "2x + 10 = 30", "5x - 4 = 16")
  const linearEqPattern = /^([+-]?\d*(?:\.\d+)?[a-zA-Z]\s*[+-]\s*\d+(?:\.\d+)?)\s*=\s*([+-]?\d+(?:\.\d+)?)$/;
  if (linearEqPattern.test(stripped)) {
    return true;
  }

  return false;
}

/**
 * Normalizes input math string (converts ÷ to /, × to *, handles clean spacing).
 */
export function normalizeMathString(raw: string): string {
  return raw
    .replace(/÷/g, "/")
    .replace(/×/g, "*")
    .replace(/–|—/g, "-") // Unicode hyphens
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Deterministically solves an expression or unit conversion using Math.js.
 */
export function solveMath(rawQuery: string): MathSolveResult {
  const cleanInput = rawQuery
    .trim()
    .replace(/^(?:what\s+is|calculate|evaluate|solve|compute|find)\s+/i, "")
    .replace(/[?=]+$/g, "")
    .trim();

  // 1. Check for Unit Conversion (e.g., "50 km to m")
  const unitMatch = cleanInput.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z\/°℃℉]+)\s+(?:to|in|into)\s+([a-zA-Z\/°℃℉]+)$/i);
  if (unitMatch) {
    try {
      const val = parseFloat(unitMatch[1]);
      const fromUnit = unitMatch[2].replace(/celsius|℃/i, "degC").replace(/fahrenheit|℉/i, "degF");
      const toUnit = unitMatch[3].replace(/celsius|℃/i, "degC").replace(/fahrenheit|℉/i, "degF");

      const u = math.unit(val, fromUnit);
      const converted = u.to(toUnit);
      const formattedResult = converted.toString();

      return {
        success: true,
        query: rawQuery,
        expression: `${val} ${fromUnit} → ${toUnit}`,
        numericResult: formattedResult,
        unit: toUnit,
        steps: [
          `Original Value: $${val}\\text{ ${fromUnit}}$`,
          `Conversion Target: $\\text{${toUnit}}$`,
          `Result: $${formattedResult}$`,
        ],
        explanationMarkdown: `### 📐 Unit Conversion Result\n\n**${val} ${fromUnit}** = **${formattedResult}**\n\n- **Formula / Ratio:** Converted using standard SI dimensional analysis.\n- **Final Answer:** $${formattedResult}$`,
      };
    } catch (err: any) {
      console.warn("Unit conversion failed:", err);
    }
  }

  // 2. Check for Simple Linear Equation (e.g., "2x + 10 = 30" or "5x = 25")
  const eqMatch = cleanInput.match(/^([+-]?\d*(?:\.\d+)?)([a-zA-Z])\s*([+-]\s*\d+(?:\.\d+)?)?\s*=\s*([+-]?\d+(?:\.\d+)?)$/);
  if (eqMatch) {
    try {
      const rawCoeff = eqMatch[1].trim();
      const variable = eqMatch[2];
      const rawConstant = (eqMatch[3] || "+0").replace(/\s+/g, "");
      const rhs = parseFloat(eqMatch[4]);

      let coeff = 1;
      if (rawCoeff === "" || rawCoeff === "+") coeff = 1;
      else if (rawCoeff === "-") coeff = -1;
      else coeff = parseFloat(rawCoeff);

      const constant = parseFloat(rawConstant);
      // coeff * x + constant = rhs => x = (rhs - constant) / coeff
      const stepRhs = rhs - constant;
      const solution = stepRhs / coeff;

      return {
        success: true,
        query: rawQuery,
        expression: cleanInput,
        numericResult: `${variable} = ${solution}`,
        steps: [
          `Original Equation: $${cleanInput}$`,
          `Subtract constant from both sides: $${coeff}${variable} = ${rhs} - (${constant}) = ${stepRhs}$`,
          `Divide both sides by coefficient $${coeff}$: $${variable} = \\frac{${stepRhs}}{${coeff}} = ${solution}$`,
        ],
        explanationMarkdown: `### 🎯 Algebraic Solution\n\nTo solve **$${cleanInput}$**:\n\n1. **Isolate variable term:** Subtract constant to get $${coeff}${variable} = ${stepRhs}$\n2. **Solve for $${variable}$:** Divide both sides by $${coeff}$:\n   $$${variable} = \\frac{${stepRhs}}{${coeff}} = ${solution}$$\n\n**Final Answer:** **$${variable} = ${solution}$**`,
      };
    } catch (err: any) {
      console.warn("Linear equation solver error:", err);
    }
  }

  // 3. Pure Arithmetic & Fractions (e.g., "(3/4) / (2/3)" or "15 * 4 + 2")
  try {
    const normalized = normalizeMathString(cleanInput);
    const evaluated = math.evaluate(normalized);

    let displayResult = String(evaluated);
    if (typeof evaluated === "number") {
      // If round number, keep integer, else max 6 decimals
      displayResult = Number.isInteger(evaluated) ? String(evaluated) : Number(evaluated.toFixed(6)).toString();
    }

    // Try fraction conversion for clean fraction display
    let fractionStr = "";
    try {
      const fractionVal = math.fraction(normalized);
      if (fractionVal && typeof fractionVal === "object" && "n" in fractionVal && "d" in fractionVal) {
        if (fractionVal.d !== 1) {
          fractionStr = `${fractionVal.s * fractionVal.n}/${fractionVal.d}`;
        }
      }
    } catch {}

    const prettyExpr = cleanInput.replace(/\//g, " ÷ ").replace(/\*/g, " × ");

    const steps = [
      `Expression: $${prettyExpr}$`,
      fractionStr ? `Exact Fraction: $\\frac{${fractionStr.split("/")[0]}}{${fractionStr.split("/")[1]}}$` : null,
      `Calculated Value: **${displayResult}**`,
    ].filter(Boolean) as string[];

    const finalAnswerLine = fractionStr 
      ? `**${displayResult}** (or $\\frac{${fractionStr.split("/")[0]}}{${fractionStr.split("/")[1]}}$)`
      : `**${displayResult}**`;

    return {
      success: true,
      query: rawQuery,
      expression: prettyExpr,
      numericResult: displayResult,
      fractionResult: fractionStr || undefined,
      steps,
      explanationMarkdown: `### 🧮 Mathematical Solution\n\n**Problem:** $${prettyExpr}$\n\n- **Exact Computation:** ${steps.join(" → ")}\n- **Final Answer:** ${finalAnswerLine}`,
    };
  } catch (err: any) {
    return {
      success: false,
      query: rawQuery,
      expression: cleanInput,
      steps: [],
      explanationMarkdown: "",
    };
  }
}
