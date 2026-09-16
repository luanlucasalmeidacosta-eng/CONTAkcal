import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { getDishLibrary, upsertDish } from "@/lib/firestore/dishes";
import { addMeal } from "@/lib/firestore/meals";
import type { MealItem, MealTotals } from "@/lib/firestore/types";
import { parseMeal, type ConversationTurn } from "@/lib/ai/mealParser";
import { DAILY_AI_MESSAGE_LIMIT, incrementAiMessageCount, subscribeAiMessageCount } from "@/lib/firestore/aiUsage";

type ChatPhase = "idle" | "loading" | "asking" | "ready" | "saving" | "confirmed" | "error";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export function useMealChat(targetDate?: Date) {
  const { firebaseUser } = useAuth();
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [dishName, setDishName] = useState<string | undefined>();
  const [items, setItems] = useState<MealItem[] | null>(null);
  const [totals, setTotals] = useState<MealTotals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeAiMessageCount(firebaseUser.uid, setMessageCount);
  }, [firebaseUser]);

  const limitReached = messageCount >= DAILY_AI_MESSAGE_LIMIT;

  async function runTurn(nextHistory: ConversationTurn[]) {
    if (!firebaseUser) return;
    if (limitReached) {
      setError(`Você atingiu o limite de ${DAILY_AI_MESSAGE_LIMIT} mensagens de IA hoje. Tente novamente amanhã.`);
      setPhase("error");
      return;
    }
    setPhase("loading");
    setError(null);
    try {
      await incrementAiMessageCount(firebaseUser.uid);
      const library = await getDishLibrary(firebaseUser.uid).catch(() => []);
      const result = await parseMeal(nextHistory, library);
      setHistory([...nextHistory, { role: "model", text: JSON.stringify(result) }]);

      if (result.status === "need_info" && result.question) {
        setMessages((prev) => [...prev, { role: "assistant", text: result.question! }]);
        setPhase("asking");
      } else if (result.status === "complete" && result.items && result.totals) {
        setDishName(result.dishName);
        setItems(result.items);
        setTotals(result.totals);
        setPhase("ready");
      } else {
        throw new Error("Resposta da IA incompleta.");
      }
    } catch (err) {
      console.error("parseMeal failed:", err);
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setPhase("error");
    }
  }

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
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
        at: targetDate,
      });

      if (finalDishName && finalItems.length > 1) {
        await upsertDish(firebaseUser.uid, finalDishName, "padrão", finalItems);
      }

      setHistory([]);
      setItems(null);
      setTotals(null);
      setError(null);
      setPhase("confirmed");
    } catch (err) {
      console.error("confirm meal failed:", err);
      setError(err instanceof Error ? err.message : "Erro ao salvar a refeição.");
      setPhase("error");
    }
  }

  function reset() {
    setPhase("idle");
    setHistory([]);
    setMessages([]);
    setDishName(undefined);
    setItems(null);
    setTotals(null);
    setError(null);
  }

  return {
    phase,
    messages,
    dishName,
    items,
    totals,
    error,
    sendMessage,
    confirm,
    reset,
    messageCount,
    limitReached,
  };
}
