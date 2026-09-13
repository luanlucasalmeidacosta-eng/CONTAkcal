import { motion } from "framer-motion";
import { useState } from "react";
import { IconGoogle } from "@/icons";
import { useAuth } from "./AuthContext";

export function LoginView() {
  const { login } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setPending(true);
    setError(null);
    try {
      await login();
    } catch (err) {
      console.error("login failed:", err);
      setError("Não foi possível entrar. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-6 text-center"
    >
      <span className="glow-text font-display text-4xl font-semibold tracking-tight text-accent">
        CONTA<span className="text-fg">kcal</span>
      </span>
      <p className="mt-2 font-display text-xs font-semibold uppercase tracking-[0.2em] text-faint">
        by @vixeluan
      </p>
      <p className="mt-3 max-w-xs text-sm text-muted">
        Conte o que comeu em texto livre. A IA calcula, você foca no resultado.
      </p>

      <button
        type="button"
        onClick={handleLogin}
        disabled={pending}
        className="mt-10 flex min-h-[52px] w-full items-center justify-center gap-3 rounded-2xl border border-line bg-surface px-5 font-display text-sm font-semibold text-fg transition-colors duration-200 hover:border-accent/60 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
      >
        <IconGoogle size={20} />
        {pending ? "Entrando…" : "Continuar com Google"}
      </button>

      {error && <p className="mt-4 text-xs text-accent-soft">{error}</p>}
    </motion.section>
  );
}
