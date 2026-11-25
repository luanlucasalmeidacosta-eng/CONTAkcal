import { postAi } from "./fetchAi";

export async function generateSummary(prompt: string): Promise<string> {
  const data = await postAi<{ text: string }>("/api/generate-summary", { prompt }, "Erro ao gerar resumo.");
  return data.text;
}
