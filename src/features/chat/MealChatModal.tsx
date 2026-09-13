import { AnimatePresence, motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { useMealChat } from './useMealChat'
import { MealConfirmCard } from './MealConfirmCard'
import type { MealItem, MealTotals } from '@/lib/firestore/types'

interface MealChatModalProps {
  open: boolean
  onClose: () => void
  title: string
  /** Data em que a refeição deve ser registrada; padrão agora (usado pra registro retroativo). */
  targetDate?: Date
  /** Feedback customizado pós-confirmação (ex: "Faltam Xg de proteína hoje..."). Sem isso, mostra uma mensagem genérica. */
  renderConfirmedFeedback?: (items: MealItem[], totals: MealTotals) => ReactNode
}

export function MealChatModal({ open, onClose, title, targetDate, renderConfirmedFeedback }: MealChatModalProps) {
  const chat = useMealChat(targetDate)
  const [draft, setDraft] = useState('')
  const [lastConfirmed, setLastConfirmed] = useState<{ items: MealItem[]; totals: MealTotals } | null>(null)

  function handleSend() {
    if (!draft.trim()) return
    chat.sendMessage(draft)
    setDraft('')
  }

  function handleAdjust() {
    chat.reset()
    setDraft('')
  }

  function handleClose() {
    onClose()
    chat.reset()
    setDraft('')
    setLastConfirmed(null)
  }

  const isSaving = chat.phase === 'saving'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-[72px] z-50 mx-auto w-[calc(100%-32px)] max-w-xl lg:bottom-auto lg:inset-y-0 lg:inset-x-auto lg:right-6 lg:top-24 lg:w-96"
        >
          <div className="max-h-[80vh] overflow-y-auto rounded-2xl border border-accent/40 bg-surface-2 p-4 shadow-[0_0_40px_rgb(255_107_26/0.12)]">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-accent">
              {title}
            </p>

            {chat.phase === 'ready' && chat.items ? (
              <MealConfirmCard
                items={chat.items}
                suggestedDishName={chat.dishName}
                saving={isSaving}
                onConfirm={(items, name) => {
                  setLastConfirmed({
                    items,
                    totals: items.reduce(
                      (acc, item) => ({
                        kcal: acc.kcal + item.kcal,
                        protein: acc.protein + item.protein,
                        carbs: acc.carbs + item.carbs,
                        fat: acc.fat + item.fat,
                      }),
                      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
                    ),
                  })
                  chat.confirm(items, name)
                }}
                onAdjust={handleAdjust}
              />
            ) : chat.phase === 'confirmed' ? (
              <p className="mt-3 text-sm text-fg">
                {lastConfirmed && renderConfirmedFeedback
                  ? renderConfirmedFeedback(lastConfirmed.items, lastConfirmed.totals)
                  : 'Refeição registrada com sucesso.'}
              </p>
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
                    placeholder={chat.phase === 'asking' ? 'Responda aqui…' : 'O que você comeu?'}
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
              onClick={handleClose}
              className="mt-3 min-h-[44px] w-full rounded-xl border border-line text-xs font-semibold uppercase tracking-[0.14em] text-muted transition-colors duration-200 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
