import { useState } from "react";
import type { MealItem } from "@/lib/firestore/types";

interface MealConfirmCardProps {
  items: MealItem[];
  suggestedDishName?: string;
  saving: boolean;
  onConfirm: (items: MealItem[], dishName: string | undefined) => void;
  onAdjust: () => void;
}

function numberField(value: number, onChange: (v: number) => void, label: string) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-faint">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="tnum min-h-[32px] rounded-lg border border-line bg-surface-2 px-2 text-xs text-fg focus:border-accent focus:outline-none"
      />
    </label>
  );
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
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const isComposedDish = items.length > 1;

  function updateItem(index: number, patch: Partial<MealItem>) {
    setLocalItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

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
        {localItems.map((item, index) => {
          const expanded = expandedIndex === index
          return (
            <div key={`${item.name}-${index}`} className="rounded-xl border border-line bg-bg px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setExpandedIndex(expanded ? null : index)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm text-fg">{item.name}</p>
                  <p className="tnum text-xs text-faint">
                    {item.quantity} · {Math.round(item.kcal)} kcal · {expanded ? 'fechar' : 'ajustar gramas'}
                  </p>
                </button>
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

              {expanded && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: e.target.value })}
                    placeholder="Quantidade (ex: 150g)"
                    className="mb-2 w-full rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-xs text-fg focus:border-accent focus:outline-none"
                  />
                  <div className="grid grid-cols-4 gap-2">
                    {numberField(item.kcal, (v) => updateItem(index, { kcal: v }), 'kcal')}
                    {numberField(item.protein, (v) => updateItem(index, { protein: v }), 'prot')}
                    {numberField(item.carbs, (v) => updateItem(index, { carbs: v }), 'carbo')}
                    {numberField(item.fat, (v) => updateItem(index, { fat: v }), 'gord')}
                  </div>
                </div>
              )}
            </div>
          )
        })}
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
