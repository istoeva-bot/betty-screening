exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { system, messages, max_tokens } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "GEMINI_API_KEY is not set" }),
      };
    }

    // Convert to Gemini roles
    const geminiContents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Gemini requires strict alternation and must start with user
    const merged = [];
    for (const msg of geminiContents) {
      if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
        merged[merged.length - 1].parts[0].text += "\n" + msg.parts[0].text;
      } else {
        merged.push({ role: msg.role, parts: [{ text: msg.parts[0].text }] });
      }
    }
    if (merged.length > 0 && merged[0].role === "model") {
      merged.unshift({ role: "user", parts: [{ text: "(start)" }] });
    }

    const geminiBody = {
      system_instruction: system ? { parts: [{ text: system }] } : undefined,
      contents: merged,
      generationConfig: {
        maxOutputTokens: max_tokens || 1000,
        temperature: 0.9,
      },
      // Disable safety filters that block gambling/iGaming content
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    };

const model = "gemini-2.0-flash";
const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    const data = await response.json();

    console.log("Gemini status:", response.status);
    console.log("Gemini response:", JSON.stringify(data).substring(0, 500));

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error?.message || "Gemini API error" }),
      };
    }

    const candidate = data.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const text = candidate?.content?.parts?.[0]?.text || "";

    console.log("Finish reason:", finishReason, "Text length:", text.length);

    if (!text) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Empty response from Gemini",
          finishReason,
          safetyRatings: candidate?.safetyRatings,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ content: [{ type: "text", text }] }),
    };
  } catch (err) {
    console.error("Function error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
