// ============================================
// RESEARCHMATE BACKEND PROXY
// Securely handles Gemini API calls
// ============================================

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARE
// ============================================

// CORS - Allow your frontend to make requests
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      process.env.VITE_SITE_URL || "https://your-production-domain.com", // Update this for production
    ],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

// ============================================
// CONFIGURATION
// ============================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";

// Validate API key exists
if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is not set in environment variables!");
  console.error("Create a .env file with: GEMINI_API_KEY=your-key-here");
  process.exit(1);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function callGeminiAPI(prompt, options = {}) {
  const url = `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: options.temperature || 0.7,
      maxOutputTokens: options.maxTokens || 1024,
      topP: 0.8,
      topK: 40,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_ONLY_HIGH",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_ONLY_HIGH",
      },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Gemini API error: ${response.status}`
    );
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

// ============================================
// API ROUTES
// ============================================

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Generate summary
app.post("/api/summarize", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Text is required" });
    }

    const prompt = `You are a summarization engine. Your task is to condense text into 2-3 sentences.

RULES:
- Keep it under 50 words
- Focus on key insights
- Use clear, simple language
- Be objective and factual

TEXT TO SUMMARIZE:
${text}

Provide ONLY the summary, nothing else.`;

    const summary = await callGeminiAPI(prompt, { temperature: 0.5 });
    res.json({ summary });
  } catch (error) {
    console.error("Summarize error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Generate tags
app.post("/api/generate-tags", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Text is required" });
    }

    const prompt = `Analyze this text and generate 3-5 relevant tags/keywords.

RULES:
- Each tag should be 1-2 words
- Use lowercase
- No special characters
- Focus on main topics and themes
- Return as comma-separated list

TEXT:
${text}

Return ONLY the comma-separated tags, nothing else.`;

    const tagsText = await callGeminiAPI(prompt, { temperature: 0.3 });
    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);
    res.json({ tags });
  } catch (error) {
    console.error("Generate tags error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Extract insights
app.post("/api/insights", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Text is required" });
    }

    const prompt = `You are an insight extraction engine. Extract key insights as bullet points.

STRICT RULES:
- Output ONLY bullet points (use • or -)
- No preamble like "Here are the insights..."
- No concluding statements
- Each bullet should be a standalone insight
- Maximum 5 bullet points

TEXT:
${text}

Insights:`;

    const insights = await callGeminiAPI(prompt, { temperature: 0.5 });
    res.json({ insights });
  } catch (error) {
    console.error("Insights error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Chat with AI assistant
app.post("/api/chat", async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    const prompt = `You are ResearchMate AI, a helpful research assistant. You help users understand and analyze their saved research.

USER'S RESEARCH CONTEXT:
${context || "No research context provided."}

GUIDELINES:
- Be concise but thorough
- Reference specific items from their research when relevant
- Suggest connections between different research topics
- Offer to help with summaries, citations, or finding patterns
- If the user asks about something not in their research, be helpful but note you're drawing from general knowledge

USER MESSAGE: ${message}`;

    const response = await callGeminiAPI(prompt, {
      temperature: 0.7,
      maxTokens: 2048,
    });
    res.json({ response });
  } catch (error) {
    console.error("Chat error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// EXTRACT CITATION FROM URL
// ============================================

// Helper to extract metadata from HTML
function extractMetadata(html, url) {
  const metadata = {
    title: "",
    author: "",
    publishDate: "",
    siteName: "",
    description: "",
    url: url,
  };

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) metadata.title = titleMatch[1].trim();

  // Extract Open Graph tags
  const ogTitleMatch = html.match(
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
  );
  if (ogTitleMatch) metadata.title = ogTitleMatch[1].trim();

  const ogSiteNameMatch = html.match(
    /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i
  );
  if (ogSiteNameMatch) metadata.siteName = ogSiteNameMatch[1].trim();

  // Extract author
  const authorMatch = html.match(
    /<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i
  );
  if (authorMatch) metadata.author = authorMatch[1].trim();

  // Try article:author
  const articleAuthorMatch = html.match(
    /<meta[^>]*property=["']article:author["'][^>]*content=["']([^"']+)["']/i
  );
  if (articleAuthorMatch && !metadata.author)
    metadata.author = articleAuthorMatch[1].trim();

  // Extract publish date
  const dateMatch = html.match(
    /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i
  );
  if (dateMatch) metadata.publishDate = dateMatch[1].trim();

  // Try other date formats
  const datePubMatch = html.match(
    /<meta[^>]*name=["']date["'][^>]*content=["']([^"']+)["']/i
  );
  if (datePubMatch && !metadata.publishDate)
    metadata.publishDate = datePubMatch[1].trim();

  // Extract description
  const descMatch = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
  );
  if (descMatch) metadata.description = descMatch[1].trim();

  const ogDescMatch = html.match(
    /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i
  );
  if (ogDescMatch && !metadata.description)
    metadata.description = ogDescMatch[1].trim();

  // Extract site name from URL if not found
  if (!metadata.siteName) {
    try {
      const urlObj = new URL(url);
      metadata.siteName = urlObj.hostname.replace("www.", "");
    } catch {}
  }

  return metadata;
}

// Extract citation endpoint
app.post("/api/extract-citation", async (req, res) => {
  try {
    const { url, useAI } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Validate URL
    let validUrl;
    try {
      validUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    // Fetch the webpage
    const response = await fetch(validUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 10000,
    });

    if (!response.ok) {
      return res
        .status(400)
        .json({ error: `Failed to fetch URL: ${response.status}` });
    }

    const html = await response.text();

    // Extract basic metadata
    let metadata = extractMetadata(html, validUrl.toString());

    // If AI enhancement requested and author is missing
    if (useAI && (!metadata.author || !metadata.publishDate)) {
      const prompt = `Analyze this webpage metadata and content snippet to extract citation information.

URL: ${url}
Current Title: ${metadata.title}
Current Author: ${metadata.author || "Unknown"}
Current Site: ${metadata.siteName}
Description: ${metadata.description}

Based on common patterns for this website, provide your best guess for:
1. Author name (if it's a news site, organization, or can be inferred)
2. Likely publish date (if not found, estimate based on content or say "n.d.")

Respond in this exact JSON format only, no other text:
{"author": "Author Name or Organization", "publishDate": "YYYY-MM-DD or n.d.", "improvedTitle": "Cleaned up title if needed"}`;

      try {
        const aiResponse = await callGeminiAPI(prompt, { temperature: 0.3 });
        // Try to parse AI response as JSON
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiData = JSON.parse(jsonMatch[0]);
          if (aiData.author && aiData.author !== "Unknown")
            metadata.author = aiData.author;
          if (
            aiData.publishDate &&
            aiData.publishDate !== "n.d." &&
            !metadata.publishDate
          ) {
            metadata.publishDate = aiData.publishDate;
          }
          if (aiData.improvedTitle) metadata.title = aiData.improvedTitle;
        }
      } catch (aiError) {
        console.error("AI enhancement failed:", aiError.message);
        // Continue without AI enhancement
      }
    }

    // Clean up the data
    metadata.title = metadata.title.replace(/\s*[-|–—]\s*[^-|–—]+$/, "").trim(); // Remove site name from title
    metadata.accessDate = new Date().toISOString();

    res.json({
      success: true,
      metadata,
      message: useAI
        ? "Extracted with AI enhancement"
        : "Extracted from page metadata",
    });
  } catch (error) {
    console.error("Extract citation error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   ResearchMate Backend Proxy               ║
║   Running on http://localhost:${PORT}          ║
╚════════════════════════════════════════════╝
  `);
  console.log("✅ Gemini API key loaded");
  console.log("📍 Endpoints:");
  console.log("   POST /api/summarize");
  console.log("   POST /api/generate-tags");
  console.log("   POST /api/insights");
  console.log("   POST /api/chat");
  console.log("   GET  /api/health");
});
