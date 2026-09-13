import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { PhaseChip } from '@/components/PhaseChip'
import { Ring } from '@/components/Ring'
import { IconSpark } from '@/icons'
import { useAuth } from '@/features/auth/AuthContext'
import { useMealChat } from '@/features/chat/useMealChat'
import { MealConfirmCard } from '@/features/chat/MealConfirmCard'
import { useTodayTotals } from '@/lib/firestore/useTodayTotals'
import { deriveCarbGoal } from '@/lib/firestore/users'
import { PHASE_LABELS } from '@/lib/nutrition/phase'

export function HomeView() {
  const { userDoc } = useAuth()
  const todayTotals = useTodayTotals(userDoc?.uid)
  const chat = useMealChat()
  const [chatOpen, setChatOpen] = useState(false)
  const [draft, setDraft] = useState('')

  if (!userDoc) return null

  const carbGoal = deriveCarbGoal(userDoc)
  const weeklyFatAsDaily = Math.round((userDoc.fatGoal ?? 0) / 7)
  const phaseLabel = userDoc.phaseState ? PHASE_LABELS[userDoc.phaseState.phase] : ''

  function handleSend() {
    if (!draft.trim()) return
    chat.sendMessage(draft)
    setDraft('')
  }

  function handleAdjust() {
    chat.reset()
    setDraft('')
  }

  const isSaving = chat.phase === 'saving'

  function closeChat() {
    setChatOpen(false)
    chat.reset()
    setDraft('')
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
            Bom dia
          </h1>
          <p className="tnum mt-1 text-sm text-muted">Semana {userDoc.phaseState?.phaseWeekIndex ?? 1} do protocolo</p>
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
              goal={userDoc.dailyCalorieGoal ?? 0}
              label="Calorias"
              sub={`${Math.round(todayTotals.kcal).toLocaleString('pt-BR')} de ${(userDoc.dailyCalorieGoal ?? 0).toLocaleString('pt-BR')} kcal hoje`}
              size={132}
              stroke={10}
            />
          </div>
          <div className="mt-6 grid w-full grid-cols-2 gap-6">
            <div className="rounded-2xl border border-line bg-surface px-3 py-4">
              <Ring
                animateKey={3}
                value={todayTotals.carbs}
                goal={carbGoal}
                label="Carbo"
                sub={`${Math.round(todayTotals.carbs)}g de ${carbGoal}g`}
                size={96}
                stroke={8}
              />
            </div>
            <div className="rounded-2xl border border-line bg-surface px-3 py-4">
              <Ring
                animateKey={4}
                value={todayTotals.fat}
                goal={weeklyFatAsDaily}
                label="Gordura"
                sub={`${Math.round(todayTotals.fat)}g de ~${weeklyFatAsDaily}g`}
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

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Registro de refeição"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-[72px] z-50 mx-auto w-[calc(100%-32px)] max-w-xl lg:bottom-auto lg:inset-y-0 lg:inset-x-auto lg:right-6 lg:top-24 lg:w-96"
          >
            <div className="max-h-[80vh] overflow-y-auto rounded-2xl border border-accent/40 bg-surface-2 p-4 shadow-[0_0_40px_rgb(255_107_26/0.12)]">
              <p className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-accent">
                Registrar refeição com IA
              </p>

              {chat.phase === 'ready' && chat.items ? (
                <MealConfirmCard
                  items={chat.items}
                  suggestedDishName={chat.dishName}
                  saving={isSaving}
                  onConfirm={(items, name) => chat.confirm(items, name)}
                  onAdjust={handleAdjust}
                />
              ) : (
                <>
                  {chat.phase === 'asking' && chat.question && (
                    <p className="mt-3 text-sm text-fg">{chat.question}</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder={chat.phase === 'asking' ? 'Responda aqui…' : 'O que você comeu hoje?'}
                      disabled={chat.phase === 'loading'}
                      className="min-h-[48px] flex-1 rounded-xl border border-line bg-bg px-4 text-base text-fg placeholder:text-faint focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
                    />
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={chat.phase === 'loading'}
                      className="min-h-[48px] rounded-xl bg-accent px-4 font-display text-sm font-semibold text-bg transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                    >
                      {chat.phase === 'loading' ? 'Calculando' : 'Enviar'}
                    </button>
                  </div>
                  {chat.phase === 'error' && chat.error && (
                    <p className="mt-3 text-xs text-accent-soft">{chat.error}</p>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={closeChat}
                className="mt-3 min-h-[44px] w-full rounded-xl border border-line text-xs font-semibold uppercase tracking-[0.14em] text-muted transition-colors duration-200 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
