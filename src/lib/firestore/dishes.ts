import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MealItem, StandardDishDoc } from "./types";

function dishesRef(uid: string) {
  return collection(db, "users", uid, "standard_dishes");
}

export function dishId(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getDishLibrary(uid: string): Promise<StandardDishDoc[]> {
  const snap = await getDocs(dishesRef(uid));
  return snap.docs.map((d) => d.data() as StandardDishDoc);
}

/** Salva ou atualiza uma variante de prato composto na biblioteca pessoal do usuário. */
export async function upsertDish(
  uid: string,
  name: string,
  variantLabel: string,
  items: MealItem[],
): Promise<void> {
  const id = dishId(name);
  const ref = doc(db, "users", uid, "standard_dishes", id);
  const existing = await getDocs(dishesRef(uid));
  const current = existing.docs.find((d) => d.id === id)?.data() as StandardDishDoc | undefined;

  const variantes = current?.variantes ? [...current.variantes] : [];
  const variantIndex = variantes.findIndex((v) => v.label === variantLabel);
  if (variantIndex >= 0) {
    variantes[variantIndex] = { label: variantLabel, items };
  } else {
    variantes.push({ label: variantLabel, items });
  }

  await setDoc(ref, { nome: name, variantes });
}

/** Remove uma variante específica; apaga o prato inteiro se era a última variante. */
export async function deleteDishVariant(uid: string, name: string, variantLabel: string): Promise<void> {
  const id = dishId(name);
  const ref = doc(db, "users", uid, "standard_dishes", id);
  const existing = await getDocs(dishesRef(uid));
  const current = existing.docs.find((d) => d.id === id)?.data() as StandardDishDoc | undefined;
  if (!current) return;

  const variantes = current.variantes.filter((v) => v.label !== variantLabel);
  if (variantes.length === 0) {
    await deleteDoc(ref);
  } else {
    await setDoc(ref, { nome: name, variantes });
  }
}
