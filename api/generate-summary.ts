import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor." });
    return;
  }

  const { prompt } = req.body as { prompt?: string };
  if (!prompt) {
    res.status(400).json({ error: "Prompt vazio." });
    return;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "Você é o assistente motivacional do CONTAkcal. Gere um resumo curto (2-3 frases), direto, encorajador e sem exageros, em português, baseado nos dados fornecidos. Nunca invente números que não foram passados.",
            },
          ],
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 1500,
          thinkingConfig: { thinkingBudget: 200 },
        },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    res.status(response.status).json({ error: errorBody });
    return;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    res.status(502).json({ error: "Resposta vazia da IA." });
    return;
  }

  res.status(200).json({ text });
}
