import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: "ok",
      message: "ResearchMate API is running",
      timestamp: new Date().toISOString(),
      hasApiKey: !!process.env.GEMINI_API_KEY,
    }),
  };
};

export { handler };
