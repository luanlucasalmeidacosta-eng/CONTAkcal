import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/features/auth/AuthContext'
import { deleteDishVariant, getDishLibrary } from '@/lib/firestore/dishes'
import type { StandardDishDoc } from '@/lib/firestore/types'
import { AddRecipeModal } from './AddRecipeModal'

interface DietLibraryScreenProps {
  onBack: () => void
}

/**
 * "Minha Dieta Ajustada" — tela própria (não mais embutida em Ajustes) com a
 * biblioteca pessoal de receitas/refeições prontas passadas pelo
 * nutricionista, reaproveitando a mesma coleção usada como contexto da IA no
 * chat (standard_dishes), agora com CRUD manual e acessível de dentro do
 * registro de refeições.
 */
export function DietLibraryScreen({ onBack }: DietLibraryScreenProps) {
  const { userDoc } = useAuth()
  const [dishes, setDishes] = useState<StandardDishDoc[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    if (!userDoc?.uid) return
    try {
      setDishes(await getDishLibrary(userDoc.uid))
    } catch (err) {
      console.error('getDishLibrary failed:', err)
      setError('Não foi possível carregar sua dieta ajustada.')
    }
  }

  useEffect(() => {
    void refresh()
  }, [userDoc?.uid])

  async function handleRemove(dishName: string, variantLabel: string) {
    if (!userDoc?.uid) return
    try {
      await deleteDishVariant(userDoc.uid, dishName, variantLabel)
      await refresh()
    } catch (err) {
      console.error('deleteDishVariant failed:', err)
      setError('Não foi possível remover. Tente novamente.')
    }
  }

  if (!userDoc) return null

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="mx-auto w-full max-w-xl px-5 pt-10 lg:max-w-2xl lg:pt-16"
    >
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar para Ajustes"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors duration-200 hover:border-accent/60 hover:text-fg"
        >
          ←
        </button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight lg:text-3xl">
            Minha Dieta Ajustada
          </h1>
          <p className="mt-1 text-sm text-muted">Receitas do seu nutricionista, prontas pra usar no chat</p>
        </div>
      </header>

      <div className="mt-8 flex flex-col gap-2">
        {dishes === null && <p className="py-3 text-center text-sm text-faint">Carregando…</p>}
        {dishes?.length === 0 && (
          <p className="rounded-2xl border border-line bg-surface px-4 py-6 text-center text-sm text-faint">
            Nenhuma receita cadastrada ainda.
          </p>
        )}
        {dishes?.map((dish) =>
          dish.variantes.map((variant) => {
            const kcal = variant.items.reduce((acc, i) => acc + i.kcal, 0)
            return (
              <div
                key={`${dish.nome}-${variant.label}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">{dish.nome}</p>
                  <p className="tnum text-xs text-faint">
                    {variant.label} · {Math.round(kcal)} kcal · {variant.items.length} item(ns)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(dish.nome, variant.label)}
                  className="shrink-0 text-xs text-faint hover:text-accent-soft focus-visible:outline-2 focus-visible:outline-accent"
                >
                  remover
                </button>
              </div>
            )
          }),
        )}
      </div>

      {error && <p className="mt-3 text-xs text-accent-soft">{error}</p>}

      <button
        type="button"
        onClick={() => setAdding(true)}
        className="mt-6 min-h-[48px] w-full rounded-2xl border border-accent/40 bg-accent/10 font-display text-sm font-semibold uppercase tracking-[0.14em] text-accent transition-colors duration-200 hover:bg-accent/16"
      >
        + Adicionar receita
      </button>

      <AnimatePresence>
        {adding && userDoc && (
          <AddRecipeModal uid={userDoc.uid} onClose={() => setAdding(false)} onSaved={refresh} />
        )}
      </AnimatePresence>
    </motion.section>
  )
}
