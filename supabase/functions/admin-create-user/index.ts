// admin-create-user: an admin creates a coach (or another admin) account.
// Coaches sign in with just a username, mapped to a synthetic internal email.
// The service role key is auto-injected by Supabase — no secret to paste.
//
// Deploy (CLI): supabase functions deploy admin-create-user --project-ref zkxoyiiccqsovdtkxgpn
// Or paste this whole file into the Dashboard → Edge Functions editor (self-contained).
//
// Body: { username, password, full_name?, role?: "admin"|"coach", permissions?, email? }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const COACH_DOMAIN = "fcdiamante.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return json({ error: "No autorizado" }, 401);

  // Verify the caller is a signed-in admin.
  const caller = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await caller.auth.getUser(token);
  const uid = userData?.user?.id;
  if (!uid) return json({ error: "No autorizado" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: me } = await admin
    .from("profiles")
    .select("role")
    .eq("id", uid)
    .maybeSingle();
  if (me?.role !== "admin") return json({ error: "Solo administradores" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const fullName = String(body.full_name ?? "").trim();
  const role = body.role === "admin" ? "admin" : "coach";
  const permissions =
    body.permissions && typeof body.permissions === "object"
      ? (body.permissions as Record<string, boolean>)
      : {};
  const email = body.email
    ? String(body.email).trim().toLowerCase()
    : `${username}@${COACH_DOMAIN}`;

  if (!username || !/^[a-z0-9._-]{3,32}$/.test(username))
    return json({ error: "Usuario inválido (3-32, letras/números/._-)" }, 400);
  if (password.length < 6)
    return json({ error: "La contraseña debe tener al menos 6 caracteres" }, 400);

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, full_name: fullName },
  });
  if (error || !created?.user)
    return json({ error: error?.message ?? "No se pudo crear el usuario" }, 400);

  const { error: upErr } = await admin
    .from("profiles")
    .update({ role, permissions, username, full_name: fullName })
    .eq("id", created.user.id);
  if (upErr) return json({ error: upErr.message }, 400);

  return json({ ok: true, id: created.user.id, username, role });
});
