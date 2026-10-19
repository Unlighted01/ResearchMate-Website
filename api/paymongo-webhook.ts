import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { supabase } from "./_utils/auth.js";

// ============================================
// PAYMONGO WEBHOOK HANDLER
// ============================================
// Receives asynchronous payment confirmation events from PayMongo
// and activates Student Pro in Supabase.
// ============================================

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

    // 1. Signature Verification (if webhook secret is configured)
    if (webhookSecret && signatureHeader) {
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

      // Read raw body string
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

      const matches =
        (testSig && crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(testSig))) ||
        (liveSig && crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(liveSig)));

      if (!matches) {
        console.warn("⚠️ PayMongo webhook signature mismatch");
        return res.status(400).json({ error: "Invalid webhook signature." });
      }
    } else if (!webhookSecret) {
      console.warn("⚠️ PAYMONGO_WEBHOOK_SECRET not set, proceeding without signature verification in development.");
    }

    // 2. Parse Event
    const body = req.body;
    const eventType = body?.data?.attributes?.type;
    console.log(`📥 Received PayMongo Webhook Event: ${eventType}`);

    if (eventType === "checkout_session.payment.paid" || eventType === "payment.paid") {
      const eventData = body.data?.attributes?.data;
      const attributes = eventData?.attributes;
      const metadata = attributes?.metadata || {};
      const userId = metadata?.user_id;
      const sessionId = eventData?.id || attributes?.id;

      if (userId) {
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
      } else {
        console.warn("⚠️ Webhook event missing user_id in metadata:", metadata);
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
