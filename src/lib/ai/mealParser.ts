import type { MealItem, MealTotals, StandardDishDoc } from "@/lib/firestore/types";
import { postAi } from "./fetchAi";

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
  return postAi<ParseMealResponse>(
    "/api/parse-meal",
    {
      history,
      dishLibrary: dishLibrary.map((d) => ({
        name: d.nome,
        variants: d.variantes.map((v) => v.label),
      })),
    },
    "Erro ao processar a refeição.",
  );
}
