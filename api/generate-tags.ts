// ============================================
// GENERATE-TAGS - AI-powered Tag Generation
// Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";

// ============================================
// MULTI-PROVIDER AI CONFIGURATION
// ============================================

interface AIProvider {
  name: string;
  apiKey: string | undefined;
  endpoint: string;
  formatRequest: (text: string) => object;
  parseResponse: (data: any) => string;
  getHeaders: () => Record<string, string>;
}

const TAG_PROMPT = `Analyze this research text and generate 3-5 relevant tags/keywords. Return ONLY a JSON array of strings, nothing else. Example: ["machine learning", "healthcare", "AI"]

Text: `;

const getProviders = (): AIProvider[] => {
  return [
    // Provider 1: Google Gemini
    {
      name: "Gemini",
      apiKey: process.env.GEMINI_API_KEY,
      endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      getHeaders: () => ({ "Content-Type": "application/json" }),
      formatRequest: (text: string) => ({
        contents: [{ parts: [{ text: TAG_PROMPT + text }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 100 },
      }),
      parseResponse: (data: any) =>
        data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    },
    // Provider 2: Groq
    {
      name: "Groq",
      apiKey: process.env.GROQ_API_KEY,
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      getHeaders: () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      }),
      formatRequest: (text: string) => ({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You generate tags for research text. Return ONLY a JSON array of strings.",
          },
          { role: "user", content: TAG_PROMPT + text },
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
      parseResponse: (data: any) => data.choices?.[0]?.message?.content || "",
    },
    // Provider 3: OpenRouter
    {
      name: "OpenRouter",
      apiKey: process.env.OPENROUTER_API_KEY,
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      getHeaders: () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://researchmate.vercel.app",
        "X-Title": "ResearchMate",
      }),
      formatRequest: (text: string) => ({
        model: "meta-llama/llama-3.2-3b-instruct:free",
        messages: [
          {
            role: "system",
            content:
              "You generate tags for research text. Return ONLY a JSON array of strings.",
          },
          { role: "user", content: TAG_PROMPT + text },
        ],
        max_tokens: 100,
      }),
      parseResponse: (data: any) => data.choices?.[0]?.message?.content || "",
    },
  ];
};

function parseTags(responseText: string): string[] {
  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {}

  // Fallback: extract quoted words
  const quoted = responseText.match(/["']([^"']+)["']/g);
  if (quoted) {
    return quoted.map((s) => s.replace(/["']/g, "")).slice(0, 5);
  }

  return [];
}

async function tryProvider(
  provider: AIProvider,
  text: string
): Promise<{ success: boolean; tags: string[]; error?: string }> {
  if (!provider.apiKey) {
    return { success: false, tags: [], error: `${provider.name}: No API key` };
  }

  try {
    console.log(`Trying ${provider.name}...`);

    const response = await fetch(provider.endpoint, {
      method: "POST",
      headers: provider.getHeaders(),
      body: JSON.stringify(provider.formatRequest(text)),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        tags: [],
        error: `${provider.name}: ${
          errorData.error?.message || response.status
        }`,
      };
    }

    const data = await response.json();
    const responseText = provider.parseResponse(data);
    const tags = parseTags(responseText);

    if (tags.length === 0) {
      return {
        success: false,
        tags: [],
        error: `${provider.name}: Could not parse tags`,
      };
    }

    console.log(`✅ ${provider.name} succeeded`);
    return { success: true, tags };
  } catch (error) {
    return {
      success: false,
      tags: [],
      error: `${provider.name}: ${(error as Error).message}`,
    };
  }
}

async function generateTagsWithFallback(text: string): Promise<{
  success: boolean;
  tags: string[];
  provider?: string;
  errors?: string[];
}> {
  const providers = getProviders();
  const errors: string[] = [];

  for (const provider of providers) {
    const result = await tryProvider(provider, text);
    if (result.success) {
      return { success: true, tags: result.tags, provider: provider.name };
    }
    if (result.error) errors.push(result.error);
  }

  return { success: false, tags: [], errors };
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ error: "Text is required" });
    }

    const result = await generateTagsWithFallback(text.trim());

    if (result.success) {
      return res
        .status(200)
        .json({ tags: result.tags, provider: result.provider });
    } else {
      return res.status(503).json({
        error: "All AI providers failed",
        details: result.errors,
      });
    }
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
