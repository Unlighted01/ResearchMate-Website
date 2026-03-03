import type { VercelRequest, VercelResponse } from "@vercel/node";
import { serialize } from "cookie";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { apiKey } = req.body;

  if (apiKey === undefined) {
      return res.status(400).json({ error: "API key is required" });
  }

  // Set as HttpOnly, Secure, SameSite=Strict cookie
  // If apiKey is empty, it clears the cookie
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: apiKey ? 60 * 60 * 24 * 30 : 0, // 30 days or delete immediately
  };

  const serializedCookie = serialize("custom_gemini_key", apiKey, cookieOptions);

  res.setHeader("Set-Cookie", serializedCookie);
  res.status(200).json({ success: true });
}
