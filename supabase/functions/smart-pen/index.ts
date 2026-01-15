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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
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
      const imageBase64 = encodeBase64(imageBytes);

      console.log("Received image:", imageBytes.length, "bytes");

      // Save to Storage
      const filename = `smart-pen/scan_${Date.now()}.bmp`;
      await supabase.storage
        .from("scans")
        .upload(filename, imageBuffer, { contentType: "image/bmp" });

      const { data: urlData } = supabase.storage
        .from("scans")
        .getPublicUrl(filename);
      const imageUrl = urlData?.publicUrl || "";

      // OCR with Gemini
      let ocrText = "";
      let summary = "";

      if (geminiApiKey) {
        console.log("Calling Gemini API...");
        console.log("Image size:", imageBytes.length, "bytes");

        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        inline_data: {
                          mime_type: "image/bmp",
                          data: imageBase64,
                        },
                      },
                      {
                        text: 'Extract ALL text from this image. Return JSON: {"text": "extracted text", "summary": "brief 1-sentence summary"}',
                      },
                    ],
                  },
                ],
              }),
            }
          );

          const data = await res.json();
          console.log("Gemini response status:", res.status);
          console.log(
            "Gemini response:",
            JSON.stringify(data).substring(0, 500)
          );

          if (data.error) {
            console.error("Gemini API error:", data.error);
          }

          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          console.log("Extracted text:", text.substring(0, 200));

          try {
            const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");
            ocrText = parsed.text || text;
            summary = parsed.summary || "";
          } catch (parseErr) {
            console.log("JSON parse failed, using raw text");
            ocrText = text;
          }
        } catch (fetchErr) {
          console.error("Gemini fetch error:", fetchErr);
        }
      } else {
        console.log("No GEMINI_API_KEY found!");
      }

      // Save to items table
      const itemData: Record<string, any> = {
        text: ocrText || "Smart Pen Scan",
        source_title: `Scan ${new Date().toLocaleString()}`,
        device_source: "smart_pen",
        image_url: imageUrl,
        ocr_text: ocrText,
        ai_summary: summary,
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

      return new Response(
        JSON.stringify({
          success: true,
          image_url: imageUrl,
          ocr_text: ocrText,
          summary: summary,
          item_id: item?.id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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

      await supabase.from("pairing_codes").upsert({
        code,
        pen_id: penId,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        used: false,
      });

      console.log(`Generated code ${code} for pen ${penId}`);

      return new Response(
        JSON.stringify({ success: true, code, pen_id: penId, expires_in: 300 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Confirm pairing (from website)
    if (action === "confirm") {
      const { code, user_id } = body;

      if (!code || !user_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing code or user_id" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: codeData, error: codeError } = await supabase
        .from("pairing_codes")
        .select("*")
        .eq("code", code)
        .eq("used", false)
        .single();

      if (
        codeError ||
        !codeData ||
        new Date(codeData.expires_at) < new Date()
      ) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid or expired code" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const authToken = crypto.randomUUID();

      await supabase.from("paired_pens").upsert({
        pen_id: codeData.pen_id,
        user_id: user_id,
        auth_token: authToken,
        paired_at: new Date().toISOString(),
      });

      await supabase
        .from("pairing_codes")
        .update({ used: true })
        .eq("code", code);

      console.log(`Paired pen ${codeData.pen_id} to user ${user_id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Paired!",
          pen_id: codeData.pen_id,
          auth_token: authToken,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
            JSON.stringify({
              success: true,
              paired: true,
              auth_token: pairData.auth_token,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(JSON.stringify({ success: true, paired: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
