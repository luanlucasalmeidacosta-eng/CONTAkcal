import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/features/auth/AuthContext'
import { PhaseChangeCard } from '@/features/phase/PhaseChangeCard'
import { addWeighIn, subscribeWeighIns, type WeighInWithId } from '@/lib/firestore/weighIns'
import { applyStagnationAdjustment } from '@/lib/firestore/users'
import { computeStagnation } from '@/lib/nutrition/stagnation'
import { PHASE_LABELS, STAGNATION_ADJUSTMENT_KCAL } from '@/lib/nutrition/phase'
import type { WeighInType } from '@/lib/firestore/types'

function toDate(createdAt: unknown): Date {
  return (createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date()
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10)
}

export function AjustesView() {
  const { userDoc, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [weighIns, setWeighIns] = useState<WeighInWithId[]>([])
  const [tipo, setTipo] = useState<WeighInType>('semanal')
  const [peso, setPeso] = useState('')
  const [dataStr, setDataStr] = useState(todayInputValue())
  const [jejum, setJejum] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [bumpSubmitting, setBumpSubmitting] = useState(false)
  const [bumpError, setBumpError] = useState<string | null>(null)
  const [bumpSuccess, setBumpSuccess] = useState(false)

  useEffect(() => {
    if (!userDoc?.uid) return
    return subscribeWeighIns(userDoc.uid, setWeighIns)
  }, [userDoc?.uid])

  if (!userDoc) return null

  const pesoNumero = Number(peso)
  const valid = peso !== '' && pesoNumero > 0 && (tipo === 'semanal' || jejum)

  const stagnation = computeStagnation(
    weighIns.map((w) => ({ peso: w.peso, tipo: w.tipo, createdAt: toDate(w.createdAt) })),
  )

  const currentPhase = userDoc.phaseState?.phase
  const canBumpAdjustment =
    stagnation.isStagnant &&
    (currentPhase === 'bulking' || currentPhase === 'cutting') &&
    userDoc.phaseState &&
    userDoc.maintenanceCalorieGoal

  async function handleBumpAdjustment() {
    if (!userDoc?.phaseState || !userDoc.maintenanceCalorieGoal) return
    setBumpSubmitting(true)
    setBumpError(null)
    try {
      await applyStagnationAdjustment(
        userDoc.uid,
        userDoc.maintenanceCalorieGoal,
        userDoc.phaseState,
        userDoc.phaseHistory ?? [],
      )
      setBumpSuccess(true)
    } catch (err) {
      console.error('applyStagnationAdjustment failed:', err)
      setBumpError('Não foi possível aplicar o ajuste. Tente novamente.')
    } finally {
      setBumpSubmitting(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } catch (err) {
      console.error('logout failed:', err)
      setLoggingOut(false)
    }
  }

  async function handleSubmit() {
    if (!userDoc || !valid) return
    setSubmitting(true)
    setError(null)
    setSuccess(false)
    try {
      const at = dataStr ? new Date(`${dataStr}T12:00:00`) : undefined
      await addWeighIn(userDoc.uid, { peso: pesoNumero, tipo, confirmadoJejumManha: jejum, at })
      setPeso('')
      setJejum(false)
      setDataStr(todayInputValue())
      setSuccess(true)
    } catch (err) {
      console.error('addWeighIn failed:', err)
      setError('Não foi possível registrar. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="mx-auto w-full max-w-xl px-5 pt-10 lg:max-w-2xl lg:pt-16"
    >
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight lg:text-4xl">Ajustes</h1>
        <p className="mt-1 text-sm text-muted">Pesagem e acompanhamento do protocolo</p>
      </header>

      <div className="mt-8 rounded-2xl border border-line bg-surface p-4">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-accent">
          Registrar pesagem
        </p>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setTipo('semanal')}
            className={`min-h-[44px] flex-1 rounded-xl border font-display text-sm font-semibold transition-colors duration-200 ${
              tipo === 'semanal' ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-bg text-muted'
            }`}
          >
            Semanal
          </button>
          <button
            type="button"
            onClick={() => setTipo('mensal')}
            className={`min-h-[44px] flex-1 rounded-xl border font-display text-sm font-semibold transition-colors duration-200 ${
              tipo === 'mensal' ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-bg text-muted'
            }`}
          >
            Mensal
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-bg px-4 py-3">
          <input
            type="number"
            inputMode="decimal"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            placeholder="0"
            className="tnum w-full bg-transparent font-display text-xl font-semibold text-fg placeholder:text-faint focus:outline-none"
          />
          <span className="font-display text-sm text-muted">kg</span>
        </div>

        <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-bg px-4 py-3 text-sm text-fg">
          <span className="text-muted">Data da pesagem</span>
          <input
            type="date"
            value={dataStr}
            max={todayInputValue()}
            onChange={(e) => setDataStr(e.target.value)}
            className="tnum bg-transparent text-right text-fg focus:outline-none"
          />
        </label>

        {tipo === 'mensal' && (
          <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-bg px-4 py-3 text-sm text-fg">
            <input
              type="checkbox"
              checked={jejum}
              onChange={(e) => setJejum(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Pesei em jejum pela manhã
          </label>
        )}

        {error && <p className="mt-3 text-xs text-accent-soft">{error}</p>}
        {success && <p className="mt-3 text-xs text-accent">Pesagem registrada — metas recalculadas.</p>}

        <button
          type="button"
          disabled={!valid || submitting}
          onClick={handleSubmit}
          className="mt-3 min-h-[48px] w-full rounded-xl bg-accent font-display text-sm font-semibold text-bg transition-opacity duration-200 hover:opacity-90 disabled:opacity-40"
        >
          {submitting ? 'Salvando…' : 'Registrar'}
        </button>
      </div>

      {weighIns.length > 0 && (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-faint">
            Status
          </p>
          <p className="mt-2 text-sm text-fg">
            {stagnation.isStagnant
              ? `Estagnado há ${stagnation.weeksStagnant > 0 ? `${stagnation.weeksStagnant} semanas` : `${stagnation.monthsStagnant} mês(es)`} — considere ajustar sua fase.`
              : 'Sem sinais de estagnação no momento.'}
          </p>

          {canBumpAdjustment && !bumpSuccess && (
            <>
              <p className="mt-3 text-xs text-faint">
                Ajuste rápido sem trocar de fase: soma {STAGNATION_ADJUSTMENT_KCAL}kcal ao{' '}
                {currentPhase === 'bulking' ? 'superávit' : 'déficit'} do {PHASE_LABELS[currentPhase!]},
                mantendo a numeração de semana da fase.
              </p>
              <button
                type="button"
                disabled={bumpSubmitting}
                onClick={handleBumpAdjustment}
                className="mt-2 min-h-[44px] w-full rounded-xl border border-accent/40 bg-accent/10 font-display text-xs font-semibold uppercase tracking-[0.14em] text-accent transition-colors duration-200 hover:bg-accent/16 disabled:opacity-50"
              >
                {bumpSubmitting
                  ? 'Aplicando…'
                  : `Ajustar ${currentPhase === 'bulking' ? '+' : '-'}${STAGNATION_ADJUSTMENT_KCAL}kcal`}
              </button>
              {bumpError && <p className="mt-2 text-xs text-accent-soft">{bumpError}</p>}
            </>
          )}
          {bumpSuccess && (
            <p className="mt-3 text-xs text-accent">Ajuste aplicado — calórica recalculada.</p>
          )}
        </div>
      )}

      <PhaseChangeCard />

      <button
        type="button"
        disabled={loggingOut}
        onClick={handleLogout}
        className="mt-6 min-h-[48px] w-full rounded-2xl border border-line font-display text-sm font-semibold text-muted transition-colors duration-200 hover:border-accent-soft hover:text-accent-soft disabled:opacity-50"
      >
        {loggingOut ? 'Saindo…' : 'Sair da conta'}
      </button>
    </motion.section>
  )
}
