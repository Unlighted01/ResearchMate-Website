// ============================================
// CHAT - Multi-Provider AI Chat
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
  formatRequest: (message: string, context: string) => object;
  parseResponse: (data: any) => string;
  getHeaders: () => Record<string, string>;
}

const SYSTEM_PROMPT = `You are an AI research assistant for ResearchMate. Your role is specifically to help users understand and summarize their saved research.

IMPORTANT: You should ONLY help with:
1. Summarizing research content
2. Explaining concepts from the user's saved research
3. Comparing different research items
4. Generating insights from research

If the user asks about anything unrelated to research summarization or analysis, politely redirect them.`;

const getProviders = (): AIProvider[] => {
  return [
    // Provider 1: Google Gemini
    {
      name: "Gemini",
      apiKey: process.env.GEMINI_API_KEY,
      endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      getHeaders: () => ({ "Content-Type": "application/json" }),
      formatRequest: (message: string, context: string) => ({
        contents: [
          {
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\nUser's Research Context:\n${
                  context || "No research items available."
                }\n\nUser's Question: ${message}\n\nProvide a helpful, concise response:`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
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
      formatRequest: (message: string, context: string) => ({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}\n\nUser's Research Context:\n${
              context || "No research items available."
            }`,
          },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 500,
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
      formatRequest: (message: string, context: string) => ({
        model: "meta-llama/llama-3.2-3b-instruct:free",
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}\n\nUser's Research Context:\n${
              context || "No research items available."
            }`,
          },
          { role: "user", content: message },
        ],
        max_tokens: 500,
      }),
      parseResponse: (data: any) => data.choices?.[0]?.message?.content || "",
    },
  ];
};

async function tryProvider(
  provider: AIProvider,
  message: string,
  context: string
): Promise<{ success: boolean; response: string; error?: string }> {
  if (!provider.apiKey) {
    return {
      success: false,
      response: "",
      error: `${provider.name}: No API key`,
    };
  }

  try {
    console.log(`Trying ${provider.name}...`);

    const response = await fetch(provider.endpoint, {
      method: "POST",
      headers: provider.getHeaders(),
      body: JSON.stringify(provider.formatRequest(message, context)),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        response: "",
        error: `${provider.name}: ${
          errorData.error?.message || response.status
        }`,
      };
    }

    const data = await response.json();
    const text = provider.parseResponse(data);

    if (!text) {
      return {
        success: false,
        response: "",
        error: `${provider.name}: Empty response`,
      };
    }

    console.log(`✅ ${provider.name} succeeded`);
    return { success: true, response: text };
  } catch (error) {
    return {
      success: false,
      response: "",
      error: `${provider.name}: ${(error as Error).message}`,
    };
  }
}

async function chatWithFallback(
  message: string,
  context: string
): Promise<{
  success: boolean;
  response: string;
  provider?: string;
  errors?: string[];
}> {
  const providers = getProviders();
  const errors: string[] = [];

  for (const provider of providers) {
    const result = await tryProvider(provider, message, context);
    if (result.success) {
      return {
        success: true,
        response: result.response,
        provider: provider.name,
      };
    }
    if (result.error) errors.push(result.error);
  }

  return { success: false, response: "", errors };
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
    const { message, context: researchContext } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const result = await chatWithFallback(
      message.trim(),
      researchContext || ""
    );

    if (result.success) {
      return res.status(200).json({
        response: result.response,
        provider: result.provider,
      });
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
