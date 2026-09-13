import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MealDoc, MealItem, MealTotals } from "./types";

export type MealWithId = MealDoc & { id: string };

function mealsRef(uid: string) {
  return collection(db, "users", uid, "meals");
}

export interface NewMeal {
  rawText: string;
  dishName?: string;
  items: MealItem[];
  totals: MealTotals;
  /** Data do registro; padrão agora. Usado para registrar refeições em dias passados (faixa de dias). */
  at?: Date;
}

export async function addMeal(uid: string, meal: NewMeal): Promise<void> {
  await addDoc(mealsRef(uid), {
    rawText: meal.rawText,
    dishName: meal.dishName ?? null,
    items: meal.items,
    totals: meal.totals,
    createdAt: Timestamp.fromDate(meal.at ?? new Date()),
  });
}

export async function deleteMeal(uid: string, mealId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "meals", mealId));
}

function startOfToday(): Timestamp {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(now);
}

function withId(snap: { docs: { id: string; data: () => unknown }[] }): MealWithId[] {
  return snap.docs.map((d) => ({ ...(d.data() as MealDoc), id: d.id }));
}

/** Assina as refeições registradas hoje, para somar os totais consumidos no dia. */
export function subscribeTodayMeals(uid: string, callback: (meals: MealWithId[]) => void) {
  const q = query(
    mealsRef(uid),
    where("createdAt", ">=", startOfToday()),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => callback(withId(snap)));
}

/** Assina todas as refeições do bloco semanal atual (desde weekStart), para a aba Semana e a faixa de dias. */
export function subscribeWeekMeals(uid: string, weekStart: Date, callback: (meals: MealWithId[]) => void) {
  const q = query(
    mealsRef(uid),
    where("createdAt", ">=", Timestamp.fromDate(weekStart)),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(q, (snap) => callback(withId(snap)));
}

/** Busca única (sem listener) das refeições num intervalo de datas — usado no relatório mensal. */
export async function getMealsInRange(uid: string, start: Date, end: Date): Promise<MealWithId[]> {
  const q = query(
    mealsRef(uid),
    where("createdAt", ">=", Timestamp.fromDate(start)),
    where("createdAt", "<", Timestamp.fromDate(end)),
    orderBy("createdAt", "asc"),
  );
  const snap = await getDocs(q);
  return withId(snap);
}

export function sumTotals(meals: MealDoc[]): MealTotals {
  return meals.reduce(
    (acc, meal) => ({
      kcal: acc.kcal + meal.totals.kcal,
      protein: acc.protein + meal.totals.protein,
      carbs: acc.carbs + meal.totals.carbs,
      fat: acc.fat + meal.totals.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
