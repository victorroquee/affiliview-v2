import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const apiKey = process.env.DIGISTORE_API_KEY;

  if (!apiKey) {
    res.status(500).json({ result: "error", message: "DIGISTORE_API_KEY não configurada no servidor." });
    return;
  }

  // Reconstrói os query params recebidos do frontend
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else if (value !== undefined) {
      params.append(key, value);
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://www.digistore24.com/api/call/listTransactions?${params}`,
      {
        headers: {
          "X-DS-API-KEY": apiKey,
          Accept: "application/json",
        },
      }
    );
  } catch (err) {
    res.status(502).json({ result: "error", message: `Erro ao contactar Digistore: ${(err as Error).message}` });
    return;
  }

  const body = await upstream.text();

  // Evita chain com setHeader (retorna void em Node http.ServerResponse)
  res.setHeader("Content-Type", "application/json");
  res.status(upstream.status).send(body);
}
