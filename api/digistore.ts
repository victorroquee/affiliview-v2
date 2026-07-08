import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Vercel serverless proxy to Digistore24 API.
 *
 * Injects DIGISTORE_API_KEY server-side so the secret never reaches the browser.
 * Requires a valid Supabase session (Authorization: Bearer <access_token>) — sem
 * isso qualquer um com a URL leria todo o histórico financeiro. A validação falha
 * FECHADA: se não der para verificar o token, a requisição é rejeitada (401).
 */

// Em serverless, as VITE_* também ficam disponíveis via process.env (o prefixo só
// controla a inlining no bundle do cliente). Aceita ambas as formas de nomeação.
const SUPABASE_URL =
  process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
const SUPABASE_ANON_KEY =
  process.env["SUPABASE_ANON_KEY"] ?? process.env["VITE_SUPABASE_ANON_KEY"];

// Só estes params são repassados ao Digistore — evita injeção de query arbitrária.
const ALLOWED_PARAMS = new Set([
  "from",
  "to",
  "search[role]",
  "search[transaction_type]",
  "sort_by",
  "sort_order",
  "page_no",
  "page_size",
]);

async function isAuthenticated(req: VercelRequest): Promise<boolean> {
  const authz = req.headers["authorization"];
  const token =
    typeof authz === "string" && authz.startsWith("Bearer ")
      ? authz.slice(7).trim()
      : null;
  if (!token) return false;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false; // fail closed

  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });
    return r.ok; // 200 = token válido e não expirado
  } catch {
    return false;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const apiKey = process.env["DIGISTORE_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "DIGISTORE_API_KEY not configured" });
    return;
  }

  // Gate de autenticação — dados financeiros só para sessão válida do Supabase.
  if (!(await isAuthenticated(req))) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  // Repassa apenas os params permitidos (allow-list).
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (!ALLOWED_PARAMS.has(key)) continue;
    if (Array.isArray(value)) params.set(key, value[0] ?? "");
    else if (value != null) params.set(key, String(value));
  }

  const url = `https://www.digistore24.com/api/call/listTransactions?${params.toString()}`;

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        "X-DS-API-KEY": apiKey,
        "Accept": "application/json",
      },
    });

    const contentType = upstream.headers.get("content-type") ?? "application/json";
    const body = await upstream.text();

    res.setHeader("Content-Type", contentType);
    res.status(upstream.status).send(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown proxy error";
    res.status(502).json({ error: message });
  }
}
