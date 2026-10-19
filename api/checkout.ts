import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, setCorsHeaders, supabase } from "./_utils/auth.js";

// ============================================
// PAYMONGO UNIFIED CHECKOUT & VERIFICATION ENDPOINT
// ============================================
// POST: Initiates hosted PayMongo checkout session for Student Pro (₱199.00)
// GET / POST (with session_id): Verifies payment status and upgrades user to Student Pro
// ============================================

const PAYMONGO_API_URL = "https://api.paymongo.com/v1/checkout_sessions";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 1. Authenticate user
  const auth = await authenticateUser(req);
  if (!auth.user) {
    return res.status(auth.statusCode || 401).json({
      error: auth.error || "Authentication required.",
    });
  }

  const userId = auth.user.id;
  const userEmail = auth.user.email || "";

  // 2. Secret Key Check
  const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!paymongoSecretKey) {
    console.error("❌ Missing PAYMONGO_SECRET_KEY environment variable");
    return res.status(500).json({
      error: "Payment gateway is not configured on the server. Please check environment variables.",
    });
  }

  const authHeader = `Basic ${Buffer.from(`${paymongoSecretKey}:`).toString("base64")}`;

  // ============================================================
  // VERIFICATION FLOW (GET or POST with session_id / verify action)
  // ============================================================
  const isVerify =
    req.method === "GET" ||
    (req.method === "POST" && (req.body?.action === "verify" || (req.body?.session_id && !req.body?.plan)));

  if (isVerify) {
    try {
      const sessionId = (req.query.session_id as string) || req.body?.session_id;

      if (!sessionId) {
        return res.status(400).json({ error: "Missing session_id parameter." });
      }

      const paymongoRes = await fetch(
        `${PAYMONGO_API_URL}/${sessionId}`,
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

  // ============================================================
  // CHECKOUT CREATION FLOW (POST)
  // ============================================================
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use GET or POST." });
  }

  try {
    // Resolve user profile for customer name
    let userName = "ResearchMate Student";
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();
      if (profile?.full_name) {
        userName = profile.full_name;
      }
    } catch {
      // Fallback name is acceptable
    }

    // Resolve Site Base URL for redirection
    const origin =
      (req.headers.origin as string) ||
      process.env.VITE_SITE_URL ||
      "https://researchmate.vercel.app";
    const cleanOrigin = origin.replace(/\/+$/, "");

    const successUrl = `${cleanOrigin}/#/app/settings?tab=account&payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${cleanOrigin}/#/app/settings?tab=account&payment=cancelled`;

    // PayMongo Payload (₱199.00 = 19900 centavos)
    const payload = {
      data: {
        attributes: {
          billing: {
            name: userName,
            email: userEmail,
          },
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          line_items: [
            {
              currency: "PHP",
              amount: 19900, // ₱199.00
              name: "ResearchMate Student Pro",
              quantity: 1,
              description:
                "Unlimited AI Study Companion, LaTeX STEM Derivations, and Model Reasoning",
            },
          ],
          payment_method_types: [
            "gcash",
            "paymaya",
            "card",
            "grab_pay",
            "dob",
          ],
          success_url: successUrl,
          cancel_url: cancelUrl,
          description: "ResearchMate Student Pro Monthly Plan",
          metadata: {
            user_id: userId,
            plan: "student_pro",
          },
        },
      },
    };

    const paymongoRes = await fetch(PAYMONGO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    const paymongoData = await paymongoRes.json();

    if (!paymongoRes.ok) {
      console.error("❌ PayMongo Checkout Creation Error:", JSON.stringify(paymongoData));
      const firstError = paymongoData.errors?.[0]?.detail || "Failed to create checkout session";
      return res.status(paymongoRes.status).json({
        error: firstError,
        details: paymongoData.errors,
      });
    }

    const checkoutUrl = paymongoData.data?.attributes?.checkout_url;
    const sessionId = paymongoData.data?.id;

    if (!checkoutUrl) {
      return res.status(502).json({
        error: "PayMongo did not return a valid checkout URL.",
      });
    }

    return res.status(200).json({
      ok: true,
      checkout_url: checkoutUrl,
      session_id: sessionId,
    });
  } catch (error: any) {
    console.error("❌ Create Checkout Exception:", error);
    return res.status(500).json({
      error: "Internal server error creating payment session: " + (error?.message || String(error)),
    });
  }
}
