export async function generateSummary(prompt: string): Promise<string> {
  const res = await fetch("/api/generate-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Erro ao gerar resumo.");
  return data.text as string;
}
