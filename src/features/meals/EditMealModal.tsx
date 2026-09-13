import { useState } from 'react'
import { motion } from 'framer-motion'
import { updateMeal, type MealWithId } from '@/lib/firestore/meals'
import type { MealItem } from '@/lib/firestore/types'

interface EditMealModalProps {
  uid: string
  meal: MealWithId
  onClose: () => void
}

function numberField(value: number, onChange: (v: number) => void, label: string) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-faint">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="tnum min-h-[36px] rounded-lg border border-line bg-bg px-2 text-sm text-fg focus:border-accent focus:outline-none"
      />
    </label>
  )
}

export function EditMealModal({ uid, meal, onClose }: EditMealModalProps) {
  const [items, setItems] = useState<MealItem[]>(meal.items)
  const [dishName, setDishName] = useState(meal.dishName ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateItem(index: number, patch: Partial<MealItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const totals = items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )

  async function handleSave() {
    if (items.length === 0) return
    setSaving(true)
    setError(null)
    try {
      await updateMeal(uid, meal.id, { items, totals, dishName: dishName || undefined })
      onClose()
    } catch (err) {
      console.error('updateMeal failed:', err)
      setError('Não foi possível salvar as alterações. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Editar refeição"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 lg:items-center lg:p-6"
    >
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-surface-2 p-4 lg:rounded-2xl">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-accent">
          Editar refeição
        </p>

        <input
          type="text"
          value={dishName}
          onChange={(e) => setDishName(e.target.value)}
          placeholder="Nome do prato (opcional)"
          className="mt-3 min-h-[44px] w-full rounded-xl border border-line bg-bg px-4 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
        />

        <div className="mt-3 flex flex-col gap-3">
          {items.map((item, index) => (
            <div key={index} className="rounded-xl border border-line bg-bg p-3">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(index, { name: e.target.value })}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-fg focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="shrink-0 text-xs text-faint hover:text-accent-soft"
                >
                  remover
                </button>
              </div>
              <input
                type="text"
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: e.target.value })}
                className="mt-1 w-full bg-transparent text-xs text-muted focus:outline-none"
              />
              <div className="mt-2 grid grid-cols-4 gap-2">
                {numberField(item.kcal, (v) => updateItem(index, { kcal: v }), 'kcal')}
                {numberField(item.protein, (v) => updateItem(index, { protein: v }), 'prot')}
                {numberField(item.carbs, (v) => updateItem(index, { carbs: v }), 'carbo')}
                {numberField(item.fat, (v) => updateItem(index, { fat: v }), 'gord')}
              </div>
            </div>
          ))}
        </div>

        <div className="tnum mt-3 grid grid-cols-4 gap-2 rounded-xl border border-line bg-bg px-3 py-2 text-center text-xs">
          <div>
            <p className="text-faint">kcal</p>
            <p className="font-semibold text-fg">{Math.round(totals.kcal)}</p>
          </div>
          <div>
            <p className="text-faint">prot</p>
            <p className="font-semibold text-fg">{Math.round(totals.protein)}g</p>
          </div>
          <div>
            <p className="text-faint">carbo</p>
            <p className="font-semibold text-fg">{Math.round(totals.carbs)}g</p>
          </div>
          <div>
            <p className="text-faint">gord</p>
            <p className="font-semibold text-fg">{Math.round(totals.fat)}g</p>
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-accent-soft">{error}</p>}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] flex-1 rounded-xl border border-line text-xs font-semibold uppercase tracking-[0.14em] text-muted hover:text-fg"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving || items.length === 0}
            onClick={handleSave}
            className="min-h-[44px] flex-1 rounded-xl bg-accent font-display text-xs font-semibold uppercase tracking-[0.14em] text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
