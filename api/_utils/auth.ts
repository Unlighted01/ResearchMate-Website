import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

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
// AUTHENTICATION HELPER
// ============================================
export async function authenticateUser(
  req: VercelRequest,
): Promise<AuthResult> {
  try {
    // 1. Check for Custom API Key (BYOK Bypass)
    const customKey = req.headers["x-custom-api-key"] as string;
    if (customKey && customKey.startsWith("AIz")) {
      console.log("⚡ Using User's Custom API Key (Bypassing Limits)");
      return { user: { id: "custom-key-user" }, isFreeTier: false, customKey };
    }

    // 2. Extract JWT Token
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

    // 3. Verify Token with Supabase
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
        error: `Failed to fetch user profile: ${profileError.message} (Code: ${profileError.code})`,
        statusCode: 500,
        user: null,
        isFreeTier: true,
      };
    }

    const credits = profile?.ai_credits ?? 0; // Safe default

    if (credits <= 0) {
      return {
        error: "Out of AI Credits",
        statusCode: 403,
        user: null,
        isFreeTier: true,
      };
    }

    return { user: { id: user.id, email: user.email }, isFreeTier: true };
  } catch (error) {
    console.error("Auth Error:", error);
    return {
      error: "Internal Server Authentication Error",
      statusCode: 500,
      user: null,
      isFreeTier: true,
    };
  }
}

// ============================================
// CREDIT DEDUCTION HELPER
// ============================================
export async function deductCredit(userId: string): Promise<number | string> {
  // Get current credits first to return accurate remaining count
  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_credits")
    .eq("id", userId)
    .single();

  const currentCredits = profile ? profile.ai_credits : 0;
  const newCredits = Math.max(0, currentCredits - 1);

  const { error } = await supabase
    .from("profiles")
    .update({ ai_credits: newCredits })
    .eq("id", userId);

  if (error) {
    console.error(`Failed to deduct credit for user ${userId}:`, error);
  }

  return newCredits;
}
