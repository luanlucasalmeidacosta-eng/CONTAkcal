import { doc, increment, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const DAILY_AI_MESSAGE_LIMIT = 30;

function todayKey(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function usageDocRef(uid: string) {
  return doc(db, "users", uid, "aiUsage", todayKey());
}

/** Soma 1 mensagem de IA no contador diário do usuário (chamado a cada turno enviado ao Gemini). */
export async function incrementAiMessageCount(uid: string): Promise<void> {
  await setDoc(usageDocRef(uid), { count: increment(1) }, { merge: true });
}

/** Assina o contador de mensagens de IA de hoje, para exibir o aviso de limite diário. */
export function subscribeAiMessageCount(uid: string, callback: (count: number) => void) {
  return onSnapshot(usageDocRef(uid), (snap) => {
    callback((snap.data()?.count as number | undefined) ?? 0);
  });
}
