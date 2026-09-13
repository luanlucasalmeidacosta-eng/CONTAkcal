import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMealChat } from './useMealChat'
import { MealConfirmCard } from './MealConfirmCard'
import { IconMealPlate } from '@/icons'
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

function Bubble({ role, children }: { role: 'user' | 'assistant'; children: ReactNode }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? 'rounded-br-md bg-accent text-bg'
            : 'rounded-bl-md border border-line bg-surface text-fg'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-faint"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  )
}

export function MealChatModal({ open, onClose, title, targetDate, renderConfirmedFeedback }: MealChatModalProps) {
  const chat = useMealChat(targetDate)
  const [draft, setDraft] = useState('')
  const [lastConfirmed, setLastConfirmed] = useState<{ items: MealItem[]; totals: MealTotals } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chat.messages, chat.phase])

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
  const isLoading = chat.phase === 'loading'

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
          className="fixed inset-0 z-50 flex flex-col bg-bg lg:inset-auto lg:bottom-6 lg:right-6 lg:top-6 lg:w-[420px] lg:rounded-2xl lg:border lg:border-accent/40 lg:shadow-[0_0_40px_rgb(255_107_26/0.12)]"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-4">
            <div className="flex items-center gap-3">
              <IconMealPlate size={20} className="text-accent" />
              <p className="font-display text-sm font-semibold text-fg">{title}</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Fechar"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:text-fg"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {chat.messages.length === 0 && chat.phase === 'idle' && (
              <Bubble role="assistant">O que você comeu? Descreva livremente, como se estivesse me contando.</Bubble>
            )}
            {chat.messages.map((msg, i) => (
              <Bubble key={i} role={msg.role}>
                {msg.text}
              </Bubble>
            ))}

            {isLoading && <TypingBubble />}

            {chat.phase === 'ready' && chat.items && (
              <div className="flex justify-start">
                <div className="max-w-[95%]">
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
                </div>
              </div>
            )}

            {chat.phase === 'confirmed' && (
              <Bubble role="assistant">
                {lastConfirmed && renderConfirmedFeedback
                  ? renderConfirmedFeedback(lastConfirmed.items, lastConfirmed.totals)
                  : 'Refeição registrada com sucesso.'}
              </Bubble>
            )}

            {chat.phase === 'error' && chat.error && <Bubble role="assistant">{chat.error}</Bubble>}
          </div>

          <div className="flex gap-2 border-t border-line p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua mensagem…"
              disabled={isLoading}
              className="min-h-[48px] flex-1 rounded-full border border-line bg-surface px-4 text-base text-fg placeholder:text-faint focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading || !draft.trim()}
              aria-label="Enviar"
              className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-accent text-bg transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40"
            >
              ➤
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
