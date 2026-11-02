const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    if (request.method !== "POST") {
      return json({ error: "Use POST" }, 405);
    }

    if (!env.AI) {
      return json({ error: "Workers AI binding AI is not configured" }, 500);
    }

    const url = new URL(request.url);

    try {
      const body = await request.json();

      if (url.pathname === "/api/story") {
        const story = String(body.story || "").slice(0, 5000);
        const action = String(body.action || "").slice(0, 2000);

        if (!action.trim()) {
          return json({ error: "Missing action" }, 400);
        }

        const result = await env.AI.run(
          "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          {
            messages: [
              {
                role: "system",
                content:
                  "Eres el narrador de una novela interactiva isekai en español. Continúa la historia con coherencia, diálogos naturales y consecuencias. Respeta la personalidad y los recuerdos de los personajes. Nunca decidas las acciones del protagonista por el jugador.",
              },
              {
                role: "user",
                content: `CONTEXTO:\n${story}\n\nACCIÓN DEL JUGADOR:\n${action}\n\nContinúa la historia.`,
              },
            ],
            max_tokens: 700,
          }
        );

        return json({ text: result.response || "" });
      }

      if (url.pathname === "/api/image") {
        const prompt = String(body.prompt || "").slice(0, 1500);

        if (!prompt.trim()) {
          return json({ error: "Missing prompt" }, 400);
        }

        const image = await env.AI.run(
          "@cf/black-forest-labs/flux-1-schnell",
          {
            prompt: `Anime fantasy illustration, detailed background and composition: ${prompt}`,
          }
        );

        return new Response(image, {
          headers: {
            ...CORS,
            "Content-Type": "image/jpeg",
            "Cache-Control": "no-store",
          },
        });
      }

      return json({ error: "Unknown endpoint" }, 404);
    } catch (error) {
      return json(
        { error: "Generation failed", detail: String(error) },
        500
      );
    }
  },
};
