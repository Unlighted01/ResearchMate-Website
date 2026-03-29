---
name: new-endpoint
description: Scaffold a new ResearchMate Vercel serverless API endpoint with correct fallback chain, credit refund pattern, auth, PART sections, and TypeScript
context: fork
agent: general-purpose
effort: high
disable-model-invocation: true
allowed-tools: Read, Glob, Write
---

Create a new API endpoint for ResearchMate.

Endpoint name from $ARGUMENTS (e.g. "translate" creates api/translate.ts).

Steps:
1. Read api/summarize.ts and api/chat.ts to match exact patterns
2. Generate the complete endpoint file with:
   - PART 1: IMPORTS (VercelRequest/Response, auth utils)
   - PART 2: TYPE DEFINITIONS
   - PART 3: CONSTANTS (model names, fallback list, prompt)
   - PART 4: HELPER FUNCTIONS (one per AI provider)
   - PART 5: MAIN HANDLER with:
     * Method check → 405
     * `authenticateUser(req)` → 401
     * Input validation → 400
     * `creditDeducted` + `deductedUserId` flags declared BEFORE try
     * `deductCredit(user.id)` before any AI call
     * Fallback chain: Gemini 2.5 Flash → OpenRouter (Grok) → Groq (Llama 3.3)
     * `refundCredit(deductedUserId)` in catch block
   - PART 6: EXPORTS (default handler)
3. Write to api/$ARGUMENTS.ts
4. List env vars that need to be added to Vercel dashboard
