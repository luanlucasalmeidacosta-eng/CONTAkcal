/**
 * Chamada de IA com tentativas automáticas e uma fila de modelos reserva.
 *
 * Arquivos em /api que começam com "_" não viram rota na Vercel, então este
 * módulo é só um helper compartilhado por parse-meal e generate-summary.
 *
 * A requisição é montada no formato do Gemini (systemInstruction, contents,
 * generationConfig) e adaptada para cada modelo da fila:
 *
 *  1. gemini-3.6-flash      o que o app sempre usou; melhor qualidade.
 *  2. gemma-4-31b-it        gratuito, mesma GEMINI_API_KEY, cota própria
 *  3. gemma-4-26b-a4b-it    (~14.400 pedidos/dia) e sem plano pago.
 *  4. gemini-3.8-flash      Flash mais novo; cota gratuita bem pequena.
 *  5. gemini-3.5-flash-lite estável, mais leve.
 *  6. Groq (opcional)       outro provedor, gratuito sem cartão; só entra se
 *                           GROQ_API_KEY estiver configurada na Vercel.
 *
 * O plano gratuito do Gemini Flash tem cota diária pequena e fica no fim da
 * fila quando o Google está sobrecarregado (erro 503). Os Gemma e o Groq não
 * dividem essa fila nem essa cota, então seguram o app sem faturamento.
 *
 * Dá para mudar a fila sem mexer no código:
 *  - GEMINI_MODEL: primeiro modelo.
 *  - GEMINI_FALLBACK_MODEL: reservas do Google, separadas por vírgula.
 *  - GROQ_API_KEY / GROQ_MODEL: reserva no Groq.
 * O erro cru dos provedores nunca vai para o usuário: fica só no log.
 */

const DEFAULT_PRIMARY_MODEL = "gemini-3.6-flash";
const DEFAULT_FALLBACK_MODELS = [
  "gemma-4-31b-it",
  "gemma-4-26b-a4b-it",
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
];
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

/** Espera antes de repetir no mesmo modelo após sobrecarga (503 etc.). */
const RETRY_DELAYS_MS = [1000];
/** Para de tentar modelos novos depois disso (a Vercel corta em 60s). */
const TOTAL_DEADLINE_MS = 50_000;
/** Nenhuma tentativa passa deste ponto, contado do início. */
const HARD_LIMIT_MS = 56_000;

const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);

export type GeminiResult =
  | { ok: true; text: string; model: string }
  | { ok: false; status: number; message: string; detail: string };

interface GeminiPayload {
  systemInstruction?: { parts?: { text?: string }[] };
  contents?: { role: string; parts: { text?: string }[] }[];
  generationConfig?: Record<string, unknown> & {
    responseMimeType?: string;
    responseSchema?: unknown;
    maxOutputTokens?: number;
  };
}

type Target = { provider: "google" | "groq"; model: string; timeoutMs: number };

type AttemptResult = { kind: "http"; status: number; body: string } | { kind: "timeout" | "network" };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isGemma(model: string) {
  return model.startsWith("gemma-");
}

function targets(): Target[] {
  const primary = process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL;
  const fallbacks =
    process.env.GEMINI_FALLBACK_MODEL !== undefined
      ? process.env.GEMINI_FALLBACK_MODEL.split(",").map((m) => m.trim()).filter(Boolean)
      : DEFAULT_FALLBACK_MODELS;
  const list: Target[] = [...new Set([primary, ...fallbacks])].map((model) => ({
    provider: "google",
    model,
    // Gemma é maior e mais lento para escrever o JSON inteiro.
    timeoutMs: isGemma(model) ? 30_000 : 20_000,
  }));
  if (process.env.GROQ_API_KEY) {
    list.push({ provider: "groq", model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL, timeoutMs: 25_000 });
  }
  return list;
}

function systemText(payload: GeminiPayload): string {
  return (payload.systemInstruction?.parts ?? []).map((p) => p.text ?? "").join("\n").trim();
}

/** Instrução de formato para modelos sem saída estruturada nativa. */
function jsonInstruction(payload: GeminiPayload): string {
  const cfg = payload.generationConfig;
  if (cfg?.responseMimeType !== "application/json") return "";
  const schema = cfg.responseSchema ? `\nEsquema (OpenAPI) que o JSON deve seguir:\n${JSON.stringify(cfg.responseSchema)}` : "";
  return `\n\nFORMATO DA RESPOSTA: responda SOMENTE com um objeto JSON válido, sem texto antes ou depois e sem blocos de código.${schema}`;
}

/** Mesma requisição sem thinkingConfig, para modelos que recusam esse campo. */
function withoutThinkingConfig(payload: GeminiPayload): GeminiPayload | null {
  if (!payload.generationConfig || !("thinkingConfig" in payload.generationConfig)) return null;
  const { thinkingConfig: _omit, ...generationConfig } = payload.generationConfig;
  return { ...payload, generationConfig };
}

/**
 * Gemma pela API do Gemini não aceita systemInstruction, saída JSON nativa
 * nem thinkingConfig: a instrução vai no começo da primeira mensagem do
 * usuário e o formato JSON é pedido por texto.
 */
function adaptForGemma(payload: GeminiPayload): GeminiPayload {
  const preamble = `${systemText(payload)}${jsonInstruction(payload)}`.trim();
  const contents = (payload.contents ?? []).map((c) => ({ ...c, parts: c.parts.map((p) => ({ ...p })) }));
  if (preamble) {
    const first = contents.find((c) => c.role === "user");
    if (first && first.parts[0]) {
      first.parts[0].text = `${preamble}\n\n---\n\nMensagem do usuário:\n${first.parts[0].text ?? ""}`;
    } else {
      contents.unshift({ role: "user", parts: [{ text: preamble }] });
    }
  }
  const generationConfig: Record<string, unknown> = {};
  const max = payload.generationConfig?.maxOutputTokens;
  if (max) generationConfig.maxOutputTokens = max;
  return { contents, generationConfig };
}

async function post(url: string, init: RequestInit, timeoutMs: number): Promise<AttemptResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return { kind: "http", status: response.status, body: await response.text() };
  } catch {
    return { kind: controller.signal.aborted ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

function callGoogle(apiKey: string, model: string, payload: GeminiPayload, timeoutMs: number) {
  return post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    timeoutMs,
  );
}

function callGroq(model: string, payload: GeminiPayload, timeoutMs: number) {
  const wantsJson = payload.generationConfig?.responseMimeType === "application/json";
  const messages = [
    { role: "system", content: `${systemText(payload)}${jsonInstruction(payload)}`.trim() },
    ...(payload.contents ?? []).map((c) => ({
      role: c.role === "model" ? "assistant" : "user",
      content: c.parts.map((p) => p.text ?? "").join("\n"),
    })),
  ];
  return post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model,
        messages,
        max_completion_tokens: payload.generationConfig?.maxOutputTokens ?? 3000,
        ...(wantsJson ? { response_format: { type: "json_object" } } : {}),
      }),
    },
    timeoutMs,
  );
}

function extractText(provider: Target["provider"], body: string): string | undefined {
  try {
    const data = JSON.parse(body);
    if (provider === "groq") {
      const text = data.choices?.[0]?.message?.content;
      return typeof text === "string" && text.trim() ? text : undefined;
    }
    const parts: { text?: string; thought?: boolean }[] = data.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .filter((p) => !p.thought && typeof p.text === "string")
      .map((p) => p.text)
      .join("");
    return text.trim() ? text : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Tira o JSON de dentro de uma resposta em texto (cercas ```json, frase
 * antes/depois). Modelos com saída estruturada já devolvem JSON puro.
 */
export function parseJsonText(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("Sem JSON na resposta.");
    return JSON.parse(unfenced.slice(start, end + 1));
  }
}

function shortName(model: string) {
  return model.replace(/^gemini-/, "").replace(/^openai\//, "");
}

export async function callGemini(apiKey: string, payload: unknown): Promise<GeminiResult> {
  const base = payload as GeminiPayload;
  let lastStatus: number | "timeout" | "network" = 503;
  let quotaExhausted = false;
  const startedAt = Date.now();
  // Resumo do que cada modelo respondeu, mostrado em letra pequena no app
  // quando tudo falha (ex: "3.6-flash 503 503 · gemma-4-31b-it 429").
  const outcomes = new Map<string, string[]>();
  const note = (model: string, outcome: string) =>
    outcomes.set(model, [...(outcomes.get(model) ?? []), outcome]);
  const fail = () => {
    const detail = [...outcomes].map(([m, o]) => `${shortName(m)} ${o.join(" ")}`).join(" · ");
    console.warn(`[gemini] falhou em todos os modelos: ${detail}`);
    return { ok: false as const, detail, ...friendlyError(lastStatus, quotaExhausted) };
  };

  for (const target of targets()) {
    const { provider, model } = target;
    let modelPayload: GeminiPayload = provider === "google" && isGemma(model) ? adaptForGemma(base) : base;

    for (let i = 0; i <= RETRY_DELAYS_MS.length; i++) {
      if (i > 0) await sleep(RETRY_DELAYS_MS[i - 1]);
      const elapsed = Date.now() - startedAt;
      if (elapsed > TOTAL_DEADLINE_MS) return fail();
      const timeoutMs = Math.min(target.timeoutMs, HARD_LIMIT_MS - elapsed);

      const result =
        provider === "groq"
          ? await callGroq(model, modelPayload, timeoutMs)
          : await callGoogle(apiKey, model, modelPayload, timeoutMs);

      if (result.kind !== "http") {
        console.warn(`[gemini] ${model} tentativa ${i + 1}: ${result.kind}`);
        note(model, result.kind === "timeout" ? "tempo" : "rede");
        lastStatus = result.kind;
        // Tempo esgotado num modelo lento: melhor ir para o próximo do que repetir.
        if (result.kind === "timeout") break;
        continue;
      }

      if (result.status >= 200 && result.status < 300) {
        const text = extractText(provider, result.body);
        if (text) {
          if (outcomes.size > 0) console.info(`[gemini] respondeu com ${model} após falhas`);
          return { ok: true, text, model };
        }
        // Resposta vazia (ex: corte por segurança ou por tokens): vale tentar de novo.
        console.warn(`[gemini] ${model} tentativa ${i + 1}: resposta vazia`, result.body.slice(0, 500));
        note(model, "vazio");
        lastStatus = 502;
        continue;
      }

      console.warn(`[gemini] ${model} tentativa ${i + 1}: HTTP ${result.status}`, result.body.slice(0, 500));
      lastStatus = result.status;
      note(model, String(result.status));
      if (result.status === 429 && /quota|RESOURCE_EXHAUSTED|rate limit/i.test(result.body)) quotaExhausted = true;

      if (result.status === 400 && /thinking/i.test(result.body)) {
        // Modelo não aceita o thinkingConfig enviado: repete na hora sem ele.
        const stripped = withoutThinkingConfig(modelPayload);
        if (stripped) {
          modelPayload = stripped;
          i--;
          continue;
        }
      }

      if (!RETRYABLE_STATUS.has(result.status)) {
        // 429 (cota do modelo esgotada) e 400/401/403/404 (configuração): repetir no
        // mesmo modelo não adianta; o próximo modelo da lista ainda pode responder.
        break;
      }
    }
  }

  return fail();
}

function friendlyError(
  status: number | "timeout" | "network",
  quotaExhausted: boolean,
): { status: number; message: string } {
  if (status === 429 && quotaExhausted) {
    return {
      status: 429,
      message: "A cota gratuita de IA de hoje acabou em todos os modelos. Ela é renovada pelo Google; tente mais tarde.",
    };
  }
  if (status === "timeout") {
    return { status: 504, message: "A IA demorou demais para responder. Tente novamente em instantes." };
  }
  if (status === "network" || status === 503 || status === 500 || status === 502 || status === 504) {
    return {
      status: 503,
      message: "A IA está sobrecarregada no momento. Tente novamente em alguns segundos.",
    };
  }
  if (status === 429) {
    return { status: 429, message: "Muitas solicitações à IA agora. Aguarde um pouco e tente de novo." };
  }
  return { status: 502, message: "Não foi possível falar com a IA agora. Tente novamente mais tarde." };
}
