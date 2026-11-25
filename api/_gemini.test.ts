import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callGemini } from "./_gemini.js";

function ok(text: string) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
}
function overloaded() {
  return new Response(
    JSON.stringify({ error: { code: 503, message: "This model is currently experiencing high demand.", status: "UNAVAILABLE" } }),
    { status: 503 },
  );
}

async function run(promise: Promise<unknown>) {
  await vi.runAllTimersAsync();
  return promise;
}

describe("callGemini", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_FALLBACK_MODEL;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it("tenta de novo quando o modelo está sobrecarregado e devolve a resposta", async () => {
    fetchMock.mockResolvedValueOnce(overloaded()).mockResolvedValueOnce(ok('{"status":"complete"}'));
    const result = await run(callGemini("k", {}));
    expect(result).toEqual({ ok: true, text: '{"status":"complete"}', model: "gemini-3.8-flash" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("passa para o modelo reserva quando o principal segue indisponível", async () => {
    fetchMock
      .mockResolvedValueOnce(overloaded())
      .mockResolvedValueOnce(overloaded())
      .mockResolvedValueOnce(overloaded())
      .mockResolvedValueOnce(ok("oi"));
    const result = await run(callGemini("k", {}));
    expect(result).toMatchObject({ ok: true, text: "oi", model: "gemini-3.6-flash" });
    expect(String(fetchMock.mock.calls[3][0])).toContain("gemini-3.6-flash");
  });

  it("chega ao flash-lite se os dois Flash estiverem fora", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("gemini-3.5-flash-lite") ? ok("lite") : overloaded(),
    );
    const result = await run(callGemini("k", {}));
    expect(result).toMatchObject({ ok: true, text: "lite", model: "gemini-3.5-flash-lite" });
    expect(fetchMock).toHaveBeenCalledTimes(7);
  });

  it("um modelo inexistente (404) pula direto para o próximo", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 404 })).mockResolvedValueOnce(ok("ok"));
    const result = await run(callGemini("k", {}));
    expect(result).toMatchObject({ ok: true, model: "gemini-3.6-flash" });
  });

  it("refaz sem thinkingConfig quando o modelo recusa esse campo", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('{"error":{"message":"thinking_budget is not supported"}}', { status: 400 }))
      .mockResolvedValueOnce(ok("{}"));
    const payload = { generationConfig: { maxOutputTokens: 10, thinkingConfig: { thinkingBudget: 200 } } };
    const result = await run(callGemini("k", payload));
    expect(result).toMatchObject({ ok: true, model: "gemini-3.8-flash" });
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(secondBody.generationConfig).toEqual({ maxOutputTokens: 10 });
  });

  it("GEMINI_FALLBACK_MODEL aceita uma lista separada por vírgula", async () => {
    process.env.GEMINI_FALLBACK_MODEL = "modelo-a, modelo-b";
    fetchMock.mockImplementation(async (url: string) => (url.includes("modelo-b") ? ok("b") : overloaded()));
    const result = await run(callGemini("k", {}));
    expect(result).toMatchObject({ ok: true, model: "modelo-b" });
  });

  it("nunca devolve o JSON cru do Google quando tudo falha", async () => {
    fetchMock.mockImplementation(async () => overloaded());
    const result = await run(callGemini("k", {}));
    expect(result).toEqual({
      ok: false,
      status: 503,
      message: "A IA está sobrecarregada no momento. Tente novamente em alguns segundos.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(9); // 3 modelos x 3 tentativas
  });

  it("não repete no mesmo modelo um erro de configuração (400)", async () => {
    fetchMock.mockImplementation(async () => new Response("{}", { status: 400 }));
    const result = await run(callGemini("k", {}));
    expect(result).toMatchObject({ ok: false, status: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1x em cada modelo
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
