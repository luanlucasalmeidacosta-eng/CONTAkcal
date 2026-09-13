import { useState } from 'react'
import { motion } from 'framer-motion'
import { PhaseChip } from '@/components/PhaseChip'
import { Ring } from '@/components/Ring'
import { useAuth } from '@/features/auth/AuthContext'
import { useTodayTotals } from '@/lib/firestore/useTodayTotals'
import { useWeekProgress } from '@/lib/firestore/useWeekProgress'
import { deriveCarbGoal } from '@/lib/firestore/users'
import { deleteMeal } from '@/lib/firestore/meals'
import { PHASE_LABELS } from '@/lib/nutrition/phase'

export function WeekView() {
  const { userDoc } = useAuth()
  const todayTotals = useTodayTotals(userDoc?.uid)
  const { weekInfo, mealsByDay, weekTotalsSoFar } = useWeekProgress(userDoc?.uid, userDoc?.protocolStartedAt)
  const [selectedDay, setSelectedDay] = useState(weekInfo.dayIndexInWeek)
  const [error, setError] = useState<string | null>(null)

  if (!userDoc) return null

  const carbGoal = deriveCarbGoal(userDoc)
  const weeklyCalorieGoal = (userDoc.dailyCalorieGoal ?? 0) * 7
  const weeklyCarbGoal = carbGoal * 7
  const weeklyFatGoal = userDoc.fatGoal ?? 0
  const phaseLabel = userDoc.phaseState ? PHASE_LABELS[userDoc.phaseState.phase] : ''
  const selectedDayMeals = mealsByDay.get(selectedDay) ?? []

  async function handleRemove(mealId: string) {
    if (!userDoc) return
    try {
      await deleteMeal(userDoc.uid, mealId)
    } catch {
      setError('Não foi possível remover. Tente novamente.')
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      aria-labelledby="week-title"
      className="mx-auto w-full max-w-xl px-5 pt-10 lg:max-w-5xl lg:pt-16"
    >
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 id="week-title" className="font-display text-3xl font-semibold tracking-tight lg:text-4xl">
            Semana {weekInfo.weekIndex}
          </h1>
          <p className="mt-1 text-sm text-muted">Bloco fixo de 7 dias</p>
        </div>
        {phaseLabel && <PhaseChip phase={phaseLabel} />}
      </header>

      <div className="mt-10 grid gap-6 lg:mt-14 lg:grid-cols-3 lg:items-start">
        <div className="flex flex-col items-center rounded-2xl border border-line bg-surface px-4 py-6">
          <Ring
            animateKey={5}
            value={todayTotals.protein}
            goal={userDoc.proteinGoal ?? 0}
            label="Proteína"
            sub={`${Math.round(todayTotals.protein)}g de ${userDoc.proteinGoal ?? 0}g`}
            size={168}
            stroke={12}
            emphasized
          />
          <p className="mt-3 text-xs text-faint">Meta diária</p>
        </div>
        <div className="flex flex-col items-center rounded-2xl border border-line bg-surface px-4 py-6">
          <Ring
            animateKey={6}
            value={weekTotalsSoFar.kcal}
            goal={weeklyCalorieGoal}
            label="Calorias"
            sub={`${Math.round(weekTotalsSoFar.kcal).toLocaleString('pt-BR')} de ${weeklyCalorieGoal.toLocaleString('pt-BR')} kcal`}
            size={168}
            stroke={12}
          />
          <p className="mt-3 text-xs text-faint">Progresso da semana</p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1 lg:gap-6">
          <div className="flex flex-col items-center rounded-2xl border border-line bg-surface px-3 py-5">
            <Ring
              animateKey={7}
              value={weekTotalsSoFar.carbs}
              goal={weeklyCarbGoal}
              label="Carbo"
              sub={`${Math.round(weekTotalsSoFar.carbs).toLocaleString('pt-BR')}g de ${weeklyCarbGoal.toLocaleString('pt-BR')}g`}
              size={104}
              stroke={9}
            />
          </div>
          <div className="flex flex-col items-center rounded-2xl border border-line bg-surface px-3 py-5">
            <Ring
              animateKey={8}
              value={weekTotalsSoFar.fat}
              goal={weeklyFatGoal}
              label="Gordura"
              sub={`${Math.round(weekTotalsSoFar.fat).toLocaleString('pt-BR')}g de ${weeklyFatGoal.toLocaleString('pt-BR')}g`}
              size={104}
              stroke={9}
            />
          </div>
        </div>
      </div>

      <footer className="mt-10 lg:mt-14" aria-label="Faixa de dias da semana ativa">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-faint">
          Faixa de dias
        </p>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 7 }, (_, i) => i + 1).map((day) => {
            const isSelected = selectedDay === day
            const isFuture = day > weekInfo.dayIndexInWeek
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                disabled={isFuture}
                aria-pressed={isSelected}
                className={`tnum min-h-[44px] min-w-[44px] flex-1 rounded-xl border font-display text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-30 ${
                  isSelected
                    ? 'border-accent bg-accent/14 text-accent'
                    : 'border-line bg-surface text-muted hover:text-fg'
                }`}
              >
                Dia {day}
              </button>
            )
          })}
        </div>

        <div className="mt-3 rounded-2xl border border-line bg-surface p-3">
          {selectedDayMeals.length === 0 ? (
            <p className="px-2 py-3 text-sm text-faint">Nenhuma refeição registrada neste dia.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selectedDayMeals.map((meal) => (
                <li
                  key={meal.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-fg">{meal.dishName ?? meal.rawText}</p>
                    <p className="tnum text-xs text-faint">{Math.round(meal.totals.kcal)} kcal</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(meal.id)}
                    className="shrink-0 text-xs text-faint hover:text-accent-soft focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    remover
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="mt-2 text-xs text-accent-soft">{error}</p>}
        </div>
      </footer>
    </motion.section>
  )
}
