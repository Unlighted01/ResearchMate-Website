---
name: write-tests
description: Write Vitest integration tests for a ResearchMate API endpoint following all established patterns from ocr.integration.test.ts
context: fork
agent: general-purpose
effort: high
disable-model-invocation: true
allowed-tools: Read, Glob, Write
---

Write Vitest integration tests for a ResearchMate API endpoint.

Endpoint from $ARGUMENTS (e.g. "api/summarize.ts").

Steps:
1. Read the target endpoint file fully
2. Read api/ocr.integration.test.ts for exact test patterns
3. Generate a complete test file covering:
   - HTTP validation (405, 401, 400, 413 if applicable)
   - Happy path (200, correct response shape)
   - Provider fallback (primary fails → fallback, all fail → 500)
   - Credit refund (error path calls refundCredit exactly once)
   - Content quality (response structure validation)
4. Include CRITICAL patterns:
   - `vi.mock("./_utils/auth.js", ...)` at file top (before imports)
   - `vi.unstubAllGlobals()` in afterEach (NOT just restoreAllMocks)
   - Use `"A".repeat(14 * 1024 * 1024)` for oversized test (not 11MB)
5. Write to api/$name.integration.test.ts
6. Show a table of which test cases were generated
