// @ts-nocheck
// Supabase Edge Function: smart-pen
// Combined handler for pairing and scanning

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const JPEG_MAGIC = [0xff, 0xd8, 0xff];   // JPEG magic bytes

// Configurable via Supabase secret; falls back to known URL
const VERCEL_OCR_URL =
  Deno.env.get("VERCEL_OCR_URL") ||
  "https://research-mate-website.vercel.app/api/ocr";

// ============================================
// HELPER FUNCTIONS
// ============================================

function isValidJpeg(bytes: Uint8Array): boolean {
  return (
    bytes.length > 3 &&
    bytes[0] === JPEG_MAGIC[0] &&
    bytes[1] === JPEG_MAGIC[1] &&
    bytes[2] === JPEG_MAGIC[2]
  );
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const contentType = req.headers.get("content-type") || "";

    // ============================================
    // SCAN: Receive image upload (binary data)
    // ============================================
    if (contentType.includes("image/")) {
      const authToken = url.searchParams.get("token") || "";

      // Verify auth token
      const { data: penData } = await supabase
        .from("paired_pens")
        .select("user_id")
        .eq("auth_token", authToken)
        .single();

      const userId = penData?.user_id || null;

      const imageBuffer = await req.arrayBuffer();
      const imageBytes = new Uint8Array(imageBuffer);

      console.log("Received image:", imageBytes.length, "bytes");

      // Validate image size
      if (imageBytes.length > MAX_IMAGE_BYTES) {
        return new Response(
          JSON.stringify({ success: false, error: "Image too large (max 10MB)" }),
          { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Validate JPEG magic bytes
      if (!isValidJpeg(imageBytes)) {
        console.error("❌ Rejected upload: not a valid JPEG");
        return new Response(
          JSON.stringify({ success: false, error: "Invalid image format. Expected JPEG." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const imageBase64 = encodeBase64(imageBytes);

      // Save to Storage as JPEG (not BMP — avoids unnecessary re-encoding)
      const filename = `smart-pen/scan_${crypto.randomUUID()}.jpg`;
      await supabase.storage
        .from("scans")
        .upload(filename, imageBuffer, { contentType: "image/jpeg" });

      const { data: urlData } = supabase.storage
        .from("scans")
        .getPublicUrl(filename);
      const imageUrl = urlData?.publicUrl || "";

      // Forward to Vercel OCR API
      let ocrText = "";
      let ocrFailed = false;
      let ocrError = "";

      console.log(`Routing image payload to centralized OCR: ${VERCEL_OCR_URL}`);

      try {
        const ocrResponse = await fetch(VERCEL_OCR_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: `data:image/jpeg;base64,${imageBase64}`,
            includeSummary: false,
          }),
        });

        const ocrData = await ocrResponse.json();

        if (ocrResponse.ok && ocrData.success) {
          console.log(
            `✅ OCR succeeded — provider: ${ocrData.ocrProvider}, confidence: ${ocrData.ocrConfidence}%`,
          );
          ocrText = ocrData.ocrText;
        } else {
          ocrFailed = true;
          ocrError = ocrData.error || `HTTP ${ocrResponse.status}`;
          console.error("❌ Vercel OCR route failed:", ocrError);
        }
      } catch (err) {
        ocrFailed = true;
        ocrError = (err as Error).message;
        console.error("❌ Failed to reach Vercel OCR:", ocrError);
      }

      // Save to items table — flag failed OCR so the UI can show an error state
      const itemData: Record<string, unknown> = {
        text: ocrText || "",
        source_title: `Scan ${new Date().toLocaleString()}`,
        device_source: "smart_pen",
        image_url: imageUrl,
        ocr_text: ocrText,
        ocr_failed: ocrFailed,
        ocr_error: ocrFailed ? ocrError : null,
        ai_summary: null,
        tags: [],
        note: "",
      };

      if (userId) {
        itemData.user_id = userId;
      }

      const { data: item, error: dbError } = await supabase
        .from("items")
        .insert(itemData)
        .select()
        .single();

      if (dbError) console.error("DB Error:", dbError);

      // Return error status if OCR failed so the pen/client knows
      if (ocrFailed) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `OCR failed: ${ocrError}`,
            image_url: imageUrl,
            item_id: item?.id,
          }),
          {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          image_url: imageUrl,
          ocr_text: ocrText,
          item_id: item?.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ============================================
    // PAIRING: JSON body with action
    // ============================================
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // Generate pairing code
    if (action === "start") {
      const penId = body.pen_id || `pen_${Date.now()}`;
      const code = String(Math.floor(100000 + Math.random() * 900000));

      // Delete any existing unused codes for this pen (e.g. after factory reset)
      await supabase
        .from("pairing_codes")
        .delete()
        .eq("pen_id", penId)
        .eq("used", false);

      await supabase.from("pairing_codes").insert({
        code,
        pen_id: penId,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        used: false,
      });

      console.log(`Generated code ${code} for pen ${penId}`);

      return new Response(
        JSON.stringify({ success: true, code, pen_id: penId, expires_in: 300 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Confirm pairing (from website)
    if (action === "confirm") {
      const { code, user_id } = body;

      if (!code || !user_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing code or user_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: codeData, error: codeError } = await supabase
        .from("pairing_codes")
        .select("*")
        .eq("code", code)
        .eq("used", false)
        .single();

      if (codeError || !codeData || new Date(codeData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid or expired code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const authToken = crypto.randomUUID();

      await supabase.from("paired_pens").upsert({
        pen_id: codeData.pen_id,
        user_id: user_id,
        auth_token: authToken,
        paired_at: new Date().toISOString(),
      });

      await supabase.from("pairing_codes").update({ used: true }).eq("code", code);

      console.log(`Paired pen ${codeData.pen_id} to user ${user_id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Paired!",
          pen_id: codeData.pen_id,
          auth_token: authToken,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // List paired pens (from website/extension)
    if (action === "list") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing user_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: pens, error } = await supabase
        .from("paired_pens")
        .select("*")
        .eq("user_id", user_id);

      return new Response(
        JSON.stringify({ success: !error, pens, error: error?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Unpair pen (from website/extension)
    if (action === "unpair") {
      const { pen_id } = body;
      const { error } = await supabase
        .from("paired_pens")
        .delete()
        .eq("pen_id", pen_id);

      return new Response(
        JSON.stringify({ success: !error, error: error?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check pairing status (from pen)
    if (action === "status") {
      const { pen_id, code } = body;

      const { data: codeData } = await supabase
        .from("pairing_codes")
        .select("used")
        .eq("code", code)
        .single();

      if (codeData?.used) {
        const { data: pairData } = await supabase
          .from("paired_pens")
          .select("auth_token")
          .eq("pen_id", pen_id)
          .single();

        if (pairData) {
          return new Response(
            JSON.stringify({ success: true, paired: true, auth_token: pairData.auth_token }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true, paired: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
