import type { MealItem, MealTotals, StandardDishDoc } from "@/lib/firestore/types";

export interface ConversationTurn {
  role: "user" | "model";
  text: string;
}

export interface ParseMealResponse {
  status: "need_info" | "complete";
  question?: string;
  dishName?: string;
  items?: MealItem[];
  totals?: MealTotals;
}

export async function parseMeal(
  history: ConversationTurn[],
  dishLibrary: StandardDishDoc[],
): Promise<ParseMealResponse> {
  const res = await fetch("/api/parse-meal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      history,
      dishLibrary: dishLibrary.map((d) => ({
        name: d.nome,
        variants: d.variantes.map((v) => v.label),
      })),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Erro ao processar a refeição.");
  }
  return data as ParseMealResponse;
}
