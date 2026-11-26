/**
 * Chamada ao Gemini com tentativas automáticas e modelo reserva.
 *
 * Arquivos em /api que começam com "_" não viram rota na Vercel, então este
 * módulo é só um helper compartilhado por parse-meal e generate-summary.
 *
 * Quando o Google responde 429/500/503/504 (ex: "This model is currently
 * experiencing high demand"), ou a chamada estoura o tempo, tentamos de novo
 * com espera crescente e, se o modelo principal seguir indisponível, passamos
 * para o modelo reserva. O erro cru do Google nunca vai para o usuário: fica
 * só no log do servidor.
 */

/**
 * Modelos (pesquisa de nov/2026):
 * - gemini-3.6-flash: o que o app sempre usou e que funcionava nesta conta; fica em primeiro.
 * - gemini-3.8-flash: Flash estável mais novo (GA em 02/09/2026); há relatos de 503
 *   constante nele no plano gratuito, por isso entra como reserva.
 * - gemini-3.5-flash-lite: estável, mais leve e em outra capacidade; última reserva.
 * Dá para trocar sem mexer no código: GEMINI_MODEL e GEMINI_FALLBACK_MODEL
 * (este aceita vários, separados por vírgula).
 */
const DEFAULT_PRIMARY_MODEL = "gemini-3.6-flash";
const DEFAULT_FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];

/** Tempo máximo de cada tentativa individual. */
const ATTEMPT_TIMEOUT_MS = 20_000;
/** Espera antes de cada nova tentativa no mesmo modelo. */
const RETRY_DELAYS_MS = [800, 2000];
/** Tempo total máximo somando todas as tentativas (o app desiste em 60s). */
const TOTAL_DEADLINE_MS = 45_000;

const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);

export type GeminiResult =
  | { ok: true; text: string; model: string }
  | { ok: false; status: number; message: string; detail: string };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function modelChain(): string[] {
  const primary = process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL;
  const fallbacks =
    process.env.GEMINI_FALLBACK_MODEL !== undefined
      ? process.env.GEMINI_FALLBACK_MODEL.split(",").map((m) => m.trim()).filter(Boolean)
      : DEFAULT_FALLBACK_MODELS;
  return [...new Set([primary, ...fallbacks])];
}

/** Mesma requisição sem thinkingConfig, para modelos que recusam esse campo. */
function withoutThinkingConfig(payload: unknown): unknown | null {
  const p = payload as { generationConfig?: Record<string, unknown> } | null;
  if (!p?.generationConfig || !("thinkingConfig" in p.generationConfig)) return null;
  const { thinkingConfig: _omit, ...generationConfig } = p.generationConfig;
  return { ...p, generationConfig };
}

async function attempt(
  apiKey: string,
  model: string,
  payload: unknown,
): Promise<{ kind: "http"; status: number; body: string } | { kind: "timeout" | "network" }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );
    return { kind: "http", status: response.status, body: await response.text() };
  } catch {
    return { kind: controller.signal.aborted ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

function extractText(body: string): string | undefined {
  try {
    const data = JSON.parse(body);
    const parts: { text?: string; thought?: boolean }[] = data.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .filter((p) => !p.thought && typeof p.text === "string")
      .map((p) => p.text)
      .join("");
    return text || undefined;
  } catch {
    return undefined;
  }
}

export async function callGemini(apiKey: string, payload: unknown): Promise<GeminiResult> {
  let lastStatus: number | "timeout" | "network" = 503;
  let quotaExhausted = false;
  const startedAt = Date.now();
  // Resumo do que cada modelo respondeu, mostrado em letra pequena no app
  // quando tudo falha (ex: "3.6-flash 503 503 503 · 3.8-flash 429").
  const outcomes = new Map<string, string[]>();
  const note = (model: string, outcome: string) =>
    outcomes.set(model, [...(outcomes.get(model) ?? []), outcome]);
  const fail = () => {
    const detail = [...outcomes].map(([m, o]) => `${m.replace(/^gemini-/, "")} ${o.join(" ")}`).join(" · ");
    console.warn(`[gemini] falhou em todos os modelos: ${detail}`);
    return { ok: false as const, detail, ...friendlyError(lastStatus, quotaExhausted) };
  };

  for (const model of modelChain()) {
    let modelPayload = payload;
    for (let i = 0; i <= RETRY_DELAYS_MS.length; i++) {
      if (i > 0) await sleep(RETRY_DELAYS_MS[i - 1]);
      if (Date.now() - startedAt > TOTAL_DEADLINE_MS) return fail();

      const result = await attempt(apiKey, model, modelPayload);

      if (result.kind !== "http") {
        console.warn(`[gemini] ${model} tentativa ${i + 1}: ${result.kind}`);
        note(model, result.kind === "timeout" ? "tempo" : "rede");
        lastStatus = result.kind;
        continue;
      }

      if (result.status >= 200 && result.status < 300) {
        const text = extractText(result.body);
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
      if (result.status === 429 && /quota|RESOURCE_EXHAUSTED/i.test(result.body)) quotaExhausted = true;

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
  if (quotaExhausted) {
    return {
      status: 429,
      message:
        "A cota de uso do Gemini acabou por agora. Ela é renovada pelo Google; ativar o faturamento na chave da API evita esse limite.",
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
