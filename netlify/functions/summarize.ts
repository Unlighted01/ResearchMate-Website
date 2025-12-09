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

const getProviders = (): AIProvider[] => {
  return [
    // Provider 1: Google Gemini
    {
      name: "Gemini",
      apiKey: process.env.GEMINI_API_KEY,
      endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      getHeaders: () => ({ "Content-Type": "application/json" }),
      formatRequest: (text: string) => ({
        contents: [
          {
            parts: [
              {
                text: `Summarize the following research text in 2-3 concise sentences. Focus on the key findings and main points:\n\n${text}`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
      }),
      parseResponse: (data: any) =>
        data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    },
    // Provider 2: Groq (uses Llama models - very fast, generous free tier)
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
              "You are a research assistant. Summarize text concisely in 2-3 sentences.",
          },
          { role: "user", content: `Summarize this research text:\n\n${text}` },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
      parseResponse: (data: any) => data.choices?.[0]?.message?.content || "",
    },
    // Provider 3: OpenRouter (access to multiple free models)
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
              "You are a research assistant. Summarize text concisely in 2-3 sentences.",
          },
          { role: "user", content: `Summarize this research text:\n\n${text}` },
        ],
        max_tokens: 200,
      }),
      parseResponse: (data: any) => data.choices?.[0]?.message?.content || "",
    },
  ];
};

// ============================================
// TRY EACH PROVIDER WITH FALLBACK
// ============================================

async function tryProvider(
  provider: AIProvider,
  text: string
): Promise<{ success: boolean; summary: string; error?: string }> {
  if (!provider.apiKey) {
    return {
      success: false,
      summary: "",
      error: `${provider.name}: No API key configured`,
    };
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
      const errorMsg = errorData.error?.message || `HTTP ${response.status}`;
      console.error(`${provider.name} failed:`, errorMsg);
      return {
        success: false,
        summary: "",
        error: `${provider.name}: ${errorMsg}`,
      };
    }

    const data = await response.json();
    const summary = provider.parseResponse(data);

    if (!summary) {
      return {
        success: false,
        summary: "",
        error: `${provider.name}: Empty response`,
      };
    }

    console.log(`✅ ${provider.name} succeeded`);
    return { success: true, summary };
  } catch (error) {
    console.error(`${provider.name} error:`, error);
    return {
      success: false,
      summary: "",
      error: `${provider.name}: ${(error as Error).message}`,
    };
  }
}

async function summarizeWithFallback(
  text: string
): Promise<{
  success: boolean;
  summary: string;
  provider?: string;
  errors?: string[];
}> {
  const providers = getProviders();
  const errors: string[] = [];

  for (const provider of providers) {
    const result = await tryProvider(provider, text);

    if (result.success) {
      return {
        success: true,
        summary: result.summary,
        provider: provider.name,
      };
    }

    if (result.error) {
      errors.push(result.error);
    }
  }

  return { success: false, summary: "", errors };
}

// ============================================
// MAIN HANDLER
// ============================================

const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Handle CORS preflight
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

  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { text } = JSON.parse(event.body || "{}");

    if (!text || !text.trim()) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Text is required" }),
      };
    }

    // Try all providers with fallback
    const result = await summarizeWithFallback(text.trim());

    if (result.success) {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: result.summary,
          provider: result.provider,
        }),
      };
    } else {
      return {
        statusCode: 503,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "All AI providers failed. Please try again later.",
          details: result.errors,
        }),
      };
    }
  } catch (error) {
    console.error("Summarize error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
};

export { handler };
