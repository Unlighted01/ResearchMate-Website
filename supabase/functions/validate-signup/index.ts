// @ts-nocheck
// Supabase Edge Function: validate-signup
// Server-side email validation — checks disposable/temporary email providers.
// Called from SignupPage.tsx before supabase.auth.signUp() to block throwaway inboxes.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const getAllowedOrigin = () =>
  Deno.env.get("ALLOWED_ORIGIN") ||
  "*";

const makeCorsHeaders = () => ({
  "Access-Control-Allow-Origin": getAllowedOrigin(),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

const EDGE_BLOCKED_DOMAINS = new Set([
  "copawoke.com",
  "vafab.com",
  "baxob.com",
  "xzsnh.com",
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

    const cleanEmail = email.trim().toLowerCase();
    const domain = cleanEmail.split("@")[1];

    if (!domain) {
      return new Response(
        JSON.stringify({ valid: false, reason: "invalid_format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 1: Edge-side blocklist ──────────────────────────────────────────
    if (EDGE_BLOCKED_DOMAINS.has(domain)) {
      console.log(`validate-signup: blocked domain '${domain}' (edge blocklist)`);
      return new Response(
        JSON.stringify({ valid: false, reason: "disposable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 2: Free Public API check (Debounce.io) ──────────────────────────
    try {
      const res = await fetch(
        `https://disposable.debounce.io/?email=${encodeURIComponent(cleanEmail)}`,
        { signal: AbortSignal.timeout(2500) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.disposable === "true" || data?.disposable === true) {
          console.log(`validate-signup: blocked '${cleanEmail}' via Debounce.io`);
          return new Response(
            JSON.stringify({ valid: false, reason: "disposable" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (debounceErr) {
      console.warn("validate-signup: Debounce API timeout/error:", debounceErr);
    }

    // ── Step 3: Mailcheck.ai API (fallback/secondary) ──────────────────────
    try {
      const mailcheckKey = Deno.env.get("MAILCHECK_API_KEY") || "";
      const res = await fetch(
        `https://api.mailcheck.ai/email/${encodeURIComponent(cleanEmail)}`,
        {
          headers: mailcheckKey ? { "x-api-key": mailcheckKey } : {},
          signal: AbortSignal.timeout(2500),
        }
      );

      if (res.ok) {
        const data = await res.json();

        if (data.disposable === true) {
          console.log(`validate-signup: blocked '${cleanEmail}' via Mailcheck.ai`);
          return new Response(
            JSON.stringify({ valid: false, reason: "disposable" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (data.deliverable === false) {
          console.log(`validate-signup: undeliverable email '${cleanEmail}'`);
          return new Response(
            JSON.stringify({ valid: false, reason: "undeliverable" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (mcErr) {
      console.warn("validate-signup: Mailcheck API timeout/error:", mcErr);
    }

    // ── All checks passed ──────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({ valid: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("validate-signup: unhandled error:", e);
    return new Response(
      JSON.stringify({ valid: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
