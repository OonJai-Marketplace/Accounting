// Constant-only public activity probe. No request input reaches the database.
Deno.serve(async (request: Request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET" } });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const publishable = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default;
  const legacyAnon = Deno.env.get("SUPABASE_ANON_KEY");
  const key = publishable || legacyAnon;
  if (!url || !key) return new Response("Unavailable", { status: 503 });

  try {
    const result = await fetch(new URL("/rest/v1/rpc/keepalive_ping", url), {
      method: "POST",
      headers: {
        apikey: key,
        ...(publishable ? {} : { Authorization: `Bearer ${legacyAnon}` }),
        "Content-Type": "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(10000),
    });
    if (!result.ok || (await result.text()).trim() !== "true") {
      return new Response("Database check failed", { status: 503 });
    }
    return new Response("ok", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response("Database check failed", { status: 503 });
  }
});
