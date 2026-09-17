import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '@/features/auth/AuthContext'
import { deleteDishVariant, getDishLibrary } from '@/lib/firestore/dishes'
import type { StandardDishDoc } from '@/lib/firestore/types'
import { AddRecipeModal } from './AddRecipeModal'

/**
 * "Minha Dieta Ajustada" — biblioteca pessoal de receitas/refeições prontas
 * passadas pelo nutricionista, reaproveitando a mesma coleção usada como
 * contexto da IA no chat (standard_dishes), agora com CRUD manual e
 * acessível de dentro do registro de refeições.
 */
export function DietLibraryCard() {
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
    <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
      <p className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-accent">
        Minha Dieta Ajustada
      </p>
      <p className="mt-1 text-xs text-faint">
        Receitas e refeições prontas do seu nutricionista, disponíveis com 1 toque no chat de registro.
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {dishes === null && <p className="py-2 text-xs text-faint">Carregando…</p>}
        {dishes?.length === 0 && (
          <p className="py-2 text-xs text-faint">Nenhuma receita cadastrada ainda.</p>
        )}
        {dishes?.map((dish) =>
          dish.variantes.map((variant) => {
            const kcal = variant.items.reduce((acc, i) => acc + i.kcal, 0)
            return (
              <div
                key={`${dish.nome}-${variant.label}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-fg">{dish.nome}</p>
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

      {error && <p className="mt-2 text-xs text-accent-soft">{error}</p>}

      <button
        type="button"
        onClick={() => setAdding(true)}
        className="mt-3 min-h-[44px] w-full rounded-xl border border-accent/40 bg-accent/10 font-display text-xs font-semibold uppercase tracking-[0.14em] text-accent transition-colors duration-200 hover:bg-accent/16"
      >
        + Adicionar receita
      </button>

      <AnimatePresence>
        {adding && userDoc && (
          <AddRecipeModal uid={userDoc.uid} onClose={() => setAdding(false)} onSaved={refresh} />
        )}
      </AnimatePresence>
    </div>
  )
}
