const SHEETS_WEBHOOK = 'https://script.google.com/macros/s/AKfycbym9fMJd0SRgjq8lHM1N7fGpA8aUD4SFjSWs4_ZrRSIb6OW086ldYtIyDfTi123pN79/exec';

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body);

    // ── Google Sheets export (routed server-side to avoid CORS) ──
    if (body.action === 'exportToSheets') {
      const res = await fetch(SHEETS_WEBHOOK, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(JSON.stringify(body.payload)),
      });
      const text = await res.text();
      console.log('Sheets webhook response:', res.status, text);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ ok: true }),
      };
    }

    // ── Gemini chat ──
    const { system, messages, max_tokens } = body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY is not set' }) };
    }

    const geminiContents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const merged = [];
    for (const msg of geminiContents) {
      if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
        merged[merged.length - 1].parts[0].text += '\n' + msg.parts[0].text;
      } else {
        merged.push({ role: msg.role, parts: [{ text: msg.parts[0].text }] });
      }
    }
    if (merged.length > 0 && merged[0].role === 'model') {
      merged.unshift({ role: 'user', parts: [{ text: '(start)' }] });
    }

    const geminiBody = {
      system_instruction: system ? { parts: [{ text: system }] } : undefined,
      contents: merged,
      generationConfig: { maxOutputTokens: max_tokens || 16000, temperature: 0.7 },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let response, data;
    for (let attempt = 0; attempt < 2; attempt++) {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      });
      data = await response.json();
      if (response.status !== 503) break;
      await new Promise((r) => setTimeout(r, 2000));
    }

    console.log('Gemini status:', response.status);
    console.log('Finish reason:', data.candidates?.[0]?.finishReason);

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: data.error?.message || 'Gemini API error' }) };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Empty response from Gemini', finishReason: data.candidates?.[0]?.finishReason }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ content: [{ type: 'text', text }] }),
    };
  } catch (err) {
    console.error('Function error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
