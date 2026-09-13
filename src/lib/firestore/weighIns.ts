import {
  Timestamp,
  addDoc,
  collection,
  doc as fsDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
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
  /** Data da pesagem; padrão agora. Permite registrar retroativamente uma pesagem esquecida. */
  at?: Date;
}

/**
 * Registra a pesagem. As metas de proteína/gordura/água (spec seção 6) só
 * são recalculadas com esse peso se ele for, na data informada, o mais
 * recente conhecido — evita que uma pesagem retroativa antiga sobrescreva
 * as metas atuais com um peso desatualizado.
 */
export async function addWeighIn(uid: string, input: NewWeighIn): Promise<void> {
  const at = input.at ?? new Date();

  const latestSnap = await getDocs(query(weighInsRef(uid), orderBy("createdAt", "desc"), limit(1)));
  const latest = latestSnap.docs[0]?.data() as WeighInDoc | undefined;
  const isMostRecent = !latest || at.getTime() >= (latest.createdAt as Timestamp).toMillis();

  await addDoc(weighInsRef(uid), {
    peso: input.peso,
    tipo: input.tipo,
    confirmadoJejumManha: input.confirmadoJejumManha,
    createdAt: Timestamp.fromDate(at),
  });

  if (isMostRecent) {
    const { proteinGrams, fatGrams, waterMl } = calculateDerivedGoals(input.peso);
    await setDoc(
      fsDoc(db, "users", uid),
      { weightKg: input.peso, proteinGoal: proteinGrams, fatGoal: fatGrams, waterGoal: waterMl },
      { merge: true },
    );
  }
}

export function subscribeWeighIns(uid: string, callback: (weighIns: WeighInWithId[]) => void) {
  const q = query(weighInsRef(uid), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ ...(d.data() as WeighInDoc), id: d.id })));
  });
}
