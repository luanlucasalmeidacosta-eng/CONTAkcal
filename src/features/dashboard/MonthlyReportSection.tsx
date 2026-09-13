import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useMonthlyReport } from '@/lib/firestore/useMonthlyReport'
import { deriveCarbGoal } from '@/lib/firestore/users'
import { getProtocolWeekInfo } from '@/lib/nutrition/week'
import { getMonthForWeek } from '@/lib/nutrition/monthlyReport'

export function MonthlyReportSection() {
  const { userDoc } = useAuth()
  const currentWeekIndex = userDoc?.protocolStartedAt
    ? getProtocolWeekInfo(userDoc.protocolStartedAt).weekIndex
    : 1
  const currentMonth = getMonthForWeek(currentWeekIndex)
  const [monthIndex, setMonthIndex] = useState(currentMonth)

  const { weeks, aggregateTotals, phaseSummary, loading, error } = useMonthlyReport(
    userDoc?.uid,
    userDoc?.protocolStartedAt,
    userDoc?.phaseHistory,
    monthIndex,
  )

  if (!userDoc) return null

  const carbGoal = deriveCarbGoal(userDoc)
  const weeklyCalorieGoal = (userDoc.dailyCalorieGoal ?? 0) * 7
  const weeksElapsed = weeks.length
  const avgCalorieBalance = weeksElapsed > 0 ? aggregateTotals.kcal / weeksElapsed : 0
  const carbGoalSoFar = carbGoal * 7 * weeksElapsed
  const fatGoalSoFar = (userDoc.fatGoal ?? 0) * weeksElapsed

  return (
    <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={monthIndex <= 1}
          onClick={() => setMonthIndex((m) => m - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted disabled:opacity-30"
          aria-label="Mês anterior"
        >
          ←
        </button>
        <p className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-accent">
          Mês {monthIndex}
        </p>
        <button
          type="button"
          disabled={monthIndex >= currentMonth}
          onClick={() => setMonthIndex((m) => m + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted disabled:opacity-30"
          aria-label="Próximo mês"
        >
          →
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-faint">Carregando…</p>
      ) : error ? (
        <p className="mt-4 text-sm text-accent-soft">{error}</p>
      ) : weeksElapsed === 0 ? (
        <p className="mt-4 text-sm text-faint">Nenhuma semana deste mês começou ainda.</p>
      ) : (
        <div className="mt-4 divide-y divide-line">
          <Row label="Saldo calórico médio" value={`${Math.round(avgCalorieBalance).toLocaleString('pt-BR')} de ${weeklyCalorieGoal.toLocaleString('pt-BR')} kcal/semana`} />
          <Row label="Semanas avaliadas" value={`${weeksElapsed} de 4`} />
          <Row label="Carboidrato" value={`${Math.round(aggregateTotals.carbs).toLocaleString('pt-BR')}g de ${Math.round(carbGoalSoFar).toLocaleString('pt-BR')}g`} />
          <Row label="Gordura" value={`${Math.round(aggregateTotals.fat).toLocaleString('pt-BR')}g de ${Math.round(fatGoalSoFar).toLocaleString('pt-BR')}g`} />
          <Row label="Fase(s) do mês" value={phaseSummary} />
        </div>
      )}

      <p className="mt-3 text-[11px] text-faint">
        Metas calculadas com a calórica/carboidrato atuais — se a fase mudou dentro deste mês, os
        números acima usam a meta de hoje para todas as semanas, não a meta histórica de cada fase.
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="tnum font-display text-sm font-semibold text-fg">{value}</span>
    </div>
  )
}
