/**
 * POST para as rotas /api de IA com tempo-limite e mensagens de erro legíveis.
 *
 * O servidor já tenta de novo e troca de modelo quando o Gemini está
 * sobrecarregado; aqui só garantimos que o app nunca fica "carregando" para
 * sempre e que o usuário nunca vê JSON cru nem página de erro da Vercel.
 */

/** Um pouco acima do pior caso do servidor (tentativas + modelo reserva). */
const CLIENT_TIMEOUT_MS = 60_000;

export class AiRequestError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "AiRequestError";
    this.retryable = retryable;
  }
}

function looksLikeRawError(message: string): boolean {
  const trimmed = message.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("<") || trimmed.length > 200;
}

export async function postAi<T>(url: string, body: unknown, fallbackMessage: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    if (controller.signal.aborted) {
      throw new AiRequestError("A IA demorou demais para responder. Tente novamente.", true);
    }
    throw new AiRequestError("Sem conexão com o servidor. Verifique sua internet e tente novamente.", true);
  }
  clearTimeout(timer);

  let data: { error?: unknown } | null = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || data === null) {
    const serverMessage = typeof data?.error === "string" ? data.error : "";
    const retryable = data === null || res.status === 429 || res.status >= 500;
    const message =
      serverMessage && !looksLikeRawError(serverMessage)
        ? serverMessage
        : retryable
          ? "A IA está instável no momento. Tente novamente em alguns segundos."
          : fallbackMessage;
    throw new AiRequestError(message, retryable);
  }

  return data as T;
}
