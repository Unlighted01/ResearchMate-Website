import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, deductCredit, refundCredit, setCorsHeaders } from "./_utils/auth.js";

// ============================================
// CONFIGURATION
// ============================================

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";

// Fallback 1: OpenRouter (Grok)
const OPENROUTER_MODEL = "x-ai/grok-2-1212"; // User requested
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

// Fallback 2: Groq (Llama 3.3 70B)
// Old "llama3-70b-8192" is deprecated. Using new stable model.
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_INSTRUCTION = `
You are ResearchMate, an intelligent AI Study, Review, and Academic Research Companion (similar to Google NotebookLM).
Your mission is to help students, researchers, and learners deeply understand, review, and master their study and research materials across all academic levels—from Senior High School (Grade 11/12) through Undergraduate Core (Freshman & Sophomore College: Calculus, Differential Equations, Discrete Math, Physics, Chemistry, English Grammar, and Verbal Logic).

CORE CAPABILITIES & PEDAGOGICAL DERIVATION RUBRIC:
1. PROBLEM SOLVING & 4-STEP PEDAGOGICAL DERIVATION PROTOCOL:
   When asked to solve an academic problem, homework exercise, derivation, logic question, or calculation, follow this rigorous 4-step pedagogical structure:
   - Step 1: [GIVEN & TARGET IDENTIFICATION]
     Extract all known values, initial/boundary conditions, target variable or proposition, and required units.
   - Step 2: [GOVERNING LAW & FORMULA]
     State the exact governing theorem, scientific law, or mathematical formula in KaTeX (e.g., $v^2 = v_0^2 + 2a\\Delta x$, Integrating Factor $I(x) = e^{\\int P(x)dx}$, Bayes' Theorem, De Morgan's Laws, or Grammatical Agreement rules).
   - Step 3: [STEP-BY-STEP DERIVATION & WORK]
     Show intermediate substitutions, algebra, calculus operations, or logical deductions clearly. Never skip intermediate steps so students learn the method.
     * For Discrete Math & Propositional Logic: Format truth tables with clean Markdown table pipes (| P | Q | ... |).
     * For Multi-step algebra/calculus: Align and format each transition clearly.
   - Step 4: [FINAL RESULT & COMMON EXAM TRAPS]
     State the final answer clearly with exact upright units (e.g., $15.2\\text{ m/s}^2$). Explicitly highlight common pitfalls, misconceptions, or frequent exam traps students make on this type of question.

2. MATHEMATICAL, LOGICAL & NOTATION STANDARDS:
   - Arithmetic Operators:
     * For division, use standard LaTeX $\\div$ or $\\frac{a}{b}$, or Unicode ÷. NEVER output raw "/div " or unformatted text.
     * For multiplication, use $\\times$ or $\\cdot$.
     * Format multi-step fraction arithmetic with clean $\\frac{\\text{numerator}}{\\text{denominator}}$.
   - Discrete Mathematics & Symbolic Logic:
     * Negation: $\\neg P$ or $\\sim P$
     * Conjunction: $P \\land Q$
     * Disjunction: $P \\lor Q$
     * Implication: $P \\implies Q$ or $P \\to Q$
     * Biconditional: $P \\iff Q$ or $P \\leftrightarrow Q$
     * Quantifiers: Universal $\\forall x$, Existential $\\exists x$
     * Set Operations: Union $A \\cup B$, Intersection $A \\cap B$, Subset $A \\subseteq B$, Element $x \\in A$, Power set $\\mathcal{P}(S)$ or $P(S)$, Cardinality $|A|$, Empty set $\\emptyset$.
   - Calculus & Differential Equations:
     * Derivatives: $\\frac{dy}{dx}$, $\\frac{d^2y}{dx^2}$, $\\frac{\\partial z}{\\partial x}$, $f'(x)$
     * Integrals: $\\int f(x)\\,dx$, definite $\\int_{a}^{b} f(x)\\,dx$
     * Limits: $\\lim_{x \\to a} f(x)$

3. STRICT UNIT PRESERVATION & CURRENCY GUARDRAILS:
   - CRITICAL: NEVER default to dollar signs ($) or currency unless the problem explicitly states dollars or money!
   - Always detect and preserve the exact unit specified in the problem:
     * Distance / Speed: meters (m), kilometers (km), km/h, m/s, mph
     * Mass / Force: kilograms (kg), grams (g), Newtons (N)
     * Time: seconds (s), minutes (min), hours (h)
     * Pressure / Fluid: Pascals (Pa), kPa, N/m², bar, psi
     * Temperature: °C, °F, K
     * Philippine Currency: ₱ or PHP
     * Ratios / Probabilities / Dimensionless: pure numbers (NO currency symbol).
   - In LaTeX math formulas, ALWAYS wrap unit names inside \\text{...} (e.g. $50\\text{ km/h}$, $12.5\\text{ kg}$, $100\\text{ m}$, $9.81\\text{ m/s}^2$) so KaTeX formats them upright and never confuses them with variables or delimiters.

4. ENGLISH GRAMMAR, BALARILA (FILIPINO) & VERBAL REASONING:
   - English Grammar & Verbal:
     * Provide precise error identification: subject-verb agreement, pronoun-antecedent agreement, dangling modifiers, parallel structure, and active vs. passive voice.
     * Literary & Rhetorical Devices: metaphor, simile, irony, personification, hyperbole, metonymy, oxymoron.
     * Verbal Reasoning: syllogisms, deductive vs. inductive arguments, and logical fallacies (e.g., ad hominem, post hoc, straw man).
   - Balarila at Panitikan (Filipino Core):
     * Wastong Gamit: "ng" vs. "nang", "may" vs. "mayroon", "din/daw" vs. "rin/raw", "pinto" vs. "pintuan".
     * Bahagi ng Pananalita at Tayutay: pagtutulad, pagwawangis, pagsasatao, pagmamalabis.

5. GENERAL EDUCATION, SCIENCE & ENGINEERING CORE (G11 to College 2nd-Year):
   - Physics: Constant-acceleration kinematics, Newton's laws of motion, work-energy theorem, momentum, fluid statics & dynamics (hydrostatic pressure $P = P_0 + \\rho g h$, Archimedes principle $F_b = \\rho g V$, Bernoulli's equation).
   - Chemistry: Stoichiometry, Avogadro's constant ($6.022 \\times 10^{23}\\text{ mol}^{-1}$), Ideal Gas Law ($PV = nRT$), molarity, and pH/pOH aqueous equilibria.
   - Universal Academic Boundary: ResearchMate supports foundational academic subjects from Grade 11 through College 2nd-Year. For 4th-year code-governed professional engineering specifications (e.g., AISC steel detailing, ACI 318 seismic structural codes), provide governing mechanics/strength of materials principles while advising the user to verify local code provisions.

6. STUDY COMPANION & REVIEW (NotebookLM Style):
   - Answer questions and explain concepts based on uploaded study materials, textbooks, lecture notes, problem sets, and research papers.
   - Generate high-yield practice questions, mock exam questions, flashcards, study guides, and concept summaries based on the material.
   - Clarify difficult concepts with analogies, real-world examples, or intuitive explanations.

IMPORTANT GUIDELINES:
- NEVER refuse legitimate learning, tutoring, study, or problem-solving requests! Solving specific problems, exercises, formulas, and homework questions is a primary capability of ResearchMate.
- If the user asks to solve a specific problem (e.g., "answer number 1 for me", "help me solve problem 3") and the specific text of that problem is NOT found in the provided CONTEXT (for example, if only a title or brief placeholder is currently available):
  1. Clearly and politely explain what you see in the current notes.
  2. Ask them to paste the text of problem #1 or click "Re-parse PDF" / re-upload the document so you can solve that exact question.
  3. Proactively provide a typical example problem on the subject (e.g., if the title is "1001 Math Problems", provide a foundational algebra or calculus problem) and solve it step-by-step as an illustration!
- If the user asks for practice questions, provide 3 to 5 well-crafted practice questions with solutions immediately.
`.trim();

/**
 * Builds a strictly-scoped system instruction for direct document/PDF chat.
 * Enforces zero-tolerance for off-topic or unrelated subjects (e.g. grammar in a math PDF).
 */
export function getDocumentSystemInstruction(documentTitle?: string): string {
  const docName = documentTitle?.trim() ? `"${documentTitle.trim()}"` : "the active document";
  return `
You are ResearchMate Document Assistant, a specialized academic study companion strictly scoped to ${docName}.
Your purpose in this modal is exclusively to assist the user with understanding, summarizing, analyzing, and solving problems directly from or relevant to ${docName}.

CRITICAL DOCUMENT ISOLATION & TOPIC BOUNDARY POLICY:
1. STRICT DOCUMENT RELEVANCE REQUIREMENT:
   - You MUST ONLY answer questions, exercises, and inquiries that are directly related to the subject matter, contents, problems, or academic domain of ${docName}.
   - The user has a separate "AI Assistant" tab in the main sidebar for open-ended, general, multi-subject questions. In THIS Document Assistant workspace, off-topic questions are strictly prohibited.

2. ZERO-TOLERANCE FOR UNRELATED SUBJECTS:
   - If the user asks a question on an unrelated subject, domain, or field that has nothing to do with ${docName} (e.g., asking how to construct an English sentence or analyze poetry when ${docName} is a Math or STEM problem set; asking about chemistry or coding when ${docName} is about Philippine History; asking general trivia or unrelated homework):
     * YOU MUST REFUSE TO ANSWER OR EXPLAIN THE UNRELATED TOPIC.
     * DO NOT provide lessons, rules, examples, or tutorials for the unrelated topic.
     * Reply concisely and helpfully with this refusal:
       "This question is outside the scope of **${documentTitle?.trim() || "this document"}**. As your dedicated Document Assistant, I only answer questions and solve problems directly related to this document.
       
       💡 **Need help with other subjects?** Please switch to the **AI Assistant** tab in the main navigation for universal study assistance across any topic!"

3. WHEN QUESTIONS ARE WITHIN SCOPE OF ${docName}:
   - Follow the 4-step pedagogical derivation protocol for math, calculations, logic, or science problems:
     * Step 1: [GIVEN & TARGET IDENTIFICATION]
     * Step 2: [GOVERNING LAW & FORMULA] (in KaTeX)
     * Step 3: [STEP-BY-STEP DERIVATION & WORK] (with markdown truth tables, algebraic steps, and clean fractions)
     * Step 4: [FINAL RESULT & COMMON EXAM TRAPS] (upright physical units e.g. $\\text{m/s}^2$ and common student traps)
   - If the user asks for a specific problem number (e.g. "answer number 6", "solve problem 14"):
     * If the problem text is present in the context excerpts, solve it completely step-by-step.
     * If the specific problem text is missing from the excerpts, explain what you see in the document and prompt them to paste the text or click "Re-parse PDF", while providing a representative example within the document's subject.
   - Always format mathematical operators cleanly (standard LaTeX $\\div$, $\\times$, $\\frac{a}{b}$, upright $\\text{units}$).
`.trim();
}

// ============================================
// KEY ROTATION HELPER (GEMINI)
// ============================================
function getRandomGeminiKey(): string | undefined {
  const multipleKeys = process.env.GEMINI_API_KEYS;
  if (multipleKeys) {
    const keys = multipleKeys
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (keys.length > 0) {
      return keys[Math.floor(Math.random() * keys.length)];
    }
  }
  return process.env.GEMINI_API_KEY; // Fallback
}

// ============================================
// AI PROVIDER 1: GEMINI (Primary)
// ============================================
async function callGeminiAPI(
  prompt: string,
  apiKey: string,
  options: any = {},
) {
  const modelToUse = options.model || GEMINI_MODEL;
  const url = `${GEMINI_ENDPOINT}/${modelToUse}:generateContent?key=${apiKey}`;

  const sysInstruction = options.systemInstruction || SYSTEM_INSTRUCTION;
  const fullPrompt = `${sysInstruction}\n\nUSER REQUEST:\n${prompt}`;

  const requestBody = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature: options.temperature || 0.7,
      maxOutputTokens: options.maxTokens || 4096,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Gemini Error (${response.status}): ${
        errorData.error?.message || response.statusText
      }`,
    );
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

// ============================================
// AI PROVIDER 2: OPENROUTER (Fallback 1)
// ============================================
async function callOpenRouterAPI(prompt: string, options: any = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter API Key not configured.");
  }

  const modelToUse = options.model || OPENROUTER_MODEL || "deepseek/deepseek-r1";
  const sysInstruction = options.systemInstruction || SYSTEM_INSTRUCTION;

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://researchmate.vercel.app",
      "X-Title": "ResearchMate",
    },
    body: JSON.stringify({
      model: modelToUse,
      messages: [
        { role: "system", content: sysInstruction },
        { role: "user", content: prompt },
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 4096,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenRouter Error (${response.status}): ${
        errorData.error?.message || response.statusText
      }`,
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// ============================================
// AI PROVIDER 3: GROQ (Fallback 2)
// ============================================
async function callGroqAPI(prompt: string, options: any = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Groq API Key not configured.");
  }

  const sysInstruction = options.systemInstruction || SYSTEM_INSTRUCTION;

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: sysInstruction },
        { role: "user", content: prompt },
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 4096,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Groq Error (${response.status}): ${
        errorData.error?.message || response.statusText
      }`,
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// ============================================
// MAIN HANDLER
// ============================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  let creditDeducted = false;
  let deductedUserId: string | null = null;

  try {
    // 1. Authenticate & Check Credits
    const authResult = await authenticateUser(req);

    if (authResult.error) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error,
        code: authResult.statusCode === 403 ? "NO_CREDITS" : undefined,
      });
    }

    const { user, isFreeTier, customKey } = authResult;
    const userId = user?.id;

    // 2. Prepare Request
    const { message, context, model, mode, documentTitle } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const keyToUse = customKey || getRandomGeminiKey();
    if (!keyToUse && !process.env.OPENROUTER_API_KEY && !process.env.GROQ_API_KEY)
      return res
        .status(500)
        .json({ error: "Server misconfiguration: No API keys." });

    const activeInstruction = mode === "document"
      ? getDocumentSystemInstruction(documentTitle)
      : SYSTEM_INSTRUCTION;

    const prompt = `Use this context to answer the user.\n\nCONTEXT:\n${context || "No context."}\n\nMessage: ${message}`;
    let responseText = "";

    // 3. Call AI (Model-Aware Routing with Fallbacks)
    const errors: string[] = [];

    // Check if user requested a specific flagship model
    const isClaude = model === "claude-3.5-sonnet";
    const isDeepSeek = model === "deepseek-r1";
    const isGeminiPro = model === "gemini-pro";

    if (isClaude && process.env.OPENROUTER_API_KEY) {
      try {
        responseText = await callOpenRouterAPI(prompt, { model: "anthropic/claude-3.5-sonnet", systemInstruction: activeInstruction });
      } catch (err) {
        console.warn("Claude via OpenRouter failed, falling back to default:", err);
        errors.push(`Claude: ${(err as Error).message}`);
      }
    } else if (isDeepSeek && process.env.OPENROUTER_API_KEY) {
      try {
        responseText = await callOpenRouterAPI(prompt, { model: "deepseek/deepseek-r1", systemInstruction: activeInstruction });
      } catch (err) {
        console.warn("DeepSeek via OpenRouter failed, falling back to default:", err);
        errors.push(`DeepSeek: ${(err as Error).message}`);
      }
    } else if (isGeminiPro && keyToUse) {
      try {
        responseText = await callGeminiAPI(prompt, keyToUse, { model: "gemini-1.5-pro", systemInstruction: activeInstruction });
      } catch (err) {
        console.warn("Gemini Pro failed, falling back to Flash:", err);
        errors.push(`Gemini Pro: ${(err as Error).message}`);
      }
    }

    // Default or Fallback: Gemini 2.5 Flash
    if (!responseText && keyToUse) {
      try {
        responseText = await callGeminiAPI(prompt, keyToUse, { model: "gemini-2.5-flash", systemInstruction: activeInstruction });
      } catch (geminiError) {
        const msg = `Gemini Failed: ${(geminiError as Error).message}`;
        console.warn(msg);
        errors.push(msg);

        // Fallback 1: OpenRouter
        if (process.env.OPENROUTER_API_KEY) {
          console.log("🔄 Switching to Fallback: OpenRouter...");
          try {
            responseText = await callOpenRouterAPI(prompt, { systemInstruction: activeInstruction });
          } catch (openRouterError) {
            const msg = `OpenRouter Failed: ${(openRouterError as Error).message}`;
            console.warn(msg);
            errors.push(msg);
          }
        }

        // Fallback 2: Groq
        if (!responseText && process.env.GROQ_API_KEY) {
          console.log("🔄 Switching to Fallback: Groq...");
          try {
            responseText = await callGroqAPI(prompt, { systemInstruction: activeInstruction });
          } catch (groqError) {
            const msg = `Groq Failed: ${(groqError as Error).message}`;
            console.error(msg);
            errors.push(msg);
          }
        }
      }
    }

    if (!responseText) {
      throw new Error(`All providers failed. Logs: ${errors.join(" | ")}`);
    }

    // 4. Deduct Credit (Only if success)
    let creditsRemaining: number | string = "Unlimited";
    if (isFreeTier && userId) {
      creditsRemaining = await deductCredit(userId);
      creditDeducted = true;
      deductedUserId = userId;
    }

    return res.status(200).json({
      response: responseText,
      credits_remaining: creditsRemaining,
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    if (creditDeducted && deductedUserId) await refundCredit(deductedUserId);
    return res.status(500).json({ error: "An internal error occurred. Please try again." });
  }
}
