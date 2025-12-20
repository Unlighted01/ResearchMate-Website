// ============================================
// EXTRACT-CITATION - Extract Citation from URL
// Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Helper to extract metadata from HTML
function extractMetadata(html: string, url: string) {
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
    const { url, useAI } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Validate URL
    let validUrl: URL;
    try {
      validUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    // Fetch the webpage
    const response = await fetch(validUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return res
        .status(400)
        .json({ error: `Failed to fetch URL: ${response.status}` });
    }

    const html = await response.text();

    // Extract basic metadata
    let metadata = extractMetadata(html, validUrl.toString());

    // If AI enhancement requested and API key available
    if (
      useAI &&
      GEMINI_API_KEY &&
      (!metadata.author || !metadata.publishDate)
    ) {
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
        const aiResponse = await fetch(
          `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
            }),
          }
        );

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiText =
            aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const aiResult = JSON.parse(jsonMatch[0]);
            if (aiResult.author && aiResult.author !== "Unknown")
              metadata.author = aiResult.author;
            if (
              aiResult.publishDate &&
              aiResult.publishDate !== "n.d." &&
              !metadata.publishDate
            ) {
              metadata.publishDate = aiResult.publishDate;
            }
            if (aiResult.improvedTitle) metadata.title = aiResult.improvedTitle;
          }
        }
      } catch (aiError) {
        console.error("AI enhancement failed:", aiError);
      }
    }

    // Clean up the data
    metadata.title = metadata.title.replace(/\s*[-|–—]\s*[^-|–—]+$/, "").trim();
    const accessDate = new Date().toISOString();

    return res.status(200).json({
      success: true,
      metadata: { ...metadata, accessDate },
      message: useAI
        ? "Extracted with AI enhancement"
        : "Extracted from page metadata",
    });
  } catch (error) {
    console.error("Extract citation error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
