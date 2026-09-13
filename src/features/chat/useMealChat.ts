import { useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { getDishLibrary, upsertDish } from "@/lib/firestore/dishes";
import { addMeal } from "@/lib/firestore/meals";
import type { MealItem, MealTotals } from "@/lib/firestore/types";
import { parseMeal, type ConversationTurn } from "@/lib/ai/mealParser";

type ChatPhase = "idle" | "loading" | "asking" | "ready" | "saving" | "confirmed" | "error";

export function useMealChat() {
  const { firebaseUser } = useAuth();
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [question, setQuestion] = useState<string | null>(null);
  const [dishName, setDishName] = useState<string | undefined>();
  const [items, setItems] = useState<MealItem[] | null>(null);
  const [totals, setTotals] = useState<MealTotals | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runTurn(nextHistory: ConversationTurn[]) {
    if (!firebaseUser) return;
    setPhase("loading");
    setError(null);
    try {
      const library = await getDishLibrary(firebaseUser.uid).catch(() => []);
      const result = await parseMeal(nextHistory, library);
      setHistory([...nextHistory, { role: "model", text: JSON.stringify(result) }]);

      if (result.status === "need_info" && result.question) {
        setQuestion(result.question);
        setPhase("asking");
      } else if (result.status === "complete" && result.items && result.totals) {
        setDishName(result.dishName);
        setItems(result.items);
        setTotals(result.totals);
        setQuestion(null);
        setPhase("ready");
      } else {
        throw new Error("Resposta da IA incompleta.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setPhase("error");
    }
  }

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    void runTurn([...history, { role: "user", text: trimmed }]);
  }

  async function confirm(finalItems: MealItem[], finalDishName: string | undefined) {
    if (!firebaseUser || !totals) return;
    setPhase("saving");
    const rawText = history
      .filter((turn) => turn.role === "user")
      .map((turn) => turn.text)
      .join(" — ");
    try {
      const recalculatedTotals: MealTotals = finalItems.reduce(
        (acc, item) => ({
          kcal: acc.kcal + item.kcal,
          protein: acc.protein + item.protein,
          carbs: acc.carbs + item.carbs,
          fat: acc.fat + item.fat,
        }),
        { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      );

      await addMeal(firebaseUser.uid, {
        rawText,
        dishName: finalDishName,
        items: finalItems,
        totals: recalculatedTotals,
      });

      if (finalDishName && finalItems.length > 1) {
        await upsertDish(firebaseUser.uid, finalDishName, "padrão", finalItems);
      }

      setHistory([]);
      setQuestion(null);
      setDishName(undefined);
      setItems(null);
      setTotals(null);
      setError(null);
      setPhase("confirmed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar a refeição.");
      setPhase("error");
    }
  }

  function reset() {
    setPhase("idle");
    setHistory([]);
    setQuestion(null);
    setDishName(undefined);
    setItems(null);
    setTotals(null);
    setError(null);
  }

  return { phase, question, dishName, items, totals, error, sendMessage, confirm, reset };
}
