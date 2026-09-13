import { useState } from 'react'
import { ChoiceButton, NumberField, PrimaryButton } from '@/features/onboarding/OnboardingShell'
import { useAuth } from '@/features/auth/AuthContext'
import { changePhase } from '@/lib/firestore/users'
import {
  PHASE_LABELS,
  QUICK_ADJUSTMENT_SUGGESTIONS,
  type Phase,
  type RecompIntent,
} from '@/lib/nutrition/phase'

export function PhaseChangeCard() {
  const { userDoc } = useAuth()
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase | null>(null)
  const [adjustment, setAdjustment] = useState('')
  const [recompIntent, setRecompIntent] = useState<RecompIntent | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!userDoc) return null

  const currentPhase = userDoc.phaseState?.phase
  const phases: Phase[] = ['manutencao', 'bulking', 'cutting', 'recomposicao']

  const valid =
    phase !== null &&
    (phase === 'manutencao' ||
      (phase === 'recomposicao' && recompIntent !== null) ||
      ((phase === 'bulking' || phase === 'cutting') && Number(adjustment) > 0))

  function reset() {
    setPhase(null)
    setAdjustment('')
    setRecompIntent(null)
    setError(null)
  }

  async function handleConfirm() {
    if (!userDoc || !phase || !userDoc.maintenanceCalorieGoal) return
    setSubmitting(true)
    setError(null)
    try {
      await changePhase(
        userDoc.uid,
        userDoc.maintenanceCalorieGoal,
        {
          phase,
          adjustmentKcal: Number(adjustment) || 0,
          recompIntent: recompIntent ?? undefined,
        },
        userDoc.phaseHistory ?? [],
      )
      setSuccess(true)
      setOpen(false)
      reset()
    } catch {
      setError('Não foi possível trocar de fase. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-accent">
            Fase atual
          </p>
          <p className="mt-1 text-sm text-fg">{currentPhase ? PHASE_LABELS[currentPhase] : '—'}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v)
            reset()
          }}
          className="min-h-[40px] rounded-xl border border-line px-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-fg"
        >
          {open ? 'Cancelar' : 'Trocar de fase'}
        </button>
      </div>

      {success && !open && (
        <p className="mt-3 text-xs text-accent">Fase atualizada — a numeração de semana da fase reiniciou.</p>
      )}

      {open && (
        <div className="mt-4 flex flex-col gap-3">
          {phases.map((p) => (
            <ChoiceButton key={p} selected={phase === p} onClick={() => setPhase(p)}>
              {PHASE_LABELS[p]}
            </ChoiceButton>
          ))}

          {phase === 'recomposicao' && (
            <div className="flex flex-col gap-3">
              <ChoiceButton
                selected={recompIntent === 'perder_gordura'}
                onClick={() => setRecompIntent('perder_gordura')}
              >
                Perder gordura
              </ChoiceButton>
              <ChoiceButton
                selected={recompIntent === 'ganhar_massa'}
                onClick={() => setRecompIntent('ganhar_massa')}
              >
                Ganhar massa
              </ChoiceButton>
            </div>
          )}

          {(phase === 'bulking' || phase === 'cutting') && (
            <div>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_ADJUSTMENT_SUGGESTIONS.map((kcal) => (
                  <button
                    key={kcal}
                    type="button"
                    onClick={() => setAdjustment(kcal.toString())}
                    className={`tnum flex min-h-[44px] items-center justify-center rounded-xl border font-display text-sm font-semibold transition-colors duration-200 ${
                      adjustment === kcal.toString()
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-line bg-bg text-fg'
                    }`}
                  >
                    {kcal}
                  </button>
                ))}
              </div>
              <div className="mt-2">
                <NumberField value={adjustment} onChange={setAdjustment} unit="kcal" placeholder="valor customizado" />
              </div>
            </div>
          )}

          {error && <p className="text-xs text-accent-soft">{error}</p>}

          <PrimaryButton disabled={!valid || submitting} onClick={handleConfirm}>
            {submitting ? 'Salvando…' : 'Confirmar troca de fase'}
          </PrimaryButton>
        </div>
      )}
    </div>
  )
}
