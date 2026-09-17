import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

function userRef(uid: string) {
  return doc(db, "users", uid);
}

/** Inicia um novo ciclo de jejum a partir de agora, com a duração alvo em horas. */
export async function startFast(uid: string, durationHours: number): Promise<void> {
  await setDoc(
    userRef(uid),
    { fastingDurationHours: durationHours, fastingStartedAt: new Date().toISOString() },
    { merge: true },
  );
}

/** Encerra o ciclo de jejum ativo antes do previsto. */
export async function endFast(uid: string): Promise<void> {
  await setDoc(userRef(uid), { fastingStartedAt: null }, { merge: true });
}

/** Só ajusta a duração alvo (usado pela ferramenta de horas), sem iniciar/parar um ciclo. */
export async function setFastingDuration(uid: string, durationHours: number): Promise<void> {
  await setDoc(userRef(uid), { fastingDurationHours: durationHours }, { merge: true });
}
