import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

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
        "HTTP-Referer": "https://researchmate-web.netlify.app",
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

async function generateTagsWithFallback(
  text: string
): Promise<{
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

const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { text } = JSON.parse(event.body || "{}");

    if (!text?.trim()) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Text is required" }),
      };
    }

    const result = await generateTagsWithFallback(text.trim());

    if (result.success) {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tags: result.tags, provider: result.provider }),
      };
    } else {
      return {
        statusCode: 503,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "All AI providers failed",
          details: result.errors,
        }),
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
};

export { handler };
