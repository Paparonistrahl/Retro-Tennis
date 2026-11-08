// Supabase Edge Function: pacman-score
// Deploy with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and PACMAN_SIGNING_SECRET.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function b64url(bytes: Uint8Array) {
  let s = "";
  bytes.forEach((b) => s += String.fromCharCode(b));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const signingSecret = Deno.env.get("PACMAN_SIGNING_SECRET")!;
  if (!url || !serviceKey || !signingSecret) return json({ error: "Server not configured" }, 500);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  try {
    const body = await req.json();
    if (body.action === "start") {
      const nonce = crypto.randomUUID();
      const issued = Date.now();
      const payload = b64url(new TextEncoder().encode(JSON.stringify({ nonce, issued })));
      const token = payload + "." + await hmac(payload, signingSecret);
      const { error } = await db.from("pacman_score_sessions").insert({ nonce, started_at: new Date(issued).toISOString() });
      if (error) throw error;
      return json({ token });
    }

    if (body.action !== "submit" || typeof body.token !== "string") return json({ error: "Invalid request" }, 400);
    const [payload, signature, extra] = body.token.split(".");
    if (!payload || !signature || extra) return json({ error: "Invalid token" }, 400);
    if (!safeEqual(signature, await hmac(payload, signingSecret))) return json({ error: "Invalid token signature" }, 403);

    let session: { nonce: string; issued: number };
    try { session = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - payload.length % 4) % 4)), c => c.charCodeAt(0)))); }
    catch { return json({ error: "Invalid token payload" }, 400); }
    const elapsed = Date.now() - session.issued;
    if (!session.nonce || !Number.isFinite(session.issued) || elapsed < 15_000 || elapsed > 8 * 60 * 60 * 1000) return json({ error: "Game session duration invalid" }, 400);

    const name = String(body.name ?? "").trim().slice(0, 10).toUpperCase();
    const score = Number(body.score);
    if (!/^[A-Z0-9_]{1,10}$/.test(name) || !Number.isSafeInteger(score) || score < 0 || score > Math.floor((elapsed / 1000) * 900 + 5000)) {
      return json({ error: "Score or name failed validation" }, 400);
    }

    const { data: sessionRow, error: readError } = await db.from("pacman_score_sessions").select("nonce,submitted_at").eq("nonce", session.nonce).maybeSingle();
    if (readError || !sessionRow || sessionRow.submitted_at) return json({ error: "Session already used or unknown" }, 409);
    const { error: useError } = await db.from("pacman_score_sessions").update({ submitted_at: new Date().toISOString() }).eq("nonce", session.nonce).is("submitted_at", null);
    if (useError) throw useError;
    const { error: insertError } = await db.from("pacman_scores").insert({ player_name: name, score });
    if (insertError) throw insertError;
    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});