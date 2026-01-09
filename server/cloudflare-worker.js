// cloudflare-worker.js (optional)
// Template GM endpoint for Cloudflare Worker.
// POST /gm  { lobby, players, playerInputs, turnIndex } => { text }
//
// SECURITY: keep provider keys in env vars, never in client.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/gm") return new Response("not found", { status: 404 });
    if (request.method !== "POST") return new Response("method not allowed", { status: 405 });

    const payload = await request.json().catch(()=>null);
    if (!payload) return new Response(JSON.stringify({ error: "bad json" }), { status: 400 });

    // TODO: call your AI provider here using env keys.
    const text = `GM endpoint template is not implemented yet.\nTurn: ${payload.turnIndex}`;
    return new Response(JSON.stringify({ text }), { headers: { "Content-Type":"application/json" } });
  }
};
