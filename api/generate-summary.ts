import type { VercelRequest, VercelResponse } from "@vercel/node";
import { callGemini } from "./_gemini.js";

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

  const result = await callGemini(apiKey, {
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
  });

  if (!result.ok) {
    res.status(result.status).json({ error: result.message, retryable: true });
    return;
  }

  res.status(200).json({ text: result.text });
}
