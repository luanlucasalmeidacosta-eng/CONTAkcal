import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMealChat } from './useMealChat'
import { MealConfirmCard } from './MealConfirmCard'
import { IconMealPlate, IconBook } from '@/icons'
import { useAuth } from '@/features/auth/AuthContext'
import { getDishLibrary } from '@/lib/firestore/dishes'
import type { MealItem, MealTotals, StandardDishDoc } from '@/lib/firestore/types'
import { DAILY_AI_MESSAGE_LIMIT } from '@/lib/firestore/aiUsage'

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
  const { firebaseUser } = useAuth()
  const chat = useMealChat(targetDate)
  const [draft, setDraft] = useState('')
  const [lastConfirmed, setLastConfirmed] = useState<{ items: MealItem[]; totals: MealTotals } | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [libraryDishes, setLibraryDishes] = useState<StandardDishDoc[] | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chat.messages, chat.phase])

  async function openLibrary() {
    setLibraryOpen(true)
    if (!firebaseUser || libraryDishes) return
    try {
      setLibraryDishes(await getDishLibrary(firebaseUser.uid))
    } catch (err) {
      console.error('getDishLibrary failed:', err)
      setLibraryDishes([])
    }
  }

  function pickLibraryVariant(dish: StandardDishDoc, variant: StandardDishDoc['variantes'][number]) {
    chat.useLibraryItem(variant.items, dish.nome, variant.label)
    setLibraryOpen(false)
  }

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
    setLibraryOpen(false)
  }

  const isSaving = chat.phase === 'saving'
  const isLoading = chat.phase === 'loading'
  const remainingMessages = Math.max(0, DAILY_AI_MESSAGE_LIMIT - chat.messageCount)
  const showLimitWarning = remainingMessages <= 5 && remainingMessages > 0

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

          {chat.limitReached && (
            <p className="px-4 pb-2 text-center text-xs text-accent-soft">
              Limite de {DAILY_AI_MESSAGE_LIMIT} mensagens de IA hoje atingido. Volte amanhã para continuar registrando com o chat.
            </p>
          )}
          {!chat.limitReached && showLimitWarning && (
            <p className="px-4 pb-2 text-center text-xs text-faint">
              Restam {remainingMessages} mensagens de IA hoje.
            </p>
          )}

          <AnimatePresence>
            {libraryOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden border-t border-line"
              >
                <div className="max-h-56 overflow-y-auto p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                      Minha dieta ajustada
                    </p>
                    <button
                      type="button"
                      onClick={() => setLibraryOpen(false)}
                      className="text-xs text-faint hover:text-fg"
                    >
                      fechar
                    </button>
                  </div>

                  {libraryDishes === null && <p className="py-3 text-center text-xs text-faint">Carregando…</p>}
                  {libraryDishes?.length === 0 && (
                    <p className="py-3 text-center text-xs text-faint">
                      Nenhuma receita salva ainda. Cadastre em Ajustes → Minha Dieta Ajustada.
                    </p>
                  )}
                  <div className="flex flex-col gap-2">
                    {libraryDishes?.map((dish) =>
                      dish.variantes.map((variant) => {
                        const kcal = variant.items.reduce((acc, i) => acc + i.kcal, 0)
                        return (
                          <button
                            key={`${dish.nome}-${variant.label}`}
                            type="button"
                            onClick={() => pickLibraryVariant(dish, variant)}
                            className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2 text-left transition-colors duration-200 hover:border-accent/60"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm text-fg">{dish.nome}</p>
                              <p className="tnum text-xs text-faint">
                                {variant.label} · {Math.round(kcal)} kcal
                              </p>
                            </div>
                          </button>
                        )
                      }),
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2 border-t border-line px-3 pt-2">
            <button
              type="button"
              onClick={() => (libraryOpen ? setLibraryOpen(false) : openLibrary())}
              aria-pressed={libraryOpen}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
                libraryOpen
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line text-muted hover:border-accent/60 hover:text-fg'
              }`}
            >
              <IconBook size={14} />
              Minha biblioteca
            </button>
          </div>

          <div className="flex gap-2 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={chat.limitReached ? 'Limite diário atingido' : 'Digite sua mensagem…'}
              disabled={isLoading || chat.limitReached}
              className="min-h-[48px] flex-1 rounded-full border border-line bg-surface px-4 text-base text-fg placeholder:text-faint focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading || !draft.trim() || chat.limitReached}
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
