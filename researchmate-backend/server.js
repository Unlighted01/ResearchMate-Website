// ============================================
// RESEARCHMATE BACKEND PROXY
// Securely handles Gemini API calls with JWT Auth & Rate Limiting
// ============================================

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// SYSTEM INSTRUCTIONS (GUARDRAILS)
// ============================================
const SYSTEM_INSTRUCTION = `
You are ResearchMate, an intelligent academic assistant.

Summarize the following text intelligently.

Instructions:
1. First determine what kind of content it is.
2. If it is:
   - An article → Provide overview + key points
   - Research/academic → Provide thesis + findings + implications
   - Poem/literary → Summarize theme, tone, and message
   - List/notes → Organize and condense clearly
   - Random/informal → Extract core meaning

Length Rules:
- If text < 300 words → 30–40% of original length
- If text 300–1500 words → 150–250 words
- If text > 1500 words → 250–400 words

Advanced Reasoning (Internal Monologue):
- Perform a "Chain-of-Thought" analysis: identifying the core argument, supporting evidence, and tone.
- Conduct a "Self-evaluation pass": Check if the summary is too shallow or misses key nuance. Refine if necessary.
- Check for hallucinations: Ensure all points are supported by the text.

Output Structure:
- Short heading: [Content Type]
- Structured summary (paragraph + bullet points if appropriate)

STRICT GUARDRAILS:
1. ONLY answer questions related to research, science, academic writing, or the text provided.
2. If the user asks about general topics (e.g., "tell me a joke", "who won the game", "write a poem"), politely REFUSE.
   Response: "I am ResearchMate, designed only for academic and research assistance. I cannot help with off-topic queries."
3. Keep answers professional, concise, and objective.
4. Do not hallucinatie citations. If you don't know, say so.
`.trim();

// ============================================
// SUPABASE ADMIN CLIENT
// ============================================
// Needed to verify JWTs and deduct credits efficiently
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // MUST use Service Role Key for Admin tasks

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Supabase URL or Service Role Key missing!");
  // We don't exit here to allow local dev without full env if needed, but warn heavily
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// KEY ROTATION SYSTEM
// ============================================

// Load keys from CSV string (key1,key2,key3)
const RAW_KEYS = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY;
let API_KEYS = [];
if (RAW_KEYS) {
  API_KEYS = RAW_KEYS.split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  console.log(`✅ Loaded ${API_KEYS.length} Gemini API Key(s) for rotation.`);
} else {
  console.error("❌ GEMINI_API_KEYS is not set!");
}

function getRandomKey() {
  if (API_KEYS.length === 0) return null;
  return API_KEYS[Math.floor(Math.random() * API_KEYS.length)];
}

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";

// ============================================
// MIDDLEWARE
// ============================================

app.use(
  cors({
    origin: [
      process.env.VITE_SITE_URL,
      "http://localhost:5173", // Vite default
      "http://127.0.0.1:5173",
      "https://researchmate-website.vercel.app", // Allow Vercel Frontend
      // Add your Vercel URL here after deployment if different
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-custom-api-key"],
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));

// --------------------------------------------
// AUTH & CREDIT CHECK MIDDLEWARE
// --------------------------------------------
const requireAuthAndCredits = async (req, res, next) => {
  try {
    // 1. Check for Custom API Key (BYOK Bypass)
    const customKey = req.headers["x-custom-api-key"];
    if (customKey && customKey.startsWith("AIz")) {
      console.log("⚡ Using User's Custom API Key (Bypassing Limits)");
      req.geminiKey = customKey; // Use user's key
      req.isFreeTier = false;
      return next(); // Skip credit check
    }

    // 2. Extract JWT Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Missing or invalid authorization header" });
    }
    const token = authHeader.split(" ")[1];

    // 3. Verify Token with Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res
        .status(401)
        .json({ error: "Invalid or expired session token" });
    }

    // 4. Check Credits in Database
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("ai_credits")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return res.status(500).json({ error: "Failed to fetch user profile" });
    }

    // Default to 0 if null
    const credits = profile ? profile.ai_credits || 0 : 0;

    if (credits <= 0) {
      return res.status(403).json({
        error: "Out of AI Credits",
        code: "NO_CREDITS",
        credits: 0,
      });
    }

    // 5. Attach User & System Key to Request
    req.user = user;
    req.currentCredits = credits;
    req.geminiKey = getRandomKey(); // Use one of our pooled keys
    req.isFreeTier = true; // Mark to deduct credit later

    if (!req.geminiKey) {
      return res
        .status(500)
        .json({ error: "Server misconfiguration: No API keys available." });
    }

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res.status(500).json({ error: "Internal Server Authentication Error" });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

async function callGeminiAPI(prompt, apiKey, options = {}) {
  const url = `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  // Prepend System Instruction to the user prompt
  const fullPrompt = `${SYSTEM_INSTRUCTION}\n\nUSER REQUEST:\n${prompt}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: fullPrompt }],
      },
    ],
    generationConfig: {
      temperature: options.temperature || 0.3,
      maxOutputTokens: options.maxTokens || 1024,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Gemini API error: ${response.status}`,
    );
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

// --------------------------------------------
// UTILITY: Deduct Credit
// --------------------------------------------
async function deductCredit(userId, currentCredits) {
  // Simple update for now. In production, use an RPC or transaction for thread safety.
  const { error } = await supabase
    .from("profiles")
    .update({ ai_credits: Math.max(0, currentCredits - 1) })
    .eq("id", userId);

  if (error)
    console.error(`Failed to deduct credit for user ${userId}:`, error);
  return currentCredits - 1;
}

// ============================================
// API ROUTES
// ============================================

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", type: "secure-proxy-v2" });
});

// --------------------------------------------
// SECURE ROUTES (Wrapped with Auth)
// --------------------------------------------

// Generate summary
app.post("/api/summarize", requireAuthAndCredits, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    // Note: System Instruction is prepended in callGeminiAPI
    const prompt = `Summarize this text following the system instructions:\n\n${text}`;
    const summary = await callGeminiAPI(prompt, req.geminiKey, {
      temperature: 0.5,
    });

    let remaining = "Unlimited";
    if (req.isFreeTier) {
      remaining = await deductCredit(req.user.id, req.currentCredits);
    }

    res.json({ summary, credits_remaining: remaining });
  } catch (error) {
    console.error("Summarize error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Generate tags
app.post("/api/generate-tags", requireAuthAndCredits, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    const prompt = `Generate 3-5 lowercase, comma-separated tags for this text:\n\n${text}`;
    const tagsText = await callGeminiAPI(prompt, req.geminiKey, {
      temperature: 0.3,
    });
    const tags = tagsText
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    let remaining = "Unlimited";
    if (req.isFreeTier) {
      remaining = await deductCredit(req.user.id, req.currentCredits);
    }

    res.json({ tags, credits_remaining: remaining });
  } catch (error) {
    console.error("Generate tags error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Extract insights
app.post("/api/insights", requireAuthAndCredits, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    const prompt = `Extract exactly 5 bullet points of key insights from this text:\n\n${text}`;
    const insights = await callGeminiAPI(prompt, req.geminiKey, {
      temperature: 0.5,
    });

    let remaining = "Unlimited";
    if (req.isFreeTier) {
      remaining = await deductCredit(req.user.id, req.currentCredits);
    }

    res.json({ insights, credits_remaining: remaining });
  } catch (error) {
    console.error("Insights error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Chat with AI assistant
app.post("/api/chat", requireAuthAndCredits, async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    // Note: System Instruction is prepended in callGeminiAPI
    const prompt = `Use this context to answer the user.\n\nCONTEXT:\n${context || "No context."}\n\nMessage: ${message}`;
    const response = await callGeminiAPI(prompt, req.geminiKey, {
      temperature: 0.7,
    });

    let remaining = "Unlimited";
    if (req.isFreeTier) {
      remaining = await deductCredit(req.user.id, req.currentCredits);
    }

    res.json({ response, credits_remaining: remaining });
  } catch (error) {
    console.error("Chat error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --------------------------------------------
// PUBLIC ROUTES (No Auth Required for now)
// --------------------------------------------
// Citation extraction is technically "Free" utility, but we could lock it too.
// For now, let's leave it open or add auth if desired.
app.post("/api/extract-citation", async (req, res) => {
  // ... (Keep existing implementation or wrap with auth if desired)
  // For brevity, keeping it simple here, but in production, wrap this too!
  try {
    const { url } = req.body;
    // ... (Add your extract logic here or import it)
    res.json({ message: "Citation extraction active" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Export for Vercel Serverless
module.exports = app;

// Only listen if run directly (local dev)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
  ╔════════════════════════════════════════════╗
  ║   ResearchMate SECURE Backend              ║
  ║   Running on http://localhost:${PORT}          ║
  ╠════════════════════════════════════════════╣
  ║   🔑 Key Rotation: ${API_KEYS.length} keys active      ║
  ║   🛡️  JWT Auth:    ENABLED                 ║
  ║   💰 Credit Sys:   ENABLED                 ║
  ║   🔒 Guardrails:   ACTIVE                  ║
  ╚════════════════════════════════════════════╝
  `);
  });
}
