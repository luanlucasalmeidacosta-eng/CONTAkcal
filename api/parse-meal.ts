import type { VercelRequest, VercelResponse } from "@vercel/node";
import { callGemini, parseJsonText } from "./_gemini.js";

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

const MACROS = ["kcal", "protein", "carbs", "fat"] as const;

function toNumber(value: unknown): number {
  const n = typeof value === "string" ? Number(value.replace(",", ".").replace(/[^\d.-]/g, "")) : Number(value);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

/**
 * Modelos reserva (Gemma, Groq) seguem o formato pelo texto, não por esquema
 * nativo: aqui garantimos o mesmo formato que o app espera de qualquer modelo.
 */
export function normalizeMealResponse(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const rawItems = Array.isArray(r.items) ? r.items : [];
  const items = rawItems
    .filter((it): it is Record<string, unknown> => !!it && typeof it === "object")
    .map((it) => ({
      name: String(it.name ?? "").trim(),
      quantity: String(it.quantity ?? "").trim(),
      ...Object.fromEntries(MACROS.map((k) => [k, toNumber(it[k])])),
    }))
    .filter((it) => it.name);

  const status = r.status === "need_info" || r.status === "complete" ? r.status : items.length ? "complete" : null;
  if (status === "need_info") {
    const question = typeof r.question === "string" ? r.question.trim() : "";
    return question ? { status, question } : null;
  }
  if (status !== "complete" || items.length === 0) return null;

  // Total sempre recalculado pelos itens: evita conta errada do modelo.
  const totals = Object.fromEntries(
    MACROS.map((k) => [k, Math.round(items.reduce((acc, it) => acc + (it as unknown as Record<string, number>)[k], 0) * 10) / 10]),
  );
  const dishName = typeof r.dishName === "string" && r.dishName.trim() ? r.dishName.trim() : undefined;
  return { status, ...(dishName ? { dishName } : {}), items, totals };
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

  const result = await callGemini(apiKey, {
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
  });

  if (!result.ok) {
    res.status(result.status).json({ error: result.message, detail: result.detail, retryable: true });
    return;
  }

  let normalized: Record<string, unknown> | null = null;
  try {
    normalized = normalizeMealResponse(parseJsonText(result.text));
  } catch {
    normalized = null;
  }
  if (!normalized) {
    console.warn("[parse-meal] resposta fora do formato", result.model, result.text.slice(0, 500));
    res.status(502).json({
      error: "A IA respondeu de um jeito inesperado. Tente novamente.",
      detail: `${result.model}: formato inválido`,
      retryable: true,
    });
    return;
  }
  if (result.model !== (process.env.GEMINI_MODEL || "gemini-3.6-flash")) {
    console.info(`[parse-meal] respondido pelo modelo reserva ${result.model}`);
  }
  res.status(200).json(normalized);
}
