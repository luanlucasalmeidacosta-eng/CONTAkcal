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
 * - gemini-3.8-flash: Flash estável mais novo (GA em 02/09/2026), sem data de desligamento.
 * - gemini-3.6-flash: geração anterior, ainda ativo; serve de reserva.
 * - gemini-3.5-flash-lite: estável, mais leve e em outra capacidade; última reserva.
 * Dá para trocar sem mexer no código: GEMINI_MODEL e GEMINI_FALLBACK_MODEL
 * (este aceita vários, separados por vírgula).
 */
const DEFAULT_PRIMARY_MODEL = "gemini-3.8-flash";
const DEFAULT_FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite"];

/** Tempo máximo de cada tentativa individual. */
const ATTEMPT_TIMEOUT_MS = 20_000;
/** Espera antes de cada nova tentativa no mesmo modelo. */
const RETRY_DELAYS_MS = [800, 2000];
/** Tempo total máximo somando todas as tentativas (o app desiste em 60s). */
const TOTAL_DEADLINE_MS = 45_000;

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export type GeminiResult =
  | { ok: true; text: string; model: string }
  | { ok: false; status: number; message: string };

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
  const startedAt = Date.now();

  for (const model of modelChain()) {
    let modelPayload = payload;
    for (let i = 0; i <= RETRY_DELAYS_MS.length; i++) {
      if (i > 0) await sleep(RETRY_DELAYS_MS[i - 1]);
      if (Date.now() - startedAt > TOTAL_DEADLINE_MS) {
        return { ok: false, ...friendlyError(lastStatus) };
      }

      const result = await attempt(apiKey, model, modelPayload);

      if (result.kind !== "http") {
        console.warn(`[gemini] ${model} tentativa ${i + 1}: ${result.kind}`);
        lastStatus = result.kind;
        continue;
      }

      if (result.status >= 200 && result.status < 300) {
        const text = extractText(result.body);
        if (text) return { ok: true, text, model };
        // Resposta vazia (ex: corte por segurança ou por tokens): vale tentar de novo.
        console.warn(`[gemini] ${model} tentativa ${i + 1}: resposta vazia`, result.body.slice(0, 500));
        lastStatus = 502;
        continue;
      }

      console.warn(`[gemini] ${model} tentativa ${i + 1}: HTTP ${result.status}`, result.body.slice(0, 500));
      lastStatus = result.status;

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
        // 400/401/403/404: erro de configuração. Repetir no mesmo modelo não adianta;
        // um 404 (modelo inexistente) ainda pode ser resolvido pelo modelo reserva.
        break;
      }
    }
  }

  return { ok: false, ...friendlyError(lastStatus) };
}

function friendlyError(status: number | "timeout" | "network"): { status: number; message: string } {
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
