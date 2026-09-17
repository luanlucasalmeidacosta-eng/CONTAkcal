import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FastingClock } from '@/components/FastingClock'
import { IconClock } from '@/icons'
import { useAuth } from '@/features/auth/AuthContext'
import { FastingDurationModal } from '@/features/fasting/FastingDurationModal'
import { endFast, setFastingDuration, startFast } from '@/lib/firestore/fasting'
import { computeFastEnd, computeFastProgress, formatCountdown } from '@/lib/nutrition/fasting'

const DEFAULT_DURATION_HOURS = 16

function formatDayLabel(date: Date, now: Date): string {
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === now.toDateString()) return `Hoje, ${time}`
  if (date.toDateString() === tomorrow.toDateString()) return `Amanhã, ${time}`
  return `${date.toLocaleDateString('pt-BR')}, ${time}`
}

export function FastingView() {
  const { userDoc } = useAuth()
  const [now, setNow] = useState(() => new Date())
  const [durationModalOpen, setDurationModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!userDoc) return null

  const durationHours = userDoc.fastingDurationHours ?? DEFAULT_DURATION_HOURS
  const startedAt = userDoc.fastingStartedAt ? new Date(userDoc.fastingStartedAt) : null
  const progress = startedAt ? computeFastProgress(startedAt, durationHours, now) : null
  const endsAt = startedAt ? computeFastEnd(startedAt, durationHours) : null

  const remainingLabel = progress
    ? progress.isDone
      ? 'Concluído'
      : formatCountdown(progress.remainingMs)
    : formatCountdown(durationHours * 60 * 60 * 1000)
  const subLabel = progress ? (progress.isDone ? 'jejum finalizado' : 'restantes') : 'toque em começar'

  async function handleToggleFast() {
    if (!userDoc) return
    setBusy(true)
    setError(null)
    try {
      if (startedAt) {
        await endFast(userDoc.uid)
      } else {
        await startFast(userDoc.uid, durationHours)
      }
    } catch (err) {
      console.error('toggle fast failed:', err)
      setError('Não foi possível atualizar o jejum. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveDuration(hours: number) {
    if (!userDoc) return
    try {
      await setFastingDuration(userDoc.uid, hours)
      setDurationModalOpen(false)
    } catch (err) {
      console.error('setFastingDuration failed:', err)
      setError('Não foi possível salvar a duração. Tente novamente.')
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      aria-labelledby="fasting-title"
      className="mx-auto w-full max-w-xl px-5 pt-10 lg:max-w-2xl lg:pt-16"
    >
      <header>
        <h1 id="fasting-title" className="font-display text-3xl font-semibold tracking-tight lg:text-4xl">
          Jejum Intermitente
        </h1>
        <p className="mt-1 text-sm text-muted">Ciclo manual — você inicia quando terminar de comer</p>
      </header>

      <div className="mt-10 flex flex-col items-center">
        <FastingClock pct={progress?.pct ?? 0} remainingLabel={remainingLabel} subLabel={subLabel} />

        <div className="mt-8 grid w-full grid-cols-2 gap-3">
          <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-center">
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              Início do jejum
            </p>
            <p className="tnum mt-1 text-sm font-semibold text-fg">
              {startedAt ? formatDayLabel(startedAt, now) : '—'}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-center">
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              Fim do jejum
            </p>
            <p className="tnum mt-1 text-sm font-semibold text-fg">
              {endsAt ? formatDayLabel(endsAt, now) : '—'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDurationModalOpen(true)}
          className="mt-4 flex min-h-[52px] w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 font-display text-sm font-semibold text-fg transition-colors duration-200 hover:border-accent/60"
        >
          <span className="flex items-center gap-2">
            <IconClock size={18} className="text-accent" />
            Duração do jejum
          </span>
          <span className="tnum text-muted">{durationHours}h</span>
        </button>

        {error && <p className="mt-3 text-xs text-accent-soft">{error}</p>}

        <button
          type="button"
          disabled={busy}
          onClick={handleToggleFast}
          className={`mt-6 min-h-[52px] w-full rounded-2xl font-display text-sm font-semibold uppercase tracking-[0.14em] transition-opacity duration-200 hover:opacity-90 disabled:opacity-50 ${
            startedAt ? 'border border-accent-soft/40 bg-accent-soft/10 text-accent-soft' : 'bg-accent text-bg'
          }`}
        >
          {busy ? 'Salvando…' : startedAt ? 'Encerrar jejum' : 'Começar jejum'}
        </button>
      </div>

      <AnimatePresence>
        {durationModalOpen && (
          <FastingDurationModal
            currentHours={durationHours}
            onClose={() => setDurationModalOpen(false)}
            onSave={handleSaveDuration}
          />
        )}
      </AnimatePresence>
    </motion.section>
  )
}
