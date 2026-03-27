// ============================================
// AI Summary Generator
// Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { authenticateUser, deductCredit, refundCredit } from "./_utils/auth.js";

// ============================================
// API KEY ROTATION HELPER
// ============================================

function getRandomGeminiKey(): string | undefined {
    const multipleKeys = process.env.GEMINI_API_KEYS;
    if (multipleKeys) {
        const keys = multipleKeys
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean);
        if (keys.length > 0) {
            return keys[Math.floor(Math.random() * keys.length)];
        }
    }
    return process.env.GEMINI_API_KEY;
}

// ============================================
// SUMMARIZATION PROMPT
// ============================================

const ITEM_SUMMARY_PROMPT = `Summarize the following document content in 2-4 concise, information-dense sentences.

Rules:
- Lead with the core finding, thesis, or main point — not filler like "This document discusses".
- Preserve critical specifics: names, numbers, key terms, conclusions.
- If it is academic/research content, mention the methodology and key result.
- If it is handwritten notes, extract and organize the key actionable points.
- NEVER hallucinate or add information not present in the text.

Text to summarize:
`;

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    let creditDeducted = false;
    let deductedUserId: string | null = null;

    try {
        const { itemId, text } = req.body;

        if (!itemId || !text) {
            return res.status(400).json({ error: "Item ID and Text are required" });
        }

        // 1. Authenticate Request
        const authResult = await authenticateUser(req);
        if (authResult.error) {
            return res.status(authResult.statusCode || 401).json({
                error: authResult.error,
                code: authResult.statusCode === 403 ? "NO_CREDITS" : "AUTH_ERROR",
            });
        }

        const openRouterKey = process.env.OPENROUTER_API_KEY;
        const claudeKey = process.env.OCR_API_KEY;
        const geminiKey = getRandomGeminiKey();

        // Fallback logic
        let summary: string | null = null;

        if (openRouterKey) {
            try {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${openRouterKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: "google/gemini-2.5-flash",
                        messages: [
                            {
                                role: "user",
                                content: `${ITEM_SUMMARY_PROMPT}${text}`,
                            },
                        ],
                        temperature: 0.3,
                        max_tokens: 300,
                    }),
                });
                if (response.ok) summary = (await response.json()).choices?.[0]?.message?.content || null;
            } catch (e) {
                console.error("OpenRouter Summary error:", e);
            }
        }

        if (!summary && geminiKey) {
            try {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: `${ITEM_SUMMARY_PROMPT}${text}` }] }],
                            generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
                        }),
                    }
                );
                if (response.ok) summary = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text || null;
            } catch (e) {
                console.error("Gemini Summary error:", e);
            }
        }

        if (!summary && claudeKey) {
            try {
                const response = await fetch("https://api.anthropic.com/v1/messages", {
                    method: "POST",
                    headers: {
                        "x-api-key": claudeKey,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    body: JSON.stringify({
                        model: "claude-3-5-sonnet-20241022",
                        max_tokens: 300,
                        temperature: 0.3,
                        messages: [{ role: "user", content: `${ITEM_SUMMARY_PROMPT}${text}` }],
                    }),
                });
                if (response.ok) summary = (await response.json()).content?.[0]?.text || null;
            } catch (e) {
                console.error("Claude Summary error:", e);
            }
        }

        if (!summary) {
            return res.status(500).json({ error: "All AI providers failed to generate summary." });
        }

        // Connect to Supabase and update the database row immediately
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        
        // Use the ADMIN key instead of the ANON key to securely bypass RLS 
        // because this is a protected serverless function that just verified the user's JWT.
        // Alternatively, we could set the user's session, but the Service Key is guaranteed to work for this background task.
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            await supabase
                .from("items")
                .update({ ai_summary: summary })
                .eq("id", itemId)
                .eq("user_id", authResult.user?.id); // Extra safety check to ensure they own the item
        } else {
            console.error("Supabase Environment Variables not found inside Vercel handler");
        }

        // Charge credit if on free tier
        if (authResult.isFreeTier && authResult.user?.id) {
            await deductCredit(authResult.user.id);
            creditDeducted = true;
            deductedUserId = authResult.user.id;
        }

        return res.status(200).json({ success: true, summary });
    } catch (error) {
        console.error("Summary handler error:", error);
        if (creditDeducted && deductedUserId) await refundCredit(deductedUserId);
        return res.status(500).json({ error: (error as Error).message });
    }
}
