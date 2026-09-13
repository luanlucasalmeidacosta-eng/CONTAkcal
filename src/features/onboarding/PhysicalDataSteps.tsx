import { useState } from "react";
import type { ActivityLevel, Sex } from "@/lib/nutrition/dri";
import { ChoiceButton, NumberField, OnboardingShell, PrimaryButton } from "./OnboardingShell";
import type { StepProps } from "./types";

export function NameStep({ data, advance, goBack }: StepProps) {
  const [value, setValue] = useState(data.name ?? "");
  const valid = value.trim().length > 0;

  return (
    <OnboardingShell step={0} totalSteps={8} title="Como posso te chamar?" onBack={goBack}>
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4 focus-within:border-accent">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && valid && advance({ name: value.trim() })}
          placeholder="Seu nome"
          autoFocus
          className="w-full bg-transparent font-display text-2xl font-semibold text-fg placeholder:text-faint focus:outline-none"
        />
      </div>
      <PrimaryButton disabled={!valid} onClick={() => advance({ name: value.trim() })}>
        Continuar
      </PrimaryButton>
    </OnboardingShell>
  );
}

export function WeightStep({ data, advance, goBack }: StepProps) {
  const [value, setValue] = useState(data.weightKg?.toString() ?? "");
  const numeric = Number(value);
  const valid = value !== "" && numeric > 0;

  return (
    <OnboardingShell step={1} totalSteps={8} title="Qual seu peso atual?" onBack={goBack}>
      <NumberField value={value} onChange={setValue} unit="kg" placeholder="0" autoFocus />
      <PrimaryButton
        disabled={!valid}
        onClick={() => advance({ weightKg: numeric })}
      >
        Continuar
      </PrimaryButton>
    </OnboardingShell>
  );
}

export function HeightStep({ data, advance, goBack }: StepProps) {
  const [value, setValue] = useState(data.heightCm?.toString() ?? "");
  const numeric = Number(value);
  const valid = value !== "" && numeric > 0;

  return (
    <OnboardingShell step={2} totalSteps={8} title="E sua altura?" onBack={goBack}>
      <NumberField value={value} onChange={setValue} unit="cm" placeholder="0" autoFocus />
      <PrimaryButton
        disabled={!valid}
        onClick={() => advance({ heightCm: numeric })}
      >
        Continuar
      </PrimaryButton>
    </OnboardingShell>
  );
}

export function AgeStep({ data, advance, goBack }: StepProps) {
  const [value, setValue] = useState(data.ageYears?.toString() ?? "");
  const numeric = Number(value);
  const valid = value !== "" && numeric >= 19;

  return (
    <OnboardingShell
      step={3}
      totalSteps={8}
      title="Quantos anos você tem?"
      subtitle="O CONTAkcal usa fórmulas validadas para adultos (19 anos ou mais)."
      onBack={goBack}
    >
      <NumberField value={value} onChange={setValue} unit="anos" placeholder="0" autoFocus />
      {value !== "" && numeric < 19 && (
        <p className="mt-3 text-xs text-accent-soft">O CONTAkcal é voltado para maiores de 19 anos.</p>
      )}
      <PrimaryButton
        disabled={!valid}
        onClick={() => advance({ ageYears: numeric })}
      >
        Continuar
      </PrimaryButton>
    </OnboardingShell>
  );
}

export function SexStep({ data, advance, goBack }: StepProps) {
  const options: { id: Sex; label: string }[] = [
    { id: "masculino", label: "Masculino" },
    { id: "feminino", label: "Feminino" },
  ];

  return (
    <OnboardingShell
      step={4}
      totalSteps={8}
      title="Sexo biológico"
      subtitle="Usado apenas para a fórmula de estimativa energética (DRI 2023)."
      onBack={goBack}
    >
      <div className="flex flex-col gap-3">
        {options.map((opt) => (
          <ChoiceButton
            key={opt.id}
            selected={data.sex === opt.id}
            onClick={() => advance({ sex: opt.id })}
          >
            {opt.label}
          </ChoiceButton>
        ))}
      </div>
    </OnboardingShell>
  );
}

export function ActivityStep({ data, advance, goBack }: StepProps) {
  const options: { id: ActivityLevel; label: string; hint: string }[] = [
    { id: "sedentario", label: "Sedentário", hint: "Pouco ou nenhum exercício" },
    { id: "pouco_ativo", label: "Pouco ativo", hint: "Exercício leve, 1-3x/semana" },
    { id: "ativo", label: "Ativo", hint: "Exercício moderado, 3-5x/semana" },
    { id: "muito_ativo", label: "Muito ativo", hint: "Exercício intenso, 6-7x/semana" },
  ];

  return (
    <OnboardingShell step={5} totalSteps={8} title="Nível de atividade física" onBack={goBack}>
      <div className="flex flex-col gap-3">
        {options.map((opt) => (
          <ChoiceButton
            key={opt.id}
            selected={data.activityLevel === opt.id}
            onClick={() => advance({ activityLevel: opt.id })}
          >
            <span className="flex flex-col gap-0.5">
              <span>{opt.label}</span>
              <span className="text-xs font-normal normal-case tracking-normal text-faint">{opt.hint}</span>
            </span>
          </ChoiceButton>
        ))}
      </div>
    </OnboardingShell>
  );
}
