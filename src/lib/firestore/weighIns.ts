import { Timestamp, addDoc, collection, onSnapshot, orderBy, query, setDoc, doc as fsDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calculateDerivedGoals } from "@/lib/nutrition/dri";
import type { WeighInDoc, WeighInType } from "./types";

export type WeighInWithId = WeighInDoc & { id: string };

function weighInsRef(uid: string) {
  return collection(db, "users", uid, "weigh_ins");
}

export interface NewWeighIn {
  peso: number;
  tipo: WeighInType;
  confirmadoJejumManha: boolean;
}

/** Registra a pesagem e recalcula proteína/gordura/água a partir do novo peso (spec seção 6). */
export async function addWeighIn(uid: string, input: NewWeighIn): Promise<void> {
  await addDoc(weighInsRef(uid), {
    peso: input.peso,
    tipo: input.tipo,
    confirmadoJejumManha: input.confirmadoJejumManha,
    createdAt: Timestamp.now(),
  });

  const { proteinGrams, fatGrams, waterMl } = calculateDerivedGoals(input.peso);
  await setDoc(
    fsDoc(db, "users", uid),
    { weightKg: input.peso, proteinGoal: proteinGrams, fatGoal: fatGrams, waterGoal: waterMl },
    { merge: true },
  );
}

export function subscribeWeighIns(uid: string, callback: (weighIns: WeighInWithId[]) => void) {
  const q = query(weighInsRef(uid), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ ...(d.data() as WeighInDoc), id: d.id })));
  });
}
