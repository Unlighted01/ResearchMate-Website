import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, setCorsHeaders, supabase } from "./_utils/auth.js";

// ============================================
// PAYMONGO UNIFIED CHECKOUT & VERIFICATION ENDPOINT
// ============================================
// POST: Initiates hosted PayMongo checkout session for Student Pro (₱199.00)
// GET / POST (with verify/session_id): Verifies payment status and upgrades user to Student Pro
// ============================================

const PAYMONGO_API_URL = "https://api.paymongo.com/v1/checkout_sessions";
const PAYMONGO_PAYMENTS_URL = "https://api.paymongo.com/v1/payments";

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
      let rawSessionId =
        (req.query.session_id as string) ||
        (req.query.sessionId as string) ||
        req.body?.session_id ||
        req.body?.sessionId;

      // Filter out invalid placeholder strings
      if (rawSessionId === "{CHECKOUT_SESSION_ID}" || rawSessionId === "undefined" || rawSessionId === "null") {
        rawSessionId = undefined;
      }

      // If no session_id provided, look up user's pending subscription_id from database
      if (!rawSessionId) {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("subscription_id, subscription_status")
          .eq("id", userId)
          .single();

        if (userProfile?.subscription_id) {
          rawSessionId = userProfile.subscription_id;
        }
      }

      let isPaid = false;
      let matchedSessionId = rawSessionId || "verified_payment";

      // Method 1: Check checkout session by ID (if candidate ID exists)
      if (rawSessionId) {
        const candidateIds = [rawSessionId];
        if (!rawSessionId.startsWith("cs_")) {
          candidateIds.push(`cs_${rawSessionId}`);
        } else {
          candidateIds.push(rawSessionId.replace(/^cs_/, ""));
        }

        for (const idToTry of candidateIds) {
          try {
            const paymongoRes = await fetch(`${PAYMONGO_API_URL}/${idToTry}`, {
              method: "GET",
              headers: {
                Accept: "application/json",
                Authorization: authHeader,
              },
            });

            if (paymongoRes.ok) {
              const paymongoData = await paymongoRes.json();
              const sessionAttrs = paymongoData.data?.attributes;
              const payments = sessionAttrs?.payments || [];
              const hasPaidPayment = payments.some(
                (p: any) => p.attributes?.status === "paid"
              );

              if (sessionAttrs?.status === "paid" || hasPaidPayment) {
                isPaid = true;
                matchedSessionId = paymongoData.data?.id || idToTry;
                break;
              }
            }
          } catch {}
        }
      }

      // Method 2: Fallback reconciliation via recent payments (matches user's email or metadata)
      if (!isPaid && userEmail) {
        try {
          const paymentsRes = await fetch(`${PAYMONGO_PAYMENTS_URL}?limit=15`, {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: authHeader,
            },
          });

          if (paymentsRes.ok) {
            const paymentsData = await paymentsRes.json();
            const recentPayments = paymentsData?.data || [];

            const matchedPayment = recentPayments.find((p: any) => {
              const attrs = p.attributes;
              const matchesEmail = attrs?.billing?.email?.toLowerCase() === userEmail.toLowerCase();
              const matchesUser = attrs?.metadata?.user_id === userId;
              const isStatusPaid = attrs?.status === "paid";
              return isStatusPaid && (matchesEmail || matchesUser);
            });

            if (matchedPayment) {
              isPaid = true;
              matchedSessionId = matchedPayment.id || matchedSessionId;
            }
          }
        } catch (paymentErr) {
          console.warn("Fallback payments API check notice:", paymentErr);
        }
      }

      if (isPaid) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            plan: "student_pro",
            subscription_status: "active",
            subscription_id: matchedSessionId,
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
          session_id: matchedSessionId,
          message: "Successfully upgraded to Student Pro!",
        });
      }

      return res.status(200).json({
        ok: true,
        paid: false,
        message: "No paid transaction found yet. Please make sure the payment completed.",
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
      "https://research-mate-website.vercel.app";
    const cleanOrigin = origin.replace(/\/+$/, "");

    // Clean URL without unsupported template placeholders
    const successUrl = `${cleanOrigin}/#/app/settings?tab=account&payment=success`;
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

    // Save pending session ID to user profile
    if (sessionId) {
      try {
        await supabase
          .from("profiles")
          .update({
            subscription_id: sessionId,
            subscription_status: "pending_payment",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      } catch (dbErr) {
        console.warn("Could not record pending session to profile:", dbErr);
      }
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
