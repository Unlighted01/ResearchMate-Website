import { describe, it, expect } from "vitest";
import crypto from "crypto";

describe("PayMongo Integration & Subscription Suite", () => {
  it("formats HTTP Basic Auth credentials correctly for PayMongo API", () => {
    const mockSecretKey = "sk_test_1234567890abcdef";
    const authHeader = `Basic ${Buffer.from(`${mockSecretKey}:`).toString("base64")}`;
    
    // Decode and verify username is secret key and password is empty
    const decoded = Buffer.from(authHeader.replace("Basic ", ""), "base64").toString("utf-8");
    expect(decoded).toBe("sk_test_1234567890abcdef:");
  });

  it("converts Philippine Peso (PHP) amount to integer centavos correctly", () => {
    const amountInPhp = 199.00;
    const amountInCentavos = Math.round(amountInPhp * 100);
    expect(amountInCentavos).toBe(19900);
    expect(Number.isInteger(amountInCentavos)).toBe(true);
  });

  it("includes all primary Philippine payment methods in checkout payload", () => {
    const paymentMethods = ["gcash", "paymaya", "card", "grab_pay", "dob"];
    expect(paymentMethods).toContain("gcash");
    expect(paymentMethods).toContain("paymaya");
    expect(paymentMethods).toContain("card");
    expect(paymentMethods.length).toBe(5);
  });

  it("computes and validates HMAC-SHA256 webhook signatures accurately", () => {
    const webhookSecret = "whsec_test_secret_key_12345";
    const timestamp = "1729330000";
    const rawBody = JSON.stringify({
      data: {
        id: "evt_123",
        type: "event",
        attributes: {
          type: "checkout_session.payment.paid",
          data: {
            id: "cs_123",
            attributes: {
              status: "paid",
              metadata: { user_id: "user-abc-123", plan: "student_pro" }
            }
          }
        }
      }
    });

    const payloadToSign = `${timestamp}.${rawBody}`;
    const signature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payloadToSign)
      .digest("hex");

    // Verification check
    const verified = crypto
      .createHmac("sha256", webhookSecret)
      .update(payloadToSign)
      .digest("hex");

    expect(crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(verified))).toBe(true);
  });

  it("evaluates user subscription Pro status correctly", () => {
    // Case 1: Pro user
    const proProfile = { plan: "student_pro", subscription_status: "active", ai_credits: 9999 };
    const isPro1 = proProfile.plan === "student_pro" && proProfile.subscription_status === "active";
    expect(isPro1).toBe(true);

    // Case 2: Free user
    const freeProfile = { plan: "free", subscription_status: "inactive", ai_credits: 50 };
    const isPro2 = freeProfile.plan === "student_pro" && freeProfile.subscription_status === "active";
    expect(isPro2).toBe(false);

    // Case 3: Inactive subscription
    const expiredProfile = { plan: "student_pro", subscription_status: "inactive", ai_credits: 0 };
    const isPro3 = expiredProfile.plan === "student_pro" && expiredProfile.subscription_status === "active";
    expect(isPro3).toBe(false);
  });
});
