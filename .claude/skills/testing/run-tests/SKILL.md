---
name: run-tests
description: Run the ResearchMate OCR integration test suite using Vitest. Optionally filter by test name.
context: fork
agent: general-purpose
disable-model-invocation: true
allowed-tools: Bash, Read
---

Run the OCR integration tests for ResearchMate.

Steps:
1. Ensure Vitest is installed: check package.json — if missing run `npm i -D vitest`
2. Run: `npx vitest run api/ocr.integration.test.ts`
3. If $ARGUMENTS is provided, filter: `npx vitest run api/ocr.integration.test.ts -t "$ARGUMENTS"`
4. Report: pass/fail counts, any failures with file:line, and a pass rate summary

Known setup requirements:
- `vi.mock("./_utils/auth.js")` must be at file top — auth.ts calls createClient at module load time
- Tests use `vi.stubGlobal("fetch", ...)` — must call `vi.unstubAllGlobals()` in afterEach (not just restoreAllMocks)
