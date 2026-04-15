// ============================================
// SET-CUSTOM-KEY.TS — BYOK Key Management
// ============================================
// Sets or clears the user's custom Gemini API key as a secure cookie.
// SECURITY: Requires a valid JWT — unauthenticated callers are rejected.

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { serialize } from "cookie";
import { setCorsHeaders } from "./_utils/auth.js";

// ============================================
// PART 2: MAIN HANDLER
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Require a valid JWT before allowing key storage
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Lazy-import supabase to verify the token
  const { supabase } = await import("./_utils/auth.js");
  const token = authHeader.split(" ")[1];
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  const { apiKey } = req.body;

  if (apiKey === undefined) {
    return res.status(400).json({ error: "API key is required" });
  }

  // Validate key format if setting (not clearing)
  if (apiKey && (typeof apiKey !== "string" || !apiKey.startsWith("AIz"))) {
    return res.status(400).json({ error: "Invalid Gemini API key format" });
  }

  // Set as HttpOnly, Secure, SameSite=Strict cookie
  // If apiKey is empty/falsy, clear the cookie
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: apiKey ? 60 * 60 * 24 * 30 : 0, // 30 days or delete immediately
  };

  const serializedCookie = serialize(
    "custom_gemini_key",
    apiKey || "",
    cookieOptions,
  );

  res.setHeader("Set-Cookie", serializedCookie);
  console.log(
    `🔑 BYOK key ${apiKey ? "set" : "cleared"} for user ${user.id}`,
  );
  res.status(200).json({ success: true });
}
