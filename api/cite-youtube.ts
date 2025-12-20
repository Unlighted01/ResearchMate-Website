// ============================================
// CITE-YOUTUBE - Video Citation via YouTube Data API
// Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";

// ============================================
// PART 1: TYPE DEFINITIONS
// ============================================

interface VideoData {
  title: string;
  channelTitle: string;
  channelUrl: string;
  publishDate: string;
  publishYear: string;
  publishMonth: string;
  publishDay: string;
  description: string;
  duration: string;
  durationFormatted: string;
  thumbnailUrl: string;
  url: string;
  videoId: string;
}

// ============================================
// PART 2: HELPER FUNCTIONS
// ============================================

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function parseDuration(isoDuration: string): {
  seconds: number;
  formatted: string;
} {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) return { seconds: 0, formatted: "0:00" };

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  let formatted: string;
  if (hours > 0) {
    formatted = `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  } else {
    formatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  return { seconds: totalSeconds, formatted };
}

function formatDate(isoDate: string): {
  year: string;
  month: string;
  day: string;
} {
  try {
    const date = new Date(isoDate);
    return {
      year: date.getFullYear().toString(),
      month: (date.getMonth() + 1).toString().padStart(2, "0"),
      day: date.getDate().toString().padStart(2, "0"),
    };
  } catch {
    return { year: "n.d.", month: "", day: "" };
  }
}

// ============================================
// PART 3: YOUTUBE DATA API
// ============================================

async function lookupYouTube(
  videoId: string,
  apiKey: string
): Promise<VideoData | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?` +
        `id=${videoId}&part=snippet,contentDetails&key=${apiKey}`
    );

    if (!response.ok) {
      console.error(`YouTube API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;

    const dateInfo = formatDate(snippet.publishedAt);
    const duration = parseDuration(contentDetails?.duration || "PT0S");

    return {
      title: snippet.title || "Unknown Title",
      channelTitle: snippet.channelTitle || "Unknown Channel",
      channelUrl: `https://www.youtube.com/channel/${snippet.channelId}`,
      publishDate: snippet.publishedAt,
      publishYear: dateInfo.year,
      publishMonth: dateInfo.month,
      publishDay: dateInfo.day,
      description: snippet.description || "",
      duration: contentDetails?.duration || "",
      durationFormatted: duration.formatted,
      thumbnailUrl:
        snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || "",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      videoId: videoId,
    };
  } catch (error) {
    console.error("YouTube API lookup failed:", error);
    return null;
  }
}

// ============================================
// PART 4: OEMBED FALLBACK (No API Key Needed)
// ============================================

async function oembedFallback(videoId: string): Promise<VideoData | null> {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        url
      )}&format=json`
    );

    if (!response.ok) return null;

    const data = await response.json();

    return {
      title: data.title || "Unknown Title",
      channelTitle: data.author_name || "Unknown Channel",
      channelUrl: data.author_url || "",
      publishDate: "",
      publishYear: "n.d.",
      publishMonth: "",
      publishDay: "",
      description: "",
      duration: "",
      durationFormatted: "",
      thumbnailUrl: data.thumbnail_url || "",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      videoId: videoId,
    };
  } catch (error) {
    console.error("oEmbed fallback failed:", error);
    return null;
  }
}

// ============================================
// PART 5: MAIN HANDLER
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
    const { url } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ error: "YouTube URL is required" });
    }

    const videoId = extractVideoId(url.trim());

    if (!videoId) {
      return res.status(400).json({
        error:
          "Invalid YouTube URL. Please provide a valid YouTube video link.",
      });
    }

    let videoData: VideoData | null = null;

    // Try YouTube Data API if key is available
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
      videoData = await lookupYouTube(videoId, apiKey);
    }

    // Fallback to oEmbed
    if (!videoData) {
      console.log("YouTube API unavailable, using oEmbed fallback...");
      videoData = await oembedFallback(videoId);
    }

    if (!videoData) {
      return res.status(404).json({
        error: "Video not found. Please check the URL and try again.",
        videoId: videoId,
      });
    }

    return res.status(200).json({
      success: true,
      type: "video",
      data: videoData,
    });
  } catch (error) {
    console.error("YouTube citation error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
