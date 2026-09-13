import type { MealWithId } from '@/lib/firestore/meals'

interface WeeklyProteinChartProps {
  mealsByDay: Map<number, MealWithId[]>
  proteinGoal: number
  currentDayIndex: number
}

const WIDTH = 320
const HEIGHT = 120
const PADDING_X = 12
const PADDING_TOP = 8
const PADDING_BOTTOM = 20
const BAR_GAP = 8

export function WeeklyProteinChart({ mealsByDay, proteinGoal, currentDayIndex }: WeeklyProteinChartProps) {
  const usableWidth = WIDTH - PADDING_X * 2
  const barWidth = (usableWidth - BAR_GAP * 6) / 7
  const usableHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM

  const days = Array.from({ length: 7 }, (_, i) => i + 1).map((day) => {
    const meals = mealsByDay.get(day) ?? []
    const protein = meals.reduce((acc, m) => acc + m.totals.protein, 0)
    const pct = proteinGoal > 0 ? Math.min(protein / proteinGoal, 1) : 0
    const isFuture = day > currentDayIndex
    const isHit = proteinGoal > 0 && protein >= proteinGoal
    return { day, protein, pct, isFuture, isHit }
  })

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Proteína consumida por dia da semana">
        <line
          x1={PADDING_X}
          y1={PADDING_TOP}
          x2={WIDTH - PADDING_X}
          y2={PADDING_TOP}
          stroke="var(--color-line)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        {days.map((d, i) => {
          const x = PADDING_X + i * (barWidth + BAR_GAP)
          const barHeight = Math.max(d.pct * usableHeight, d.isFuture ? 0 : 2)
          const y = PADDING_TOP + usableHeight - barHeight
          return (
            <g key={d.day}>
              <rect
                x={x}
                y={PADDING_TOP}
                width={barWidth}
                height={usableHeight}
                rx={4}
                fill="var(--color-track)"
                opacity={d.isFuture ? 0.3 : 1}
              />
              {!d.isFuture && (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  fill={d.isHit ? 'var(--color-accent)' : 'var(--color-accent-soft)'}
                />
              )}
              <text
                x={x + barWidth / 2}
                y={HEIGHT - 6}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-faint)"
              >
                {d.day}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="mt-1 text-center text-[11px] text-faint">
        Proteína por dia da semana — barra cheia = meta diária batida
      </p>
    </div>
  )
}
