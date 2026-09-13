import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/features/auth/AuthContext'
import { PhaseChangeCard } from '@/features/phase/PhaseChangeCard'
import { addWeighIn, subscribeWeighIns, type WeighInWithId } from '@/lib/firestore/weighIns'
import { computeStagnation } from '@/lib/nutrition/stagnation'
import type { WeighInType } from '@/lib/firestore/types'

function toDate(createdAt: unknown): Date {
  return (createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date()
}

export function AjustesView() {
  const { userDoc } = useAuth()
  const [weighIns, setWeighIns] = useState<WeighInWithId[]>([])
  const [tipo, setTipo] = useState<WeighInType>('semanal')
  const [peso, setPeso] = useState('')
  const [jejum, setJejum] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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

  async function handleSubmit() {
    if (!userDoc || !valid) return
    setSubmitting(true)
    setError(null)
    setSuccess(false)
    try {
      await addWeighIn(userDoc.uid, { peso: pesoNumero, tipo, confirmadoJejumManha: jejum })
      setPeso('')
      setJejum(false)
      setSuccess(true)
    } catch {
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
        </div>
      )}

      <PhaseChangeCard />
    </motion.section>
  )
}
