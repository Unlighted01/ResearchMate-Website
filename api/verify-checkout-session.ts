import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, setCorsHeaders, supabase } from "./_utils/auth.js";

// ============================================
// PAYMONGO VERIFY CHECKOUT SESSION ENDPOINT
// ============================================
// Verifies whether a checkout session was paid directly with PayMongo API
// and updates the user's profile to Student Pro immediately.
// ============================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use GET or POST." });
  }

  try {
    // 1. Authenticate user
    const auth = await authenticateUser(req);
    if (!auth.user) {
      return res.status(auth.statusCode || 401).json({
        error: auth.error || "Authentication required to verify checkout.",
      });
    }

    const userId = auth.user.id;
    const sessionId = (req.query.session_id as string) || req.body?.session_id;

    if (!sessionId) {
      return res.status(400).json({ error: "Missing session_id parameter." });
    }

    // 2. Secret Key Check
    const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY;
    if (!paymongoSecretKey) {
      return res.status(500).json({ error: "PAYMONGO_SECRET_KEY is not configured." });
    }

    // 3. Query PayMongo Checkout Session
    const authHeader = `Basic ${Buffer.from(`${paymongoSecretKey}:`).toString("base64")}`;
    const paymongoRes = await fetch(
      `https://api.paymongo.com/v1/checkout_sessions/${sessionId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: authHeader,
        },
      }
    );

    const paymongoData = await paymongoRes.json();

    if (!paymongoRes.ok) {
      console.error("❌ PayMongo session fetch error:", paymongoData);
      return res.status(paymongoRes.status).json({
        error: paymongoData.errors?.[0]?.detail || "Failed to retrieve checkout session.",
      });
    }

    const sessionAttrs = paymongoData.data?.attributes;
    const sessionMetadata = sessionAttrs?.metadata || {};
    const sessionUserId = sessionMetadata.user_id;

    // Security check: ensure session belongs to authenticated user
    if (sessionUserId && sessionUserId !== userId) {
      return res.status(403).json({
        error: "This checkout session belongs to another user account.",
      });
    }

    const payments = sessionAttrs?.payments || [];
    const hasPaidPayment = payments.some(
      (p: any) => p.attributes?.status === "paid"
    );
    const isPaid = sessionAttrs?.status === "paid" || hasPaidPayment;

    if (isPaid) {
      // 4. Update Supabase Profile to Student Pro
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          plan: "student_pro",
          subscription_status: "active",
          subscription_id: sessionId,
          ai_credits: 9999, // Unrestricted credits allocation
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        console.error("❌ Supabase profile upgrade error:", updateError);
        return res.status(500).json({
          error: "Payment succeeded on PayMongo, but failed to update user profile in database.",
        });
      }

      return res.status(200).json({
        ok: true,
        paid: true,
        plan: "student_pro",
        message: "Successfully upgraded to Student Pro!",
      });
    }

    return res.status(200).json({
      ok: true,
      paid: false,
      status: sessionAttrs?.status || "unpaid",
      message: "Checkout session is not yet paid.",
    });
  } catch (error: any) {
    console.error("❌ Verify Checkout Exception:", error);
    return res.status(500).json({
      error: "Internal server error verifying checkout: " + (error?.message || String(error)),
    });
  }
}
