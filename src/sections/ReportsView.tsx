import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/features/auth/AuthContext'
import { useWeekProgress } from '@/lib/firestore/useWeekProgress'
import { subscribeWeighIns, type WeighInWithId } from '@/lib/firestore/weighIns'
import { deriveCarbGoal } from '@/lib/firestore/users'
import { computeStagnation } from '@/lib/nutrition/stagnation'
import { PHASE_LABELS } from '@/lib/nutrition/phase'
import { generateSummary } from '@/lib/ai/summary'
import { MonthlyReportSection } from '@/features/dashboard/MonthlyReportSection'
import { WeightHistoryChart } from '@/components/WeightHistoryChart'
import type { MealItem } from '@/lib/firestore/types'

function toDate(createdAt: unknown): Date {
  return (createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date()
}

function sumProtein(items: { items: MealItem[] }[]): number {
  return items.reduce((acc, meal) => acc + meal.items.reduce((s, i) => s + i.protein, 0), 0)
}

export function ReportsView() {
  const { userDoc } = useAuth()
  const { weekInfo, mealsByDay, weekTotalsSoFar } = useWeekProgress(userDoc?.uid, userDoc?.protocolStartedAt)
  const [weighIns, setWeighIns] = useState<WeighInWithId[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  useEffect(() => {
    if (!userDoc?.uid) return
    return subscribeWeighIns(userDoc.uid, setWeighIns)
  }, [userDoc?.uid])

  if (!userDoc) return null

  const carbGoal = deriveCarbGoal(userDoc)
  const weeklyCalorieGoal = (userDoc.dailyCalorieGoal ?? 0) * 7
  const weeklyCarbGoal = carbGoal * 7
  const weeklyFatGoal = userDoc.fatGoal ?? 0
  const phaseLabel = userDoc.phaseState ? PHASE_LABELS[userDoc.phaseState.phase] : ''
  const isCutting = userDoc.phaseState?.phase === 'cutting'

  const daysElapsed = weekInfo.dayIndexInWeek
  const avgDailyKcal = daysElapsed > 0 ? weekTotalsSoFar.kcal / daysElapsed : 0

  let proteinDaysHit = 0
  for (let day = 1; day <= daysElapsed; day++) {
    const meals = mealsByDay.get(day) ?? []
    if (sumProtein(meals) >= (userDoc.proteinGoal ?? Infinity)) proteinDaysHit++
  }

  const weighInsThisWeek = weighIns.filter((w) => toDate(w.createdAt) >= weekInfo.weekStart)
  const weeklyWeighIn = weighInsThisWeek.find((w) => w.tipo === 'semanal')
  const previousWeighIn = [...weighIns]
    .filter((w) => toDate(w.createdAt) < weekInfo.weekStart)
    .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())[0]
  const weightVariation =
    weeklyWeighIn && previousWeighIn ? weeklyWeighIn.peso - previousWeighIn.peso : null

  const stagnation = computeStagnation(
    weighIns.map((w) => ({ peso: w.peso, tipo: w.tipo, createdAt: toDate(w.createdAt) })),
  )

  async function handleGenerateSummary() {
    setLoadingSummary(true)
    setSummaryError(null)
    try {
      const prompt = `Fase: ${phaseLabel}. Saldo calórico: ${Math.round(weekTotalsSoFar.kcal)} de ${weeklyCalorieGoal} kcal (meta semanal). Proteína batida em ${proteinDaysHit} de ${daysElapsed} dias avaliados. ${
        weightVariation !== null ? `Variação de peso: ${weightVariation > 0 ? '+' : ''}${weightVariation.toFixed(1)}kg.` : 'Sem pesagem registrada nesta semana.'
      } ${stagnation.isStagnant ? 'Está em estagnação.' : ''}`
      const text = await generateSummary(prompt)
      setSummary(text)
    } catch (err) {
      console.error('generateSummary failed:', err)
      setSummaryError('Não foi possível gerar o resumo agora.')
    } finally {
      setLoadingSummary(false)
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
        <h1 className="font-display text-3xl font-semibold tracking-tight lg:text-4xl">Relatórios</h1>
        <p className="mt-1 text-sm text-muted">Semana {weekInfo.weekIndex} · {phaseLabel}</p>
      </header>

      <div className="mt-8 rounded-2xl border border-line bg-surface p-4">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-faint">
          Visão de longo prazo
        </p>
        <div className="mt-3">
          <WeightHistoryChart weighIns={weighIns} />
        </div>
      </div>

      <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
        <Row label="Saldo calórico" value={`${Math.round(weekTotalsSoFar.kcal).toLocaleString('pt-BR')} de ${weeklyCalorieGoal.toLocaleString('pt-BR')} kcal`} />
        <Row label="Média diária" value={`${Math.round(avgDailyKcal).toLocaleString('pt-BR')} kcal/dia`} />
        <Row label="Meta de proteína batida" value={`${proteinDaysHit} de ${daysElapsed} dias`} />
        <Row label="Carboidrato" value={`${Math.round(weekTotalsSoFar.carbs)}g de ${weeklyCarbGoal}g`} />
        <Row label="Gordura" value={`${Math.round(weekTotalsSoFar.fat)}g de ${weeklyFatGoal}g`} />
        <Row
          label="Variação de peso"
          value={weightVariation !== null ? `${weightVariation > 0 ? '+' : ''}${weightVariation.toFixed(1)}kg` : 'Sem pesagem registrada'}
        />
        <Row
          label="Status da fase"
          value={stagnation.isStagnant ? 'Estagnado' : 'Progredindo'}
        />
      </div>

      <MonthlyReportSection />

      <div className="mt-6 rounded-2xl border border-accent/40 bg-surface-2 p-4">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-accent">
          Resumo da IA
        </p>
        {summary ? (
          <p className="mt-2 text-sm text-fg">{summary}</p>
        ) : (
          <button
            type="button"
            onClick={handleGenerateSummary}
            disabled={loadingSummary}
            className="mt-3 min-h-[44px] w-full rounded-xl bg-accent font-display text-xs font-semibold uppercase tracking-[0.14em] text-bg transition-opacity duration-200 hover:opacity-90 disabled:opacity-50"
          >
            {loadingSummary ? 'Gerando…' : 'Gerar resumo motivacional'}
          </button>
        )}
        {summaryError && <p className="mt-2 text-xs text-accent-soft">{summaryError}</p>}
      </div>

      {isCutting && (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs text-faint">
            Lembrete: no Cutting, a estagnação também pode ser resolvida com mais atividade
            cardiovascular, não só com redução calórica. Puramente informativo — o CONTAkcal não
            rastreia atividade física.
          </p>
        </div>
      )}
    </motion.section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <span className="text-sm text-muted">{label}</span>
      <span className="tnum font-display text-sm font-semibold text-fg">{value}</span>
    </div>
  )
}
