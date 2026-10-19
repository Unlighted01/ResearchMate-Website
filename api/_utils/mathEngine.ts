// ============================================
// BACKEND MATH ENGINE - Deterministic Calculation Utility
// ============================================

import { create, all } from "mathjs";

const math = create(all, {
  number: "number",
  precision: 64,
});

export function solveExpressionBackend(expr: string): { success: boolean; result?: string; fraction?: string; error?: string } {
  try {
    const normalized = expr
      .replace(/÷/g, "/")
      .replace(/×/g, "*")
      .trim();

    const evaluated = math.evaluate(normalized);
    let display = String(evaluated);
    if (typeof evaluated === "number") {
      display = Number.isInteger(evaluated) ? String(evaluated) : Number(evaluated.toFixed(6)).toString();
    }

    let fraction: string | undefined = undefined;
    try {
      const f = math.fraction(normalized);
      if (f && typeof f === "object" && "n" in f && "d" in f && Number((f as any).d) !== 1) {
        fraction = `${(f as any).s * (f as any).n}/${(f as any).d}`;
      }
    } catch {}

    return {
      success: true,
      result: display,
      fraction,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Computation failed",
    };
  }
}
