import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PhaseChip } from '@/components/PhaseChip'
import { Ring } from '@/components/Ring'
import { IconSpark } from '@/icons'

const today = {
  protein: { value: 92, goal: 170 },
  calories: { value: 2150, goal: 2000 },
  carbs: { value: 96, goal: 138 },
  fat: { value: 38, goal: 85 },
  weekIndex: 3,
  phase: 'Bulking',
}

export function HomeView() {
  const [chatOpen, setChatOpen] = useState(false)
  const [mealText, setMealText] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  function sendMeal() {
    if (!mealText.trim() || pending) return
    setPending(true)
    setSent(false)
    window.setTimeout(() => {
      setPending(false)
      setSent(true)
setMealText('')
    }, 900)
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
          <p className="tnum mt-1 text-sm text-muted">Semana {today.weekIndex} do protocolo</p>
        </div>
        <PhaseChip phase={today.phase} />
      </header>

      <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-[1fr_320px] lg:items-start lg:gap-12">
        <div className="flex flex-col items-center">
          <Ring
            animateKey={1}
            value={today.protein.value}
            goal={today.protein.goal}
            label="Proteína"
            sub={`${today.protein.value}g de ${today.protein.goal}g`}
            size={216}
            stroke={14}
            emphasized
          />
          <div className="mt-8 w-full rounded-2xl border border-line bg-surface px-4 py-4 lg:mt-10">
            <Ring
              animateKey={2}
              value={today.calories.value}
              goal={today.calories.goal}
              label="Calorias"
              sub={`${today.calories.value.toLocaleString('pt-BR')} kcal disponíveis hoje`}
              size={132}
              stroke={10}
            />
          </div>
          <div className="mt-6 grid w-full grid-cols-2 gap-6">
            <div className="rounded-2xl border border-line bg-surface px-3 py-4">
              <Ring
                animateKey={3}
                value={today.carbs.value}
                goal={today.carbs.goal}
                label="Carbo"
                sub={`${today.carbs.value}g de ${today.carbs.goal}g`}
                size={96}
                stroke={8}
              />
            </div>
            <div className="rounded-2xl border border-line bg-surface px-3 py-4">
              <Ring
                animateKey={4}
                value={today.fat.value}
                goal={today.fat.goal}
                label="Gordura"
                sub={`${today.fat.value}g de ${today.fat.goal}g`}
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
            <div className="rounded-2xl border border-accent/40 bg-surface-2 p-4 shadow-[0_0_40px_rgb(255_107_26/0.12)]">
              <p className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-accent">
                Registrar refeição com IA
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={mealText}
                  onChange={(e) => setMealText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMeal()}
                  placeholder="O que você comeu hoje?"
                  className="min-h-[48px] flex-1 rounded-xl border border-line bg-bg px-4 text-base text-fg placeholder:text-faint focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
                />
                <button
                  type="button"
                  onClick={sendMeal}
                  disabled={pending}
                  className="min-h-[48px] rounded-xl bg-accent px-4 font-display text-sm font-semibold text-bg transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                >
                  {pending ? 'Calculando' : 'Enviar'}
                </button>
              </div>
              <AnimatePresence>
                {sent && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 text-xs text-muted"
                  >
                    Refeição calculada — o card de confirmação com os valores aparece aqui.
                  </motion.p>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
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
