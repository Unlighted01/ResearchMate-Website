import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// ============================================
// IN-MEMORY RATE LIMITER
// ============================================
// 20 requests per 60 seconds per user.
// Resets on function cold start (serverless limitation) — good enough as a
// first-pass guard. Replace with Upstash Redis for persistent limiting.
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return true;
}

// ============================================
// SUPABASE ADMIN CLIENT
// ============================================
// Needed to verify JWTs and deduct credits efficiently
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Supabase URL or Service Role Key missing!");
}

export const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// ============================================
// TYPES
// ============================================
export interface AuthenticatedUser {
  id: string;
  email?: string;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error?: string;
  statusCode?: number;
  isFreeTier?: boolean;
  customKey?: string;
}

// ============================================
// CORS WHITELIST
// ============================================
// Shared by all endpoints — replaces the old `Access-Control-Allow-Origin: *`.
const ALLOWED_ORIGINS = [
  "https://researchmate.vercel.app",
  "https://www.researchmate.vercel.app",
  "https://research-mate-website.vercel.app",
  "http://localhost:5173",  // Vite dev
  "http://localhost:3000",  // fallback dev
];

export function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Whitelist all Vercel production & preview deployment URLs (*.vercel.app)
  if (/^https:\/\/[a-zA-Z0-9-_.]+\.vercel\.app$/.test(origin)) return true;
  // Whitelist localhost dev servers
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
}

/**
 * Sets CORS headers for the response. Returns the matched origin
 * or "" if the caller is not whitelisted.
 */
export function setCorsHeaders(
  req: VercelRequest,
  res: VercelResponse,
): string {
  const origin = req.headers.origin ?? "";
  const allowed = isOriginAllowed(origin) ? origin : "";

  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  return allowed;
}

// ============================================
// AUTHENTICATION HELPER
// ============================================
export async function authenticateUser(
  req: VercelRequest,
): Promise<AuthResult> {
  try {
    // 1. Extract JWT Token — ALWAYS required, even for BYOK users
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        error: "Missing or invalid authorization header",
        statusCode: 401,
        user: null,
        isFreeTier: true,
      };
    }
    const token = authHeader.split(" ")[1];

    // 2. Verify Token with Supabase — identity is always validated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        error: "Invalid or expired session token",
        statusCode: 401,
        user: null,
        isFreeTier: true,
      };
    }

    // 3. Rate limiting check (DoS protection)
    if (!checkRateLimit(user.id)) {
      return {
        error: "Too many requests. Please wait a moment before trying again.",
        statusCode: 429,
        user: null,
      };
    }

    // 4. Check for Custom API Key (BYOK)
    const customKey = req.cookies?.custom_gemini_key;
    if (customKey && customKey.startsWith("AIz")) {
      console.log(`⚡ BYOK user ${user.id} using custom Gemini key`);
    }

    // All authenticated users have 100% free, unmetered access
    return {
      user: { id: user.id, email: user.email },
      isFreeTier: false,
      customKey,
    };
  } catch (error) {
    console.error("Auth Error:", error);
    return {
      error: "Authentication failed",
      statusCode: 500,
      user: null,
    };
  }
}

// ============================================
// CREDIT DEDUCTION & REFUND HELPERS (DE-SAASIFIED STUBS)
// ============================================
// ResearchMate is 100% free and unmetered. These stubs preserve
// backward-compatibility without database writes or artificial quotas.
export async function deductCredit(_userId: string): Promise<number | string> {
  return 9999;
}

export async function refundCredit(_userId: string): Promise<void> {
  // No-op: all features are free and unmetered
}
