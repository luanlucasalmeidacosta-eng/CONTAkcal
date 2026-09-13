import { useState } from "react";
import type { MealItem } from "@/lib/firestore/types";

interface MealConfirmCardProps {
  items: MealItem[];
  suggestedDishName?: string;
  saving: boolean;
  onConfirm: (items: MealItem[], dishName: string | undefined) => void;
  onAdjust: () => void;
}

export function MealConfirmCard({
  items,
  suggestedDishName,
  saving,
  onConfirm,
  onAdjust,
}: MealConfirmCardProps) {
  const [localItems, setLocalItems] = useState(items);
  const [dishName, setDishName] = useState(suggestedDishName ?? "");
  const isComposedDish = items.length > 1;

  function removeItem(index: number) {
    setLocalItems((prev) => prev.filter((_, i) => i !== index));
  }

  const liveTotals = localItems.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <div className="mt-3 rounded-2xl border border-accent/40 bg-surface-2 p-4">
      <p className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-accent">
        Confirme sua refeição
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {localItems.map((item, index) => (
          <div
            key={`${item.name}-${index}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-fg">{item.name}</p>
              <p className="tnum text-xs text-faint">
                {item.quantity} · {Math.round(item.kcal)} kcal
              </p>
            </div>
            {localItems.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(index)}
                aria-label={`Remover ${item.name}`}
                className="shrink-0 text-xs text-faint hover:text-accent-soft focus-visible:outline-2 focus-visible:outline-accent"
              >
                remover
              </button>
            )}
          </div>
        ))}
      </div>

      {isComposedDish && (
        <div className="mt-3">
          <input
            type="text"
            value={dishName}
            onChange={(e) => setDishName(e.target.value)}
            placeholder="Nome do prato (para salvar na sua biblioteca)"
            className="min-h-[44px] w-full rounded-xl border border-line bg-bg px-4 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
          />
        </div>
      )}

      <div className="tnum mt-3 grid grid-cols-4 gap-2 rounded-xl border border-line bg-bg px-3 py-2 text-center text-xs">
        <div>
          <p className="text-faint">kcal</p>
          <p className="font-semibold text-fg">{Math.round(liveTotals.kcal)}</p>
        </div>
        <div>
          <p className="text-faint">prot</p>
          <p className="font-semibold text-fg">{Math.round(liveTotals.protein)}g</p>
        </div>
        <div>
          <p className="text-faint">carbo</p>
          <p className="font-semibold text-fg">{Math.round(liveTotals.carbs)}g</p>
        </div>
        <div>
          <p className="text-faint">gord</p>
          <p className="font-semibold text-fg">{Math.round(liveTotals.fat)}g</p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onAdjust}
          className="min-h-[44px] flex-1 rounded-xl border border-line text-xs font-semibold uppercase tracking-[0.14em] text-muted transition-colors duration-200 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
        >
          Ajustar
        </button>
        <button
          type="button"
          disabled={saving || localItems.length === 0}
          onClick={() => onConfirm(localItems, isComposedDish ? dishName || undefined : undefined)}
          className="min-h-[44px] flex-1 rounded-xl bg-accent font-display text-xs font-semibold uppercase tracking-[0.14em] text-bg transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Confirmar"}
        </button>
      </div>
    </div>
  );
}
