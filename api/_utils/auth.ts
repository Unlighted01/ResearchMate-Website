import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// ============================================
// IN-MEMORY RATE LIMITER
// ============================================
// 20 requests per 60 seconds per user.
// Resets on function cold start (serverless limitation) — good enough as a
// first-pass guard. Replace with Upstash Redis for persistent limiting.
const RATE_LIMIT_MAX = 20;
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
  isFreeTier: boolean; // True if using credits, False if BYOK
  customKey?: string;
}

// ============================================
// CORS WHITELIST
// ============================================
// Shared by all endpoints — replaces the old `Access-Control-Allow-Origin: *`.
const ALLOWED_ORIGINS = [
  "https://researchmate.vercel.app",
  "https://www.researchmate.vercel.app",
  "http://localhost:5173",  // Vite dev
  "http://localhost:3000",  // fallback dev
];

/**
 * Sets CORS headers for the response. Returns the matched origin
 * or "" if the caller is not whitelisted.
 */
export function setCorsHeaders(
  req: VercelRequest,
  res: VercelResponse,
): string {
  const origin = req.headers.origin ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : "";

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

    // 3. Check for Custom API Key (BYOK) — only AFTER JWT is verified.
    //    BYOK skips credit deduction but NOT identity or rate limiting.
    const customKey = req.cookies?.custom_gemini_key;
    if (customKey && customKey.startsWith("AIz")) {
      if (!checkRateLimit(user.id)) {
        return {
          error: "Too many requests. Please wait a moment before trying again.",
          statusCode: 429,
          user: null,
          isFreeTier: false,
        };
      }
      console.log(`⚡ BYOK user ${user.id} using custom Gemini key`);
      return {
        user: { id: user.id, email: user.email },
        isFreeTier: false,
        customKey,
      };
    }

    // 4. Check Credits in Database
    // Use maybeSingle() to avoid PGRST116 error if row missing
    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("ai_credits")
      .eq("id", user.id)
      .maybeSingle();

    // CASE A: User has NO profile (Old user from before migration)
    if (!profile && !profileError) {
      console.log(`⚠️ User ${user.id} has no profile. Creating one...`);
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({ id: user.id, ai_credits: 50 });

      if (insertError) {
        console.error("Failed to auto-create profile:", insertError);
        return {
          error: "Failed to create user profile",
          statusCode: 500,
          user: null,
          isFreeTier: true,
        };
      }
      profile = { ai_credits: 50 };
    }

    // CASE B: User has profile, but ai_credits is NULL (Migration didn't backfill?)
    if (profile && profile.ai_credits === null) {
      console.log(`⚠️ User ${user.id} has NULL credits. Setting to 50...`);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ ai_credits: 50 })
        .eq("id", user.id);

      if (updateError) {
        console.error("Failed to init credits:", updateError);
      }
      profile.ai_credits = 50;
    }

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return {
        error: "Failed to fetch user profile",
        statusCode: 500,
        user: null,
        isFreeTier: true,
      };
    }

    const credits = profile?.ai_credits ?? 0;

    if (credits <= 0) {
      return {
        error: "Out of AI Credits",
        statusCode: 403,
        user: null,
        isFreeTier: true,
      };
    }

    if (!checkRateLimit(user.id)) {
      return {
        error: "Too many requests. Please wait a moment before trying again.",
        statusCode: 429,
        user: null,
        isFreeTier: true,
      };
    }

    return { user: { id: user.id, email: user.email }, isFreeTier: true };
  } catch (error) {
    console.error("Auth Error:", error);
    return {
      error: "Authentication failed",
      statusCode: 500,
      user: null,
      isFreeTier: true,
    };
  }
}

// ============================================
// CREDIT DEDUCTION HELPER (Atomic)
// ============================================
// Uses a single UPDATE with ai_credits - 1 and a WHERE guard to prevent
// race conditions. Falls back to read-then-write if RPC is not available.
export async function deductCredit(userId: string): Promise<number | string> {
  // Atomic: decrement in one statement, return the new value
  const { data, error } = await supabase.rpc("deduct_credit", {
    p_user_id: userId,
  });

  // If the RPC exists and worked, `data` is the new credit count (or -1 if insufficient).
  if (!error && data !== null && data !== undefined) {
    if (data < 0) {
      console.warn(`User ${userId} tried to deduct but has 0 credits`);
      return 0;
    }
    return data as number;
  }

  // Fallback for deployments where the RPC migration hasn't been applied yet.
  if (error) {
    console.warn("deduct_credit RPC unavailable, using fallback:", error.message);
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_credits")
    .eq("id", userId)
    .single();

  const currentCredits = profile ? profile.ai_credits : 0;
  const newCredits = Math.max(0, currentCredits - 1);

  await supabase
    .from("profiles")
    .update({ ai_credits: newCredits })
    .eq("id", userId);

  return newCredits;
}

// ============================================
// CREDIT REFUND HELPER (Atomic)
// ============================================
// Call this in the catch block of any AI endpoint to restore
// a credit when the provider call fails after deduction.
export async function refundCredit(userId: string): Promise<void> {
  // Atomic: increment in one statement
  const { error } = await supabase.rpc("refund_credit", {
    p_user_id: userId,
  });

  if (!error) return;

  // Fallback
  console.warn("refund_credit RPC unavailable, using fallback:", error.message);
  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_credits")
    .eq("id", userId)
    .single();

  if (!profile) return;

  await supabase
    .from("profiles")
    .update({ ai_credits: profile.ai_credits + 1 })
    .eq("id", userId);
}
