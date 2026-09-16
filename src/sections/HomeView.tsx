import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { PhaseChip } from '@/components/PhaseChip'
import { Ring } from '@/components/Ring'
import { LoadingBar } from '@/components/LoadingBar'
import { IconMealPlate } from '@/icons'
import { useAuth } from '@/features/auth/AuthContext'
import { MealChatModal } from '@/features/chat/MealChatModal'
import { EditMealModal } from '@/features/meals/EditMealModal'
import { useTodayTotals } from '@/lib/firestore/useTodayTotals'
import { useWeekProgress } from '@/lib/firestore/useWeekProgress'
import { deriveCarbGoal } from '@/lib/firestore/users'
import { deleteMeal, subscribeTodayMeals, type MealWithId } from '@/lib/firestore/meals'
import { subscribeWeighIns, type WeighInWithId } from '@/lib/firestore/weighIns'
import { PHASE_LABELS } from '@/lib/nutrition/phase'
import { availableToday } from '@/lib/nutrition/week'
import { buildPostMealFeedback } from '@/lib/nutrition/feedback'
import { getGreeting } from '@/lib/nutrition/greeting'
import { needsMonthlyWeighIn } from '@/lib/nutrition/weighInReminder'

function toDate(createdAt: unknown): Date {
  return (createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date()
}

export function HomeView() {
  const { userDoc } = useAuth()
  const todayTotals = useTodayTotals(userDoc?.uid)
  const { weekInfo, consumedPreviousDays } = useWeekProgress(userDoc?.uid, userDoc?.protocolStartedAt)
  const [chatOpen, setChatOpen] = useState(false)
  const [weighIns, setWeighIns] = useState<WeighInWithId[]>([])
  const [todayMeals, setTodayMeals] = useState<MealWithId[]>([])
  const [editingMeal, setEditingMeal] = useState<MealWithId | null>(null)
  const [mealError, setMealError] = useState<string | null>(null)

  useEffect(() => {
    if (!userDoc?.uid) return
    return subscribeWeighIns(userDoc.uid, setWeighIns)
  }, [userDoc?.uid])

  useEffect(() => {
    if (!userDoc?.uid) return
    return subscribeTodayMeals(userDoc.uid, setTodayMeals)
  }, [userDoc?.uid])

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
  const remainingToday = availableCalories - todayTotals.kcal
  const greeting = userDoc.name ? `${getGreeting()}, ${userDoc.name}` : getGreeting()
  const showMonthlyWeighInAlert = needsMonthlyWeighIn(
    weekInfo.weekIndex,
    weighIns.map((w) => ({ tipo: w.tipo, createdAt: toDate(w.createdAt) })),
    weekInfo.weekStart,
  )

  async function handleRemoveMeal(mealId: string) {
    if (!userDoc) return
    try {
      await deleteMeal(userDoc.uid, mealId)
    } catch (err) {
      console.error('deleteMeal failed:', err)
      setMealError('Não foi possível remover. Tente novamente.')
    }
  }

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
            {greeting}
          </h1>
          <p className="tnum mt-1 text-sm text-muted">Semana {weekInfo.weekIndex} do protocolo</p>
        </div>
        {phaseLabel && <PhaseChip phase={phaseLabel} />}
      </header>

      {showMonthlyWeighInAlert && (
        <div className="mt-6 rounded-2xl border border-accent/40 bg-accent/10 p-4">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-accent">
            Novo mês, nova pesagem
          </p>
          <p className="mt-1 text-sm text-fg">
            Um novo bloco de 4 semanas começou. Registre sua pesagem mensal em Ajustes para
            atualizar seus dados cadastrais e recalibrar o acompanhamento mês a mês.
          </p>
        </div>
      )}

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
          <div className="mt-8 w-full rounded-2xl border border-line bg-surface px-5 py-5 lg:mt-10">
            <LoadingBar
              value={todayTotals.kcal}
              goal={availableCalories}
              label="Calorias"
              sub={`${Math.round(todayTotals.kcal).toLocaleString('pt-BR')} de ${Math.round(availableCalories).toLocaleString('pt-BR')} kcal hoje`}
            />
            <p className="tnum mt-3 text-center text-xs text-faint">
              Restam <span className="font-semibold text-accent">{Math.round(remainingToday).toLocaleString('pt-BR')} kcal</span> disponíveis para hoje
            </p>
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
                excessLabel="Quantidade de gordura excedida"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 lg:sticky lg:top-10 lg:items-start">
          <motion.button
            type="button"
            onClick={() => setChatOpen(true)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Registrar refeição com IA"
            className="group glow-ring flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded-3xl border border-accent/40 bg-accent/10 transition-colors duration-200 hover:border-accent hover:bg-accent/16 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <IconMealPlate size={30} className="text-accent transition-transform duration-300 group-hover:scale-110" />
            <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-accent">IA</span>
          </motion.button>
          <p className="font-display text-xs font-semibold text-muted">Registrar refeição</p>
        </div>
      </div>

      <section className="mt-10 lg:mt-14" aria-label="Refeições de hoje">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-faint">
          Refeições de hoje
        </p>
        <div className="mt-3 rounded-2xl border border-line bg-surface p-3">
          {todayMeals.length === 0 ? (
            <p className="px-2 py-3 text-sm text-faint">Nenhuma refeição registrada hoje.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {todayMeals.map((meal) => (
                <li
                  key={meal.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => setEditingMeal(meal)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm text-fg">{meal.dishName ?? meal.rawText}</p>
                    <p className="tnum text-xs text-faint">{Math.round(meal.totals.kcal)} kcal · editar</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveMeal(meal.id)}
                    className="shrink-0 text-xs text-faint hover:text-accent-soft focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    remover
                  </button>
                </li>
              ))}
            </ul>
          )}
          {mealError && <p className="mt-2 text-xs text-accent-soft">{mealError}</p>}
        </div>
      </section>

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

      {editingMeal && (
        <EditMealModal uid={userDoc.uid} meal={editingMeal} onClose={() => setEditingMeal(null)} />
      )}
    </motion.section>
  )
}
