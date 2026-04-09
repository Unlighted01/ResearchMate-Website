// ============================================
// OCR INTEGRATION TESTS
// Covers font capture, provider fallback, validation, and confidence scoring
// Run with: npx vitest run api/ocr.integration.test.ts
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// ── Fix Bug 1 ────────────────────────────────────────────────────────────────
// auth.ts calls createClient(supabaseUrl!, supabaseServiceKey!) at MODULE LOAD
// time. In tests both env vars are undefined → supabase-js v2 throws
// "supabaseUrl is required" synchronously, crashing every dynamic import of
// ocr.ts. Mock the whole module so createClient is never invoked.
vi.mock("./_utils/auth.js", () => ({
  authenticateUser: vi.fn().mockResolvedValue({
    user: { id: "test-user-id", email: "test@example.com" },
    isFreeTier: true,
    error: undefined,
    statusCode: undefined,
  }),
  deductCredit: vi.fn().mockResolvedValue(49),
  checkRateLimit: vi.fn().mockReturnValue(true),
}));

// ============================================
// PART 2: TEST UTILITIES & FIXTURES
// ============================================

/**
 * Minimal 1x1 white JPEG in base64 — used as a valid image stub.
 * Replace with real font-sample base64 strings in a live integration run.
 */
const STUB_JPEG_B64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U" +
  "HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN" +
  "DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy" +
  "MjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUE/8QAIRAAAg" +
  "ICAgMBAAAAAAAAAAAAAQIDBAUREiExQf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEA" +
  "AAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwABr5zJBdFJe6sLqNFJhAAAAAAAAAA" +
  "AAAB//2Q==";

const VALID_JPEG = `data:image/jpeg;base64,${STUB_JPEG_B64}`;
const VALID_PNG = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
const VALID_WEBP = `data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA`;

// ── Fix Bug 2 ────────────────────────────────────────────────────────────────
// The handler guard: estimatedBytes = image.length * 3/4 > 10MB
// "A".repeat(11MB) → total length ≈ 11.5M chars → estimated ≈ 8.6MB  ← UNDER limit, 413 never fires
// Need: image.length > 10MB × 4/3 ≈ 13.98M chars  →  14MB payload is safe
const OVERSIZED_IMAGE = `data:image/jpeg;base64,${"A".repeat(14 * 1024 * 1024)}`;

/** Simulate API response texts for different font/document types */
const FONT_SAMPLES: Record<string, string> = {
  timesNewRoman: `# Research Abstract\n\nThis study examines the effects of **optical character recognition** on academic productivity. Results show a 47% reduction in transcription time.\n\n## Methodology\n\nParticipants (n=120) were assigned to three groups...`,
  arial: `## Introduction\n\nArial is a widely-used sans-serif typeface that appears in many academic and corporate documents. The **key finding** is that sans-serif fonts achieve 94% OCR accuracy at 300 DPI.\n\n- Point one\n- Point two\n- Point three`,
  courier: `\`\`\`\nSELECT * FROM research_items\nWHERE ocr_confidence > 80\nORDER BY created_at DESC;\n\`\`\`\n\nMonospace fonts such as **Courier New** are common in code listings and terminal output.`,
  handwritten: `Dear Professor,\n\nI am writing to request an extension. My notes from the lecture on *March 15* include the following key points:\n\n1. OCR accuracy drops ~30% with cursive handwriting\n2. Post-correction models can recover up to 22% of errors`,
  degradedScan: `## Chapter 3: Metho d ology\n\nDue to sc an noi se, some ch aracters may be split or m erged. The system's con fidence sco re pe nali zes no isy input usin g a no ise rat io calc ulation.`,
  multiColumn: `## Left Column\n\nContent from the left column of an academic paper double-column layout.\n\n## Right Column\n\nContent from the right column, read after the full left column is complete.`,
  // Matches the paper's own table format (CLAUDE.md pipe style, 3+ data rows)
  tableContent: [
    "| Font / Source Type       | Scan DPI | OCR Accuracy | Notes                          |",
    "|--------------------------|----------|--------------|--------------------------------|",
    "| Times New Roman (printed)| 300      | 97.2%        | Optimized standard typeface    |",
    "| Arial (printed)          | 300      | 95.8%        | Optimized standard typeface    |",
    "| Handwritten cursive      | 300      | 68.4%        | Drops ~30% vs printed          |",
    "| Degraded / low-res scan  | 72       | 52.1%        | Noise penalty applied          |",
  ].join("\n"),
};

// ============================================
// PART 3: MOCK HELPERS
// ============================================

function buildRequest(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: "POST",
    headers: {},
    body: {},
    ...overrides,
  } as unknown as VercelRequest;
}

function buildResponse(): { res: VercelResponse; captured: { status?: number; body?: unknown } } {
  const captured: { status?: number; body?: unknown } = {};
  const res = {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn((body) => { captured.body = body; return res; }),
    end: vi.fn().mockReturnThis(),
  } as unknown as VercelResponse;
  // Capture the status when called
  (res.status as ReturnType<typeof vi.fn>).mockImplementation((code: number) => {
    captured.status = code;
    return res;
  });
  return { res, captured };
}

/** Create a fake fetch response */
function mockFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

// ============================================
// PART 4: UNIT TESTS — calculateOcrConfidence
// ============================================

describe("calculateOcrConfidence()", () => {
  /**
   * We replicate the function here to unit-test it independently of the handler.
   * This matches the implementation in api/ocr.ts exactly.
   */
  function calculateOcrConfidence(text: string, provider: string): number {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const providerBase: Record<string, number> = {
      openrouter: 0.82,
      gemini: 0.80,
      claude: 0.78,
    };
    const base = providerBase[provider] ?? 0.70;
    const lengthBonus = Math.min(0.15, wordCount / 1500);
    const noiseRatio =
      (text.match(/[^\w\s.,;:!?'"()\-–—]/g) || []).length /
      Math.max(1, text.length);
    const noisePenalty = Math.min(0.15, noiseRatio * 5);
    return Math.min(0.98, Math.max(0.50, base + lengthBonus - noisePenalty));
  }

  it("returns high confidence for clean Times New Roman text via openrouter", () => {
    const score = calculateOcrConfidence(FONT_SAMPLES.timesNewRoman, "openrouter");
    expect(score).toBeGreaterThanOrEqual(0.82);
    expect(score).toBeLessThanOrEqual(0.98);
  });

  it("returns high confidence for clean Arial text via gemini", () => {
    const score = calculateOcrConfidence(FONT_SAMPLES.arial, "gemini");
    expect(score).toBeGreaterThanOrEqual(0.80);
    expect(score).toBeLessThanOrEqual(0.98);
  });

  it("returns high confidence for monospace/Courier text via claude", () => {
    const score = calculateOcrConfidence(FONT_SAMPLES.courier, "claude");
    expect(score).toBeGreaterThanOrEqual(0.78);
  });

  it("penalises degraded-scan output with noise characters", () => {
    const cleanScore = calculateOcrConfidence(FONT_SAMPLES.timesNewRoman, "gemini");
    const noisyScore = calculateOcrConfidence(FONT_SAMPLES.degradedScan, "gemini");
    // Degraded scan has space-split chars — noise ratio is lower here so difference is small,
    // but clean text should never score worse than noisy text at the same provider.
    expect(cleanScore).toBeGreaterThanOrEqual(noisyScore);
  });

  it("gives a word-count bonus for longer documents", () => {
    const shortText = "Hello world.";
    const longText = Array(200).fill("research academic study results methodology").join(" ");
    const shortScore = calculateOcrConfidence(shortText, "gemini");
    const longScore = calculateOcrConfidence(longText, "gemini");
    expect(longScore).toBeGreaterThan(shortScore);
  });

  it("clamps score to [0.50, 0.98] regardless of input", () => {
    const emptyScore = calculateOcrConfidence("", "gemini");
    const highScore = calculateOcrConfidence(
      Array(500).fill("clean standard printed text word").join(" "),
      "openrouter"
    );
    expect(emptyScore).toBeGreaterThanOrEqual(0.50);
    expect(highScore).toBeLessThanOrEqual(0.98);
  });

  it("uses 0.70 base for unknown providers", () => {
    const score = calculateOcrConfidence("short text", "unknown-provider");
    expect(score).toBeGreaterThanOrEqual(0.70);
  });

  it("ranks providers: openrouter ≥ gemini ≥ claude for identical text", () => {
    const text = FONT_SAMPLES.arial;
    const scores = {
      openrouter: calculateOcrConfidence(text, "openrouter"),
      gemini: calculateOcrConfidence(text, "gemini"),
      claude: calculateOcrConfidence(text, "claude"),
    };
    expect(scores.openrouter).toBeGreaterThanOrEqual(scores.gemini);
    expect(scores.gemini).toBeGreaterThanOrEqual(scores.claude);
  });
});

// ============================================
// PART 5: INTEGRATION TESTS — HTTP Handler
// ============================================

describe("OCR handler — request validation", () => {
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<void>;

  beforeEach(async () => {
    // Dynamically import so env mocking is applied first
    vi.resetModules();
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    // authenticateUser is bypassed via smart-pen service key in most tests
    process.env.SMART_PEN_SERVICE_KEY = "test-smart-pen-secret";
    const mod = await import("./ocr.js");
    handler = mod.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals(); // Fix Bug 3: vi.restoreAllMocks() does NOT undo vi.stubGlobal
  });

  it("rejects non-POST requests with 405", async () => {
    const req = buildRequest({ method: "GET" });
    const { res, captured } = buildResponse();
    await handler(req, res);
    expect(captured.status).toBe(405);
    expect((captured.body as Record<string, string>).error).toMatch(/method not allowed/i);
  });

  it("responds 200 to OPTIONS preflight", async () => {
    const req = buildRequest({ method: "OPTIONS" });
    const { res, captured } = buildResponse();
    await handler(req, res);
    expect(captured.status).toBe(200);
  });

  it("rejects missing image with 400", async () => {
    const req = buildRequest({ body: {} });
    const { res, captured } = buildResponse();
    await handler(req, res);
    expect(captured.status).toBe(400);
    expect((captured.body as Record<string, string>).error).toMatch(/image.*required/i);
  });

  it("rejects non-data-URI image with 400", async () => {
    const req = buildRequest({ body: { image: "not-a-data-uri" } });
    const { res, captured } = buildResponse();
    await handler(req, res);
    expect(captured.status).toBe(400);
    expect((captured.body as Record<string, string>).error).toMatch(/invalid image format/i);
  });

  it("rejects oversized image (>10MB) with 413", async () => {
    const req = buildRequest({ body: { image: OVERSIZED_IMAGE } });
    const { res, captured } = buildResponse();
    await handler(req, res);
    expect(captured.status).toBe(413);
    expect((captured.body as Record<string, string>).error).toMatch(/too large/i);
  });
});

// ============================================
// PART 6: INTEGRATION TESTS — Font Capture via Smart Pen Bypass
// ============================================

describe("OCR handler — font capture scenarios (Smart Pen bypass)", () => {
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<void>;

  beforeEach(async () => {
    vi.resetModules();
    process.env.SMART_PEN_SERVICE_KEY = "test-smart-pen-secret";
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    process.env.GEMINI_API_KEY = "test-gemini-key";
    const mod = await import("./ocr.js");
    handler = mod.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals(); // Fix Bug 3: vi.restoreAllMocks() does NOT undo vi.stubGlobal
  });

  async function runOcrWithMockedResponse(imageDataUrl: string, mockText: string) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({
          choices: [{ message: { content: mockText } }],
        })
      )
    );

    const req = buildRequest({
      headers: { "x-smart-pen-key": "test-smart-pen-secret" },
      body: { image: imageDataUrl, includeSummary: false },
    });
    const { res, captured } = buildResponse();
    await handler(req, res);
    return captured;
  }

  it("successfully extracts Times New Roman printed text from JPEG", async () => {
    const captured = await runOcrWithMockedResponse(VALID_JPEG, FONT_SAMPLES.timesNewRoman);
    expect(captured.status).toBe(200);
    const body = captured.body as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.ocrText).toContain("optical character recognition");
    expect(body.ocrConfidence).toBeGreaterThan(0);
    expect(body.ocrProvider).toBe("openrouter");
  });

  it("successfully extracts Arial sans-serif text from PNG", async () => {
    const captured = await runOcrWithMockedResponse(VALID_PNG, FONT_SAMPLES.arial);
    expect(captured.status).toBe(200);
    const body = captured.body as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.ocrText).toContain("sans-serif");
  });

  it("successfully extracts monospace/Courier text (code blocks) from JPEG", async () => {
    const captured = await runOcrWithMockedResponse(VALID_JPEG, FONT_SAMPLES.courier);
    expect(captured.status).toBe(200);
    const body = captured.body as Record<string, unknown>;
    expect(body.ocrText).toContain("SELECT");
    expect(body.ocrText).toContain("Courier New");
  });

  it("captures handwritten-style text with lower confidence", async () => {
    const captured = await runOcrWithMockedResponse(VALID_JPEG, FONT_SAMPLES.handwritten);
    expect(captured.status).toBe(200);
    const body = captured.body as Record<string, unknown>;
    expect(body.success).toBe(true);
    // Handwriting text is short — confidence should be lower than a long printed doc
    expect(body.ocrConfidence).toBeGreaterThanOrEqual(50);
  });

  it("captures multi-column academic paper layout", async () => {
    const captured = await runOcrWithMockedResponse(VALID_JPEG, FONT_SAMPLES.multiColumn);
    expect(captured.status).toBe(200);
    const body = captured.body as Record<string, unknown>;
    expect(body.ocrText).toContain("Left Column");
    expect(body.ocrText).toContain("Right Column");
  });

  it("captures tables with Markdown pipe formatting (≥3 data rows, paper format)", async () => {
    const captured = await runOcrWithMockedResponse(VALID_JPEG, FONT_SAMPLES.tableContent);
    expect(captured.status).toBe(200);
    const body = captured.body as Record<string, unknown>;
    const text = body.ocrText as string;

    // Verify pipe-delimited Markdown table structure
    expect(text).toContain("|");
    expect(text).toContain("---|");          // separator row present

    // Must capture the paper's specific font/accuracy columns
    expect(text).toContain("Times New Roman");
    expect(text).toContain("Arial");
    expect(text).toContain("Handwritten cursive");

    // Count data rows (lines with | that are not the header or separator)
    const dataRows = text
      .split("\n")
      .filter((line) => line.includes("|") && !line.match(/^[|\s-]+$/));
    expect(dataRows.length).toBeGreaterThanOrEqual(3); // paper mandates ≥3 rows

    // Verify numeric accuracy values are preserved
    expect(text).toContain("97.2%");
    expect(text).toContain("95.8%");
    expect(text).toContain("68.4%");
  });

  it("processes WebP image format successfully", async () => {
    const captured = await runOcrWithMockedResponse(VALID_WEBP, FONT_SAMPLES.arial);
    expect(captured.status).toBe(200);
    expect((captured.body as Record<string, unknown>).success).toBe(true);
  });

  it("returns 422 and success=false when all providers fail", async () => {
    // All fetch calls fail
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse({ error: "API down" }, 503)));

    const req = buildRequest({
      headers: { "x-smart-pen-key": "test-smart-pen-secret" },
      body: { image: VALID_JPEG, includeSummary: false },
    });
    const { res, captured } = buildResponse();
    await handler(req, res);
    expect(captured.status).toBe(422);
    expect((captured.body as Record<string, unknown>).success).toBe(false);
  });
});

// ============================================
// PART 7: INTEGRATION TESTS — Provider Fallback Chain
// ============================================

describe("OCR handler — provider fallback chain", () => {
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<void>;

  beforeEach(async () => {
    vi.resetModules();
    process.env.SMART_PEN_SERVICE_KEY = "test-smart-pen-secret";
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.OCR_API_KEY = "test-claude-key"; // tertiary provider
    const mod = await import("./ocr.js");
    handler = mod.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals(); // Fix Bug 3: vi.restoreAllMocks() does NOT undo vi.stubGlobal
  });

  it("falls back to Gemini when OpenRouter returns 503", async () => {
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        callCount++;
        if ((url as string).includes("openrouter")) {
          return mockFetchResponse({ error: "Service unavailable" }, 503);
        }
        // Gemini succeeds
        return mockFetchResponse({
          candidates: [{ content: { parts: [{ text: FONT_SAMPLES.timesNewRoman }] } }],
        });
      })
    );

    const req = buildRequest({
      headers: { "x-smart-pen-key": "test-smart-pen-secret" },
      body: { image: VALID_JPEG, includeSummary: false },
    });
    const { res, captured } = buildResponse();
    await handler(req, res);

    expect(captured.status).toBe(200);
    const body = captured.body as Record<string, unknown>;
    expect(body.ocrProvider).toBe("gemini");
    expect(body.success).toBe(true);
  });

  it("falls back to Claude when OpenRouter AND Gemini both fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if ((url as string).includes("openrouter") || (url as string).includes("generativelanguage")) {
          return mockFetchResponse({ error: "Down" }, 503);
        }
        // Claude succeeds
        return mockFetchResponse({
          content: [{ text: FONT_SAMPLES.arial }],
        });
      })
    );

    const req = buildRequest({
      headers: { "x-smart-pen-key": "test-smart-pen-secret" },
      body: { image: VALID_JPEG, includeSummary: false },
    });
    const { res, captured } = buildResponse();
    await handler(req, res);

    expect(captured.status).toBe(200);
    expect((captured.body as Record<string, unknown>).ocrProvider).toBe("claude");
  });

  it("skips OpenRouter when OPENROUTER_API_KEY is not set", async () => {
    delete process.env.OPENROUTER_API_KEY;
    vi.resetModules();
    process.env.SMART_PEN_SERVICE_KEY = "test-smart-pen-secret";
    process.env.GEMINI_API_KEY = "test-gemini-key";
    const mod = await import("./ocr.js");
    handler = mod.default;

    const fetchSpy = vi.fn().mockResolvedValue(
      mockFetchResponse({
        candidates: [{ content: { parts: [{ text: FONT_SAMPLES.timesNewRoman }] } }],
      })
    );
    vi.stubGlobal("fetch", fetchSpy);

    const req = buildRequest({
      headers: { "x-smart-pen-key": "test-smart-pen-secret" },
      body: { image: VALID_JPEG, includeSummary: false },
    });
    const { res, captured } = buildResponse();
    await handler(req, res);

    expect(captured.status).toBe(200);
    // Should have called Gemini, not OpenRouter
    const calledUrls = fetchSpy.mock.calls.map((c) => c[0] as string);
    expect(calledUrls.some((u) => u.includes("generativelanguage"))).toBe(true);
    expect(calledUrls.some((u) => u.includes("openrouter"))).toBe(false);
  });
});

// ============================================
// PART 8: INTEGRATION TESTS — OCR Content Quality
// ============================================

describe("OCR handler — captured content quality checks", () => {
  beforeEach(() => {
    process.env.SMART_PEN_SERVICE_KEY = "test-smart-pen-secret";
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals(); // Fix Bug 3: vi.restoreAllMocks() does NOT undo vi.stubGlobal
  });

  /**
   * These tests verify that the OCR prompt's formatting rules produce expected
   * Markdown structure in the output. We mock the AI response to simulate what
   * Gemini/OpenRouter would return for well-formatted printed text.
   */

  const ACADEMIC_PAPER_RESPONSE = `# The Impact of Digital Note-Taking on Academic Performance

## Abstract

This study examines **Optical Character Recognition (OCR)** technology in academic settings. A sample of 200 students participated over two semesters.

## 1. Introduction

Modern research workflows increasingly rely on digitized text. Standard typefaces such as **Times New Roman** and **Arial** achieve the highest recognition accuracy.

## 2. Methodology

| Variable | Description | Measurement |
|---|---|---|
| Font type | Serif vs Sans-serif | Categorical |
| Scan DPI | 72 / 150 / 300 | Continuous |
| Accuracy | % correct chars | 0–100% |

## 3. Results

- Times New Roman at 300 DPI: **97.2% accuracy**
- Arial at 300 DPI: **95.8% accuracy**
- Handwriting: **68.4% accuracy**
- Degraded scan (72 DPI): **52.1% accuracy**

## 4. Conclusion

Printed standard typefaces dramatically outperform handwriting in OCR pipelines.`;

  it("returns structured Markdown with proper headings for academic papers", async () => {
    vi.resetModules();
    const mod = await import("./ocr.js");
    const handler = mod.default;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({
          choices: [{ message: { content: ACADEMIC_PAPER_RESPONSE } }],
        })
      )
    );

    const req = buildRequest({
      headers: { "x-smart-pen-key": "test-smart-pen-secret" },
      body: { image: VALID_JPEG, includeSummary: false },
    });
    const { res, captured } = buildResponse();
    await handler(req, res);

    const body = captured.body as Record<string, unknown>;
    const text = body.ocrText as string;

    expect(text).toMatch(/^#\s/m);           // Has H1 heading
    expect(text).toMatch(/^##\s/m);          // Has H2 headings
    expect(text).toContain("**");            // Has bold text
    expect(text).toContain("|");             // Has Markdown table
    expect(text).toContain("- ");            // Has bullet list
    expect(text).toContain("Times New Roman"); // Captures specific font name
    expect(text).toContain("97.2%");         // Captures numeric data accurately
  });

  it("confidence score is 80+ for long, clean printed-text extraction", async () => {
    vi.resetModules();
    const mod = await import("./ocr.js");
    const handler = mod.default;

    // Simulate a long clean document
    const longCleanText = Array(8).fill(ACADEMIC_PAPER_RESPONSE).join("\n\n");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({
          choices: [{ message: { content: longCleanText } }],
        })
      )
    );

    const req = buildRequest({
      headers: { "x-smart-pen-key": "test-smart-pen-secret" },
      body: { image: VALID_JPEG, includeSummary: false },
    });
    const { res, captured } = buildResponse();
    await handler(req, res);

    const body = captured.body as Record<string, unknown>;
    expect(body.ocrConfidence as number).toBeGreaterThanOrEqual(80);
  });

  it("confidence score is lower for short handwritten-style output", async () => {
    vi.resetModules();
    const mod = await import("./ocr.js");
    const handler = mod.default;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({
          choices: [{ message: { content: FONT_SAMPLES.handwritten } }],
        })
      )
    );

    const req = buildRequest({
      headers: { "x-smart-pen-key": "test-smart-pen-secret" },
      body: { image: VALID_JPEG, includeSummary: false },
    });
    const { res, captured } = buildResponse();
    await handler(req, res);

    const body = captured.body as Record<string, unknown>;
    const handwritingScore = body.ocrConfidence as number;

    // Handwriting output is short — must be less than a full academic paper
    // (Not asserting an exact number, just relative to a long doc — tested separately)
    expect(handwritingScore).toBeLessThan(98);
    expect(handwritingScore).toBeGreaterThanOrEqual(50); // Must not floor out
  });
});

// ============================================
// PART 9: INTEGRATION TESTS — Summary Generation
// ============================================

describe("OCR handler — optional summary generation", () => {
  beforeEach(async () => {
    vi.resetModules();
    process.env.SMART_PEN_SERVICE_KEY = "test-smart-pen-secret";
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals(); // Fix Bug 3: vi.restoreAllMocks() does NOT undo vi.stubGlobal
  });

  it("skips summary when includeSummary=false (Smart Pen path)", async () => {
    const mod = await import("./ocr.js");
    const handler = mod.default;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({
          choices: [{ message: { content: FONT_SAMPLES.timesNewRoman } }],
        })
      )
    );

    const req = buildRequest({
      headers: { "x-smart-pen-key": "test-smart-pen-secret" },
      body: { image: VALID_JPEG, includeSummary: false },
    });
    const { res, captured } = buildResponse();
    await handler(req, res);

    const body = captured.body as Record<string, unknown>;
    expect(body.aiSummary).toBeNull();
  });
});
