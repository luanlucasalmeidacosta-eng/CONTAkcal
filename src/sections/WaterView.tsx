import { useState } from 'react'
import { motion } from 'framer-motion'
import { Ring } from '@/components/Ring'
import { IconWater } from '@/icons'
import { useAuth } from '@/features/auth/AuthContext'
import { useWaterProgress } from '@/lib/firestore/useWaterProgress'
import { addWaterLog, deleteWaterLog } from '@/lib/firestore/water'

const QUICK_AMOUNTS = [150, 300, 500]

export function WaterView() {
  const { userDoc } = useAuth()
  const { weekInfo, logsByDay, todayTotalMl } = useWaterProgress(userDoc?.uid, userDoc?.protocolStartedAt)
  const [selectedDay, setSelectedDay] = useState(weekInfo.dayIndexInWeek)
  const [custom, setCustom] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!userDoc) return null

  const goal = userDoc.waterGoal ?? 0
  const isToday = selectedDay === weekInfo.dayIndexInWeek
  const selectedDayLogs = logsByDay.get(selectedDay) ?? []

  async function addQuick(ml: number) {
    if (!userDoc) return
    try {
      await addWaterLog(userDoc.uid, ml)
      setError(null)
    } catch (err) {
      console.error('addWaterLog failed:', err)
      setError('Não foi possível registrar. Tente novamente.')
    }
  }

  async function addCustom() {
    const ml = Number(custom)
    if (!userDoc || !ml || ml <= 0) return
    try {
      await addWaterLog(userDoc.uid, ml)
      setCustom('')
      setError(null)
    } catch (err) {
      console.error('addWaterLog failed:', err)
      setError('Não foi possível registrar. Tente novamente.')
    }
  }

  async function handleRemove(logId: string) {
    if (!userDoc) return
    try {
      await deleteWaterLog(userDoc.uid, logId)
    } catch (err) {
      console.error('deleteWaterLog failed:', err)
      setError('Não foi possível remover. Tente novamente.')
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      aria-labelledby="water-title"
      className="mx-auto w-full max-w-xl px-5 pt-10 lg:max-w-5xl lg:pt-16"
    >
      <header>
        <h1 id="water-title" className="font-display text-3xl font-semibold tracking-tight lg:text-4xl">
          Água
        </h1>
        <p className="mt-1 text-sm text-muted">Meta independente — cada dia começa do zero</p>
      </header>

      <div className="mt-10 flex flex-col items-center">
        <Ring
          animateKey={9}
          value={todayTotalMl}
          goal={goal}
          label="Água"
          sub={`${todayTotalMl.toLocaleString('pt-BR')}ml de ${goal.toLocaleString('pt-BR')}ml`}
          size={216}
          stroke={14}
          emphasized
        />

        <div className="mt-8 flex w-full gap-2">
          {QUICK_AMOUNTS.map((ml) => (
            <button
              key={ml}
              type="button"
              onClick={() => addQuick(ml)}
              className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border border-line bg-surface font-display text-sm font-semibold text-fg transition-colors duration-200 hover:border-accent/60 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <IconWater size={16} className="text-accent" />+{ml}ml
            </button>
          ))}
        </div>

        <div className="mt-3 flex w-full gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            placeholder="Valor customizado (ml)"
            className="min-h-[48px] flex-1 rounded-xl border border-line bg-surface px-4 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={addCustom}
            className="min-h-[48px] rounded-xl bg-accent px-5 font-display text-sm font-semibold text-bg transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent"
          >
            Adicionar
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-accent-soft">{error}</p>}
      </div>

      <footer className="mt-10 lg:mt-14" aria-label="Faixa de dias da semana ativa">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-faint">
          Faixa de dias
        </p>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 7 }, (_, i) => i + 1).map((day) => {
            const isSelected = selectedDay === day
            const isFuture = day > weekInfo.dayIndexInWeek
            const dayTotal = (logsByDay.get(day) ?? []).reduce((acc, l) => acc + l.quantidadeMl, 0)
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                disabled={isFuture}
                aria-pressed={isSelected}
                className={`tnum flex min-h-[52px] min-w-[64px] flex-1 flex-col items-center justify-center rounded-xl border font-display text-xs font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-30 ${
                  isSelected
                    ? 'border-accent bg-accent/14 text-accent'
                    : 'border-line bg-surface text-muted hover:text-fg'
                }`}
              >
                <span>Dia {day}</span>
                {!isFuture && <span className="text-[10px] text-faint">{dayTotal}ml</span>}
              </button>
            )
          })}
        </div>

        <div className="mt-3 rounded-2xl border border-line bg-surface p-3">
          {selectedDayLogs.length === 0 ? (
            <p className="px-2 py-3 text-sm text-faint">
              {isToday ? 'Nenhum registro ainda hoje.' : 'Nenhum registro neste dia.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selectedDayLogs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg px-3 py-2"
                >
                  <p className="tnum text-sm text-fg">{log.quantidadeMl}ml</p>
                  <button
                    type="button"
                    onClick={() => handleRemove(log.id)}
                    className="shrink-0 text-xs text-faint hover:text-accent-soft focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </footer>
    </motion.section>
  )
}
