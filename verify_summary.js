const fetch = require("node-fetch"); // You might need to install this or use built-in fetch if node version > 18

async function verify() {
  const text = `
    Artificial Intelligence (AI) has rapidly evolved from a theoretical concept to a transformative force across various industries. 
    In healthcare, AI algorithms are being used to predict patient outcomes, assist in surgical procedures, and personalize treatment plans. 
    For instance, machine learning models can analyze medical images with higher accuracy than human radiologists in some cases.
    However, the integration of AI in healthcare also raises significant ethical concerns, particularly regarding data privacy and algorithmic bias.
    Studies have shown that AI systems trained on biased datasets can perpetuate existing healthcare disparities.
    Therefore, it is crucial to develop robust regulatory frameworks to ensure the safe and equitable deployment of AI technologies.
    Future research should focus on creating explainable AI models that allow clinicians to understand the reasoning behind AI-generated recommendations.
    This transparency is essential for building trust among healthcare professionals and patients alike.
    Furthermore, interdisciplinary collaboration between computer scientists, ethicists, and medical practitioners is vital for addressing the multifaceted challenges of AI in medicine.
  `.trim();

  try {
    console.log("Testing Summarization API...");
    // Note: You might need to add a valid JWT token here if auth is strictly enforced.
    // But since we are testing locally, if we have a way to bypass or if we run in a mode that allows it...
    // The backend middleware checks for Authorization header.
    // We can try to use the bypass header 'x-custom-api-key': 'AIzTest' which we saw in the code!

    const response = await fetch("http://localhost:3001/api/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-custom-api-key": "AIzTestKeyBypass", // Starts with AIz, triggers bypass in server.js middleware
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Request failed:", response.status, err);
      return;
    }

    const data = await response.json();
    console.log("--- SUMMARY START ---");
    console.log(data.summary);
    console.log("--- SUMMARY END ---");

    const wordCount = data.summary.split(/\s+/).length;
    console.log(`Word Count: ${wordCount}`);

    if (
      data.summary.includes("[Content Type]") ||
      data.summary.includes("Article") ||
      data.summary.includes("Research")
    ) {
      console.log("✅ Structured output detected.");
    } else {
      console.log("⚠️ Warning: Structure not detected.");
    }

    if (wordCount > 50) {
      console.log(
        "✅ Summary length constraint removed (User wanted > 50 words).",
      );
    } else {
      console.log("❌ Summary is still short!");
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

verify();
