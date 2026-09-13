import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface OnboardingShellProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: ReactNode;
}

export function OnboardingShell({ step, totalSteps, title, subtitle, onBack, children }: OnboardingShellProps) {
  return (
    <motion.section
      key={step}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 pb-10 pt-8"
    >
      <div className="flex items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
          >
            ←
          </button>
        ) : (
          <span className="h-9 w-9" aria-hidden="true" />
        )}
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-accent" : "bg-line"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-10 flex flex-1 flex-col">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-fg lg:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
        <div className="mt-8 flex-1">{children}</div>
      </div>
    </motion.section>
  );
}

interface PrimaryButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}

export function PrimaryButton({ onClick, disabled, children }: PrimaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-8 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-accent px-5 font-display text-sm font-semibold text-bg transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40"
    >
      {children}
    </button>
  );
}

interface ChoiceButtonProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function ChoiceButton({ selected, onClick, children }: ChoiceButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-[56px] w-full items-center justify-between rounded-2xl border px-5 text-left font-display text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        selected
          ? "border-accent bg-accent/10 text-accent"
          : "border-line bg-surface text-fg hover:border-accent/40"
      }`}
    >
      {children}
    </button>
  );
}

interface NumberFieldProps {
  value: string;
  onChange: (value: string) => void;
  unit: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function NumberField({ value, onChange, unit, placeholder, autoFocus }: NumberFieldProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4 focus-within:border-accent">
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="tnum w-full bg-transparent font-display text-2xl font-semibold text-fg placeholder:text-faint focus:outline-none"
      />
      <span className="font-display text-sm text-muted">{unit}</span>
    </div>
  );
}
