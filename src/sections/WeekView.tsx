import { useState } from 'react'
import { motion } from 'framer-motion'
import { PhaseChip } from '@/components/PhaseChip'
import { Ring } from '@/components/Ring'

const week = {
  protein: { value: 92, goal: 170 },
  calories: { value: 12400, goal: 14000 },
  carbs: { value: 672, goal: 966 },
  fat: { value: 266, goal: 595 },
  weekIndex: 3,
  phase: 'Bulking',
}

export function WeekView() {
  const [selectedDay, setSelectedDay] = useState(1)

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
            Semana {week.weekIndex}
          </h1>
          <p className="mt-1 text-sm text-muted">Bloco fixo de 7 dias</p>
        </div>
        <PhaseChip phase={week.phase} />
      </header>

      <div className="mt-10 grid gap-6 lg:mt-14 lg:grid-cols-3 lg:items-start">
        <div className="flex flex-col items-center rounded-2xl border border-line bg-surface px-4 py-6">
          <Ring
            animateKey={5}
            value={week.protein.value}
            goal={week.protein.goal}
            label="Proteína"
            sub={`${week.protein.value}g de ${week.protein.goal}g`}
            size={168}
            stroke={12}
            emphasized
          />
          <p className="mt-3 text-xs text-faint">Meta diária</p>
        </div>
        <div className="flex flex-col items-center rounded-2xl border border-line bg-surface px-4 py-6">
          <Ring
            animateKey={6}
            value={week.calories.value}
            goal={week.calories.goal}
            label="Calorias"
            sub={`${week.calories.value.toLocaleString('pt-BR')} de ${week.calories.goal.toLocaleString('pt-BR')} kcal`}
            size={168}
            stroke={12}
          />
          <p className="mt-3 text-xs text-faint">Progresso da semana</p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1 lg:gap-6">
          <div className="flex flex-col items-center rounded-2xl border border-line bg-surface px-3 py-5">
            <Ring
              animateKey={7}
              value={week.carbs.value}
              goal={week.carbs.goal}
              label="Carbo"
              sub={`${week.carbs.value.toLocaleString('pt-BR')}g de ${week.carbs.goal.toLocaleString('pt-BR')}g`}
              size={104}
              stroke={9}
            />
          </div>
          <div className="flex flex-col items-center rounded-2xl border border-line bg-surface px-3 py-5">
            <Ring
              animateKey={8}
              value={week.fat.value}
              goal={week.fat.goal}
              label="Gordura"
              sub={`${week.fat.value.toLocaleString('pt-BR')}g de ${week.fat.goal.toLocaleString('pt-BR')}g`}
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
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                aria-pressed={isSelected}
                className={`tnum min-h-[44px] min-w-[44px] flex-1 rounded-xl border font-display text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
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
        <p className="mt-2 text-xs text-faint">
          Dia {selectedDay} — as refeições registradas deste dia aparecem aqui.
        </p>
      </footer>
    </motion.section>
  )
}
