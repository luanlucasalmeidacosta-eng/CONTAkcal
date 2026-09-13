import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { WaterLogDoc } from "./types";

export type WaterLogWithId = WaterLogDoc & { id: string };

function waterLogsRef(uid: string) {
  return collection(db, "users", uid, "water_logs");
}

export async function addWaterLog(uid: string, quantidadeMl: number, at?: Date): Promise<void> {
  await addDoc(waterLogsRef(uid), {
    quantidadeMl,
    createdAt: Timestamp.fromDate(at ?? new Date()),
  });
}

export async function deleteWaterLog(uid: string, logId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "water_logs", logId));
}

function withId(snap: { docs: { id: string; data: () => unknown }[] }): WaterLogWithId[] {
  return snap.docs.map((d) => ({ ...(d.data() as WaterLogDoc), id: d.id }));
}

/** Assina os registros de água do bloco semanal atual (mesma semana usada pelas calorias). */
export function subscribeWeekWaterLogs(
  uid: string,
  weekStart: Date,
  callback: (logs: WaterLogWithId[]) => void,
) {
  const q = query(
    waterLogsRef(uid),
    where("createdAt", ">=", Timestamp.fromDate(weekStart)),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(q, (snap) => callback(withId(snap)));
}

export function sumWater(logs: WaterLogDoc[]): number {
  return logs.reduce((acc, log) => acc + log.quantidadeMl, 0);
}
