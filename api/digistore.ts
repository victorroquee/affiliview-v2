import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Vercel serverless proxy to Digistore24 API.
 *
 * Injects DIGISTORE_API_KEY server-side so the secret never reaches the browser.
 * Forwards all query params from the client to Digistore24's listTransactions endpoint.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const apiKey = process.env["DIGISTORE_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "DIGISTORE_API_KEY not configured" });
    return;
  }

  // Forward all query params from the client request
  const params = new URLSearchParams(
    req.query as Record<string, string>
  );

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
