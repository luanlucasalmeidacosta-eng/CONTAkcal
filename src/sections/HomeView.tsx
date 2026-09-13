import { motion } from 'framer-motion'
import { useState } from 'react'
import { PhaseChip } from '@/components/PhaseChip'
import { Ring } from '@/components/Ring'
import { IconSpark } from '@/icons'
import { useAuth } from '@/features/auth/AuthContext'
import { MealChatModal } from '@/features/chat/MealChatModal'
import { useTodayTotals } from '@/lib/firestore/useTodayTotals'
import { useWeekProgress } from '@/lib/firestore/useWeekProgress'
import { deriveCarbGoal } from '@/lib/firestore/users'
import { PHASE_LABELS } from '@/lib/nutrition/phase'
import { availableToday } from '@/lib/nutrition/week'
import { buildPostMealFeedback } from '@/lib/nutrition/feedback'

export function HomeView() {
  const { userDoc } = useAuth()
  const todayTotals = useTodayTotals(userDoc?.uid)
  const { weekInfo, consumedPreviousDays } = useWeekProgress(userDoc?.uid, userDoc?.protocolStartedAt)
  const [chatOpen, setChatOpen] = useState(false)

  if (!userDoc) return null

  const carbGoal = deriveCarbGoal(userDoc)
  const { daysRemainingInWeek } = weekInfo
  const availableCalories = availableToday(
    (userDoc.dailyCalorieGoal ?? 0) * 7,
    consumedPreviousDays.kcal,
    daysRemainingInWeek,
  )
  const availableCarbs = availableToday(carbGoal * 7, consumedPreviousDays.carbs, daysRemainingInWeek)
  const availableFat = availableToday(userDoc.fatGoal ?? 0, consumedPreviousDays.fat, daysRemainingInWeek)
  const phaseLabel = userDoc.phaseState ? PHASE_LABELS[userDoc.phaseState.phase] : ''

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      aria-labelledby="greeting"
      className="mx-auto w-full max-w-xl px-5 pt-10 lg:max-w-5xl lg:pt-16"
    >
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 id="greeting" className="font-display text-3xl font-semibold tracking-tight lg:text-4xl">
            Bom dia
          </h1>
          <p className="tnum mt-1 text-sm text-muted">Semana {weekInfo.weekIndex} do protocolo</p>
        </div>
        {phaseLabel && <PhaseChip phase={phaseLabel} />}
      </header>

      <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-[1fr_320px] lg:items-start lg:gap-12">
        <div className="flex flex-col items-center">
          <Ring
            animateKey={1}
            value={todayTotals.protein}
            goal={userDoc.proteinGoal ?? 0}
            label="Proteína"
            sub={`${Math.round(todayTotals.protein)}g de ${userDoc.proteinGoal ?? 0}g`}
            size={216}
            stroke={14}
            emphasized
          />
          <div className="mt-8 w-full rounded-2xl border border-line bg-surface px-4 py-4 lg:mt-10">
            <Ring
              animateKey={2}
              value={todayTotals.kcal}
              goal={availableCalories}
              label="Calorias"
              sub={`${Math.round(todayTotals.kcal).toLocaleString('pt-BR')} kcal · ${Math.round(availableCalories).toLocaleString('pt-BR')} disponíveis hoje`}
              size={132}
              stroke={10}
            />
          </div>
          <div className="mt-6 grid w-full grid-cols-2 gap-6">
            <div className="rounded-2xl border border-line bg-surface px-3 py-4">
              <Ring
                animateKey={3}
                value={todayTotals.carbs}
                goal={availableCarbs}
                label="Carbo"
                sub={`${Math.round(todayTotals.carbs)}g de ${Math.round(availableCarbs)}g hoje`}
                size={96}
                stroke={8}
              />
            </div>
            <div className="rounded-2xl border border-line bg-surface px-3 py-4">
              <Ring
                animateKey={4}
                value={todayTotals.fat}
                goal={availableFat}
                label="Gordura"
                sub={`${Math.round(todayTotals.fat)}g de ${Math.round(availableFat)}g hoje`}
                size={96}
                stroke={8}
              />
            </div>
          </div>
        </div>

        <motion.button
          type="button"
          onClick={() => setChatOpen(true)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="group flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-5 py-4 text-left transition-colors duration-200 hover:border-accent hover:bg-accent/16 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:sticky lg:top-10"
        >
          <IconSpark size={24} className="text-accent transition-transform duration-300 group-hover:scale-110" />
          <span className="font-display text-base font-semibold text-fg">
            Registrar refeição com IA
          </span>
        </motion.button>
      </div>

      <MealChatModal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        title="Registrar refeição com IA"
        renderConfirmedFeedback={() =>
          buildPostMealFeedback({
            proteinConsumed: todayTotals.protein,
            proteinGoal: userDoc.proteinGoal ?? 0,
            carbsConsumed: todayTotals.carbs,
            fatConsumed: todayTotals.fat,
            caloriesRemaining: availableCalories - todayTotals.kcal,
          })
        }
      />
    </motion.section>
  )
}
