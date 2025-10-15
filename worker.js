export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const { text, dateISO, mood, praise } = await request.json();

      const prompt = `다음 일기를 한국어로 간결하게 요약해줘.
날짜: ${dateISO}
감정: ${mood || "—"}
칭찬: ${praise || ""}

일기:
${text}

- 요약은 3문장 이내로.`;

      const r = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ model: "gpt-4o-mini", input: prompt }),
      });

      if (!r.ok) {
        return new Response(JSON.stringify({ error: await r.text() }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      const data = await r.json();
      const out = data.output?.[0]?.content?.[0]?.text || data.output_text || "";
      return new Response(JSON.stringify({ summary: String(out).trim() }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};
