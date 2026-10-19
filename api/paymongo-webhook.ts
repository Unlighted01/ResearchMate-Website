import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { supabase } from "./_utils/auth.js";

// ============================================
// PAYMONGO WEBHOOK HANDLER
// ============================================
// Receives payment events from PayMongo and activates Student Pro in Supabase.
// Includes double-check verification against PayMongo API.
// ============================================

const PAYMONGO_API_URL = "https://api.paymongo.com/v1/checkout_sessions";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
    const signatureHeader = req.headers["paymongo-signature"] as string | undefined;
    const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY;

    let signatureValid = false;

    // 1. Signature Verification attempt (if configured)
    if (webhookSecret && signatureHeader) {
      try {
        const parts = signatureHeader.split(",");
        let timestamp = "";
        let testSig = "";
        let liveSig = "";

        for (const part of parts) {
          const [k, v] = part.trim().split("=");
          if (k === "t") timestamp = v;
          if (k === "te") testSig = v;
          if (k === "li") liveSig = v;
        }

        let rawBody = "";
        if (typeof req.body === "string") {
          rawBody = req.body;
        } else if (req.body && typeof req.body === "object") {
          rawBody = JSON.stringify(req.body);
        }

        const payloadToSign = `${timestamp}.${rawBody}`;
        const computedHash = crypto
          .createHmac("sha256", webhookSecret)
          .update(payloadToSign)
          .digest("hex");

        signatureValid =
          (testSig && crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(testSig))) ||
          (liveSig && crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(liveSig)));
      } catch (sigErr) {
        console.warn("Signature calculation notice:", sigErr);
      }
    }

    // 2. Parse Event Payload
    const body = req.body;
    const eventType = body?.data?.attributes?.type;
    console.log(`📥 Received PayMongo Webhook Event: ${eventType}`);

    if (eventType === "checkout_session.payment.paid" || eventType === "payment.paid") {
      const eventData = body.data?.attributes?.data;
      const attributes = eventData?.attributes;
      const metadata = attributes?.metadata || {};
      let userId = metadata?.user_id;
      const sessionId = eventData?.id || attributes?.id;

      // 3. Independent Security Verification via PayMongo API
      // If signature couldn't be strictly verified (e.g. body-parser stringify differences),
      // verify the session directly against PayMongo's secure API.
      let isVerifiedPaid = signatureValid;

      if (!isVerifiedPaid && sessionId && paymongoSecretKey) {
        try {
          const authHeader = `Basic ${Buffer.from(`${paymongoSecretKey}:`).toString("base64")}`;
          const verifyRes = await fetch(`${PAYMONGO_API_URL}/${sessionId}`, {
            headers: {
              Accept: "application/json",
              Authorization: authHeader,
            },
          });

          if (verifyRes.ok) {
            const apiData = await verifyRes.json();
            const apiAttrs = apiData?.data?.attributes;
            const apiUserId = apiAttrs?.metadata?.user_id;
            const payments = apiAttrs?.payments || [];
            const hasPaid = payments.some((p: any) => p.attributes?.status === "paid");

            if (apiAttrs?.status === "paid" || hasPaid) {
              isVerifiedPaid = true;
              if (apiUserId) userId = apiUserId;
            }
          }
        } catch (apiErr) {
          console.error("Direct PayMongo API check error:", apiErr);
        }
      }

      if (isVerifiedPaid && userId) {
        console.log(`✅ Activating Student Pro for user: ${userId}`);
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            plan: "student_pro",
            subscription_status: "active",
            subscription_id: sessionId || "paymongo_paid",
            ai_credits: 9999,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (updateError) {
          console.error("❌ Failed to update profile in webhook:", updateError);
          return res.status(500).json({ error: "Database update failed." });
        }
      } else if (!isVerifiedPaid) {
        console.warn("⚠️ Webhook event could not be verified as paid.");
        return res.status(400).json({ error: "Unverified webhook event." });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("❌ PayMongo Webhook Exception:", error);
    return res.status(500).json({
      error: "Webhook error: " + (error?.message || String(error)),
    });
  }
}
