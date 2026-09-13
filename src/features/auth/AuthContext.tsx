import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { ensureUserDoc, subscribeToUserDoc } from "@/lib/firestore/users";
import type { UserDoc } from "@/lib/firestore/types";

interface AuthContextValue {
  firebaseUser: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      unsubscribeDoc?.();
      unsubscribeDoc = null;

      if (!user) {
        setUserDoc(null);
        setLoading(false);
        return;
      }

      await ensureUserDoc(user.uid, user.email);
      unsubscribeDoc = subscribeToUserDoc(user.uid, (doc) => {
        setUserDoc(doc);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDoc?.();
    };
  }, []);

  const value: AuthContextValue = {
    firebaseUser,
    userDoc,
    loading,
    login: async () => {
      await signInWithPopup(auth, googleProvider);
    },
    logout: async () => {
      await signOut(auth);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
