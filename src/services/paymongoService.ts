// ============================================
// PAYMONGO CLIENT SERVICE
// ============================================
// Handles Student Pro subscription checkout, payment verification,
// and subscription status checks on ResearchMate.
// ============================================

import { supabase } from "./supabaseClient";

const API_BASE_URL = typeof window !== "undefined" && window.location.hostname === "localhost"
  ? "/api"
  : "/api";

export interface UserSubscriptionStatus {
  isPro: boolean;
  plan: string;
  subscriptionStatus: string;
  aiCredits: number;
}

/**
 * Initiates the PayMongo Hosted Checkout flow for Student Pro (₱199.00).
 * Redirects the user directly to PayMongo's secure payment page.
 */
export async function initiateStudentProCheckout(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("You must be signed in to upgrade to Student Pro.");
  }

  const response = await fetch(`${API_BASE_URL}/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      plan: "student_pro",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to create checkout session. Please try again.");
  }

  if (data.session_id) {
    try {
      localStorage.setItem("researchmate_pending_checkout_session", data.session_id);
    } catch {}
  }

  if (data.checkout_url) {
    // Redirect student to PayMongo secure payment page (GCash, Maya, Card)
    window.location.href = data.checkout_url;
  } else {
    throw new Error("PayMongo did not return a valid payment link.");
  }
}

/**
 * Verifies a completed checkout session upon redirect from PayMongo
 * or when checking payment reconciliation.
 */
export async function verifyPaymentSession(
  sessionId?: string
): Promise<{ ok: boolean; paid: boolean; message?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, paid: false, message: "No active session found." };
  }

  let targetId = sessionId;
  if (!targetId || targetId === "{CHECKOUT_SESSION_ID}") {
    try {
      targetId = localStorage.getItem("researchmate_pending_checkout_session") || undefined;
    } catch {}
  }

  const query = targetId ? `?session_id=${encodeURIComponent(targetId)}` : "";

  try {
    const response = await fetch(
      `${API_BASE_URL}/checkout${query}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const data = await response.json();
    if (data.paid) {
      try {
        localStorage.removeItem("researchmate_pending_checkout_session");
      } catch {}
    }

    return {
      ok: response.ok,
      paid: Boolean(data.paid),
      message: data.message || data.error,
    };
  } catch (err: any) {
    console.error("❌ Verify payment session network error:", err);
    return { ok: false, paid: false, message: err?.message || "Verification request failed." };
  }
}

/**
 * Fetches the current user's plan and subscription status from Supabase.
 */
export async function getUserSubscriptionStatus(): Promise<UserSubscriptionStatus> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        isPro: false,
        plan: "free",
        subscriptionStatus: "inactive",
        aiCredits: 0,
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, subscription_status, ai_credits")
      .eq("id", user.id)
      .single();

    const plan = profile?.plan || "free";
    const status = profile?.subscription_status || "inactive";
    const isPro = plan === "student_pro" && (status === "active" || status === "trialing");

    return {
      isPro,
      plan,
      subscriptionStatus: status,
      aiCredits: profile?.ai_credits ?? 50,
    };
  } catch (error) {
    console.error("❌ Failed to fetch user subscription status:", error);
    return {
      isPro: false,
      plan: "free",
      subscriptionStatus: "inactive",
      aiCredits: 50,
    };
  }
}
