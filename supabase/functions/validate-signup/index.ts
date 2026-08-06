// @ts-nocheck
// Supabase Edge Function: validate-signup
// Server-side email validation — checks disposable/temporary email providers.
// Called from SignupPage.tsx before supabase.auth.signUp() to block throwaway inboxes.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Restrict CORS to your production origin.
// The ALLOWED_ORIGIN secret can override this for staging environments.
const getAllowedOrigin = () =>
  Deno.env.get("ALLOWED_ORIGIN") ||
  "https://researchmate.vercel.app";

const makeCorsHeaders = () => ({
  "Access-Control-Allow-Origin": getAllowedOrigin(),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge-side disposable domain blocklist (supplementary to the frontend list).
// The frontend blocklist catches Tier 1 providers instantly.
// This list adds less-common ones that may not be on the client bundle.
// ─────────────────────────────────────────────────────────────────────────────
const EDGE_BLOCKED_DOMAINS = new Set([
  "mailnull.com",
  "spamgourmet.com",
  "spamgourmet.net",
  "spamgourmet.org",
  "mailexpire.com",
  "spoofmail.de",
  "tempsky.com",
  "fakedemail.com",
  "thisisnotmyrealemail.com",
  "tmailinator.com",
  "trash-mail.com",
  "trashcanmail.com",
  "tempr.email",
  "zetmail.com",
  "mohmal.com",
  "gufum.com",
  "tafmail.com",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────
serve(async (req) => {
  const corsHeaders = makeCorsHeaders();

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ valid: false, reason: "method_not_allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ valid: false, reason: "invalid_format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const domain = email.split("@")[1]?.toLowerCase().trim();
    if (!domain) {
      return new Response(
        JSON.stringify({ valid: false, reason: "invalid_format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 1: Edge-side blocklist (instant, no external call) ───────────────
    if (EDGE_BLOCKED_DOMAINS.has(domain)) {
      console.log(`validate-signup: blocked domain '${domain}' (edge blocklist)`);
      return new Response(
        JSON.stringify({ valid: false, reason: "disposable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 2: Mailcheck.ai API (optional, catches unknown providers) ─────────
    const mailcheckKey = Deno.env.get("MAILCHECK_API_KEY") || "";
    if (mailcheckKey) {
      try {
        const res = await fetch(
          `https://api.mailcheck.ai/email/${encodeURIComponent(email)}`,
          {
            headers: { "x-api-key": mailcheckKey },
            signal: AbortSignal.timeout(3000), // 3s max — don't block signup if slow
          }
        );

        if (res.ok) {
          const data = await res.json();

          if (data.disposable === true) {
            console.log(`validate-signup: blocked '${domain}' via Mailcheck.ai`);
            return new Response(
              JSON.stringify({ valid: false, reason: "disposable" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // If deliverable check fails (no valid MX record), flag the email
          if (data.deliverable === false) {
            console.log(`validate-signup: undeliverable email '${domain}'`);
            return new Response(
              JSON.stringify({ valid: false, reason: "undeliverable" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (apiErr) {
        // API timeout or network error — fail OPEN so signup is never blocked
        // by a third-party outage
        console.warn("validate-signup: Mailcheck.ai unavailable, failing open:", apiErr);
      }
    }

    // ── All checks passed ──────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({ valid: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    // Fail open — a server error should never block a real user from signing up
    console.error("validate-signup: unhandled error:", e);
    return new Response(
      JSON.stringify({ valid: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
