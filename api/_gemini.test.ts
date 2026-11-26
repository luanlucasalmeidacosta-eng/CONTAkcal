import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callGemini, parseJsonText } from "./_gemini.js";
import { normalizeMealResponse } from "./parse-meal.js";

function ok(text: string) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
}
function overloaded() {
  return new Response(
    JSON.stringify({ error: { code: 503, message: "This model is currently experiencing high demand.", status: "UNAVAILABLE" } }),
    { status: 503 },
  );
}
function noQuota() {
  return new Response('{"error":{"status":"RESOURCE_EXHAUSTED","message":"quota exceeded"}}', { status: 429 });
}
const urlOf = (call: unknown[]) => String(call[0]);
const bodyOf = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string);

async function run<T>(promise: Promise<T>) {
  await vi.runAllTimersAsync();
  return promise;
}

const MEAL_PAYLOAD = {
  systemInstruction: { parts: [{ text: "INSTRUCAO" }] },
  contents: [{ role: "user", parts: [{ text: "1 tapioca" }] }],
  generationConfig: {
    responseMimeType: "application/json",
    maxOutputTokens: 3000,
    thinkingConfig: { thinkingBudget: 200 },
    responseSchema: { type: "OBJECT" },
  },
};

describe("callGemini", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_FALLBACK_MODEL;
    delete process.env.GROQ_API_KEY;
    delete process.env.GROQ_MODEL;
    delete process.env.AI_PRIMARY_PROVIDER;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it("usa o gemini-3.6-flash primeiro", async () => {
    fetchMock.mockResolvedValueOnce(ok("{}"));
    const result = await run(callGemini("k", MEAL_PAYLOAD));
    expect(result).toMatchObject({ ok: true, model: "gemini-3.6-flash" });
    expect(bodyOf(fetchMock.mock.calls[0])).toEqual(MEAL_PAYLOAD);
  });

  it("tenta de novo uma vez quando o modelo está sobrecarregado", async () => {
    fetchMock.mockResolvedValueOnce(overloaded()).mockResolvedValueOnce(ok("{}"));
    const result = await run(callGemini("k", MEAL_PAYLOAD));
    expect(result).toMatchObject({ ok: true, model: "gemini-3.6-flash" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("com o Flash sobrecarregado, cai no Gemma gratuito com a mesma chave", async () => {
    fetchMock
      .mockResolvedValueOnce(overloaded())
      .mockResolvedValueOnce(overloaded())
      .mockResolvedValueOnce(ok('{"status":"complete"}'));
    const result = await run(callGemini("k", MEAL_PAYLOAD));
    expect(result).toMatchObject({ ok: true, model: "gemma-4-31b-it" });
    expect(urlOf(fetchMock.mock.calls[2])).toContain("models/gemma-4-31b-it:generateContent?key=k");
  });

  it("Gemma recebe a instrução dentro da mensagem e sem campos que ele recusa", async () => {
    fetchMock.mockResolvedValueOnce(noQuota()).mockResolvedValueOnce(ok("{}"));
    await run(callGemini("k", MEAL_PAYLOAD));
    const body = bodyOf(fetchMock.mock.calls[1]);
    expect(body.systemInstruction).toBeUndefined();
    expect(body.generationConfig).toEqual({ maxOutputTokens: 3000 });
    const text: string = body.contents[0].parts[0].text;
    expect(text.startsWith("INSTRUCAO")).toBe(true);
    expect(text).toContain("SOMENTE com um objeto JSON");
    expect(text).toContain('{"type":"OBJECT"}');
    expect(text.endsWith("1 tapioca")).toBe(true);
    // O payload original não é alterado.
    expect(MEAL_PAYLOAD.contents[0].parts[0].text).toBe("1 tapioca");
  });

  it("cota esgotada (429) pula direto para o próximo modelo, sem insistir", async () => {
    fetchMock.mockResolvedValueOnce(noQuota()).mockResolvedValueOnce(ok("ok"));
    const result = await run(callGemini("k", {}));
    expect(result).toMatchObject({ ok: true, model: "gemma-4-31b-it" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("um modelo inexistente (404) pula direto para o próximo", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 404 })).mockResolvedValueOnce(ok("ok"));
    const result = await run(callGemini("k", {}));
    expect(result).toMatchObject({ ok: true, model: "gemma-4-31b-it" });
  });

  it("tempo esgotado num modelo passa ao próximo sem repetir", async () => {
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) =>
          init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))),
        ),
    );
    fetchMock.mockResolvedValueOnce(ok("ok"));
    const result = await run(callGemini("k", {}));
    expect(result).toMatchObject({ ok: true, model: "gemma-4-31b-it" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("nunca devolve o JSON cru do Google quando tudo falha", async () => {
    fetchMock.mockImplementation(async () => overloaded());
    const result = await run(callGemini("k", {}));
    expect(result).toEqual({
      ok: false,
      status: 503,
      message: "A IA está sobrecarregada no momento. Tente novamente em alguns segundos.",
      detail:
        "3.6-flash 503 503 · gemma-4-31b-it 503 503 · gemma-4-26b-a4b-it 503 503 · 3.8-flash 503 503 · 3.5-flash-lite 503 503",
    });
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it("avisa sobre a cota quando todos os modelos estão sem cota", async () => {
    fetchMock.mockImplementation(async () => noQuota());
    const result = await run(callGemini("k", {}));
    expect(result).toMatchObject({ ok: false, status: 429 });
    expect((result as { message: string }).message).toContain("cota gratuita");
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("refaz sem thinkingConfig quando o modelo recusa esse campo", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('{"error":{"message":"thinking_budget is not supported"}}', { status: 400 }))
      .mockResolvedValueOnce(ok("{}"));
    const payload = { generationConfig: { maxOutputTokens: 10, thinkingConfig: { thinkingBudget: 200 } } };
    const result = await run(callGemini("k", payload));
    expect(result).toMatchObject({ ok: true, model: "gemini-3.6-flash" });
    expect(bodyOf(fetchMock.mock.calls[1]).generationConfig).toEqual({ maxOutputTokens: 10 });
  });

  it("GEMINI_FALLBACK_MODEL aceita uma lista separada por vírgula", async () => {
    process.env.GEMINI_FALLBACK_MODEL = "modelo-a, modelo-b";
    fetchMock.mockImplementation(async (url: string) => (url.includes("modelo-b") ? ok("b") : overloaded()));
    const result = await run(callGemini("k", {}));
    expect(result).toMatchObject({ ok: true, model: "modelo-b" });
  });

  function groqOk() {
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"status":"complete"}' } }] }), {
      status: 200,
    });
  }

  it("com GROQ_API_KEY, o Groq é o primeiro, no formato OpenAI", async () => {
    process.env.GROQ_API_KEY = "gk";
    fetchMock.mockImplementation(async (url: string) => (url.includes("api.groq.com") ? groqOk() : ok("google")));
    const result = await run(callGemini("k", MEAL_PAYLOAD));
    expect(result).toMatchObject({ ok: true, model: "openai/gpt-oss-120b", text: '{"status":"complete"}' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const groqCall = fetchMock.mock.calls[0];
    expect(urlOf(groqCall)).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect((groqCall[1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer gk" });
    const body = bodyOf(groqCall);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("INSTRUCAO");
    expect(body.messages[1]).toEqual({ role: "user", content: "1 tapioca" });
  });

  it("se o Groq falhar, segue para o Gemini", async () => {
    process.env.GROQ_API_KEY = "gk";
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("api.groq.com") ? new Response('{"error":{"message":"rate limit"}}', { status: 429 }) : ok("google"),
    );
    const result = await run(callGemini("k", MEAL_PAYLOAD));
    expect(result).toMatchObject({ ok: true, model: "gemini-3.6-flash", text: "google" });
  });

  it("AI_PRIMARY_PROVIDER=google deixa o Groq por último", async () => {
    process.env.GROQ_API_KEY = "gk";
    process.env.AI_PRIMARY_PROVIDER = "google";
    fetchMock.mockImplementation(async (url: string) => (url.includes("api.groq.com") ? groqOk() : noQuota()));
    const result = await run(callGemini("k", MEAL_PAYLOAD));
    expect(result).toMatchObject({ ok: true, model: "openai/gpt-oss-120b" });
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(urlOf(fetchMock.mock.calls[0])).toContain("gemini-3.6-flash");
  });

  it("sem GROQ_API_KEY, o Groq nunca é chamado", async () => {
    fetchMock.mockImplementation(async () => noQuota());
    await run(callGemini("k", MEAL_PAYLOAD));
    expect(fetchMock.mock.calls.some((c) => urlOf(c).includes("groq"))).toBe(false);
  });

  it("ignora partes de raciocínio (thought) ao montar o texto", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "pensando", thought: true }, { text: "{}" }] } }] }),
        { status: 200 },
      ),
    );
    const result = await run(callGemini("k", {}));
    expect(result).toMatchObject({ ok: true, text: "{}" });
  });
});

describe("parseJsonText", () => {
  it("aceita JSON puro, com cerca ```json e com frase em volta", () => {
    expect(parseJsonText('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonText('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonText('Aqui está:\n{"a":{"b":2}}\nPronto.')).toEqual({ a: { b: 2 } });
    expect(() => parseJsonText("sem json")).toThrow();
  });
});

describe("normalizeMealResponse", () => {
  it("converte números em texto e recalcula o total pelos itens", () => {
    const result = normalizeMealResponse({
      status: "complete",
      dishName: "Tapioca",
      items: [
        { name: "Goma de tapioca", quantity: "150g", kcal: "360", protein: 0, carbs: "88,5", fat: 0 },
        { name: "Mussarela", quantity: "30g", kcal: 90, protein: 6.6, carbs: 0.9, fat: "6.9 g" },
      ],
      totals: { kcal: 9999, protein: 0, carbs: 0, fat: 0 },
    });
    expect(result).toEqual({
      status: "complete",
      dishName: "Tapioca",
      items: [
        { name: "Goma de tapioca", quantity: "150g", kcal: 360, protein: 0, carbs: 88.5, fat: 0 },
        { name: "Mussarela", quantity: "30g", kcal: 90, protein: 6.6, carbs: 0.9, fat: 6.9 },
      ],
      totals: { kcal: 450, protein: 6.6, carbs: 89.4, fat: 6.9 },
    });
  });

  it("mantém a pergunta quando falta informação", () => {
    expect(normalizeMealResponse({ status: "need_info", question: "Pequena ou grande?" })).toEqual({
      status: "need_info",
      question: "Pequena ou grande?",
    });
  });

  it("recusa respostas sem itens nem pergunta", () => {
    expect(normalizeMealResponse({ status: "complete", items: [] })).toBeNull();
    expect(normalizeMealResponse({ status: "need_info" })).toBeNull();
    expect(normalizeMealResponse("texto")).toBeNull();
  });
});
