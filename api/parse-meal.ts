import type { VercelRequest, VercelResponse } from "@vercel/node";

interface ConversationTurn {
  role: "user" | "model";
  text: string;
}

interface ParseMealBody {
  history: ConversationTurn[];
  dishLibrary?: { name: string; variants: string[] }[];
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    status: { type: "STRING", enum: ["need_info", "complete"] },
    question: { type: "STRING" },
    dishName: { type: "STRING" },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          quantity: { type: "STRING" },
          kcal: { type: "NUMBER" },
          protein: { type: "NUMBER" },
          carbs: { type: "NUMBER" },
          fat: { type: "NUMBER" },
        },
        required: ["name", "quantity", "kcal", "protein", "carbs", "fat"],
      },
    },
    totals: {
      type: "OBJECT",
      properties: {
        kcal: { type: "NUMBER" },
        protein: { type: "NUMBER" },
        carbs: { type: "NUMBER" },
        fat: { type: "NUMBER" },
      },
      required: ["kcal", "protein", "carbs", "fat"],
    },
  },
  required: ["status"],
};

function buildSystemInstruction(dishLibrary: ParseMealBody["dishLibrary"]): string {
  const base = `Você é o assistente de registro de refeições do CONTAkcal. O usuário descreve o que comeu em texto livre.

Regras:
1. Identifique cada item citado.
2. Se um item tiver quantidade clara (ex: "2 ovos", "150g de arroz"), calcule os valores nutricionais direto, sem perguntar nada sobre ele.
3. Se um item for um prato composto/preparado sem pesagem possível (hambúrguer, pizza, salada, doce, etc.) e faltar informação para estimar a porção, NÃO pergunte gramas — pergunte uma classificação fácil de responder sem balança (ex: "hambúrguer simples ou com queijo/bacon extra?", "fatia pequena, média ou grande de pizza, quantas fatias?"). Pergunte só UMA pergunta por vez, a mais importante primeiro, e retorne status="need_info" com essa pergunta em "question".
4. Quando toda a informação necessária estiver disponível, decomponha pratos compostos em ingredientes típicos com proporções de referência (ex: hambúrguer → pão, carne, queijo, alface, tomate), calcule kcal/proteína/carboidrato/gordura por item e o total, e retorne status="complete" preenchendo "items" e "totals" (sempre com os 4 campos kcal, protein, carbs, fat em totals).
5. Se o prato combinar com algo da biblioteca pessoal do usuário (abaixo), use a decomposição salva como referência de proporções, mas ainda assim pergunte a variante de tamanho/tipo se aplicável.
6. Responda sempre em português, de forma direta e concisa.`;

  if (!dishLibrary || dishLibrary.length === 0) return base;

  const library = dishLibrary
    .map((d) => `- ${d.name} (variantes: ${d.variants.join(", ") || "nenhuma"})`)
    .join("\n");

  return `${base}\n\nBiblioteca pessoal de pratos do usuário:\n${library}`;
}

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

  const body = req.body as ParseMealBody;
  if (!body?.history?.length) {
    res.status(400).json({ error: "Histórico de conversa vazio." });
    return;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemInstruction(body.dishLibrary) }] },
        contents: body.history.map((turn) => ({
          role: turn.role,
          parts: [{ text: turn.text }],
        })),
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 3000,
          thinkingConfig: { thinkingBudget: 200 },
          responseSchema: RESPONSE_SCHEMA,
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

  try {
    const parsed = JSON.parse(text);
    res.status(200).json(parsed);
  } catch {
    res.status(502).json({ error: "A IA retornou um JSON inválido." });
  }
}
