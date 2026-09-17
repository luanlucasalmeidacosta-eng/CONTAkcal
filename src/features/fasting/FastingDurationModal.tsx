import { useState } from 'react'
import { motion } from 'framer-motion'

interface FastingDurationModalProps {
  currentHours: number
  onClose: () => void
  onSave: (hours: number) => void
}

const PRESETS = [10, 12, 14, 16, 18, 20]

export function FastingDurationModal({ currentHours, onClose, onSave }: FastingDurationModalProps) {
  const [customText, setCustomText] = useState(String(currentHours))
  const parsedHours = customText === '' ? null : Math.min(48, Math.max(0, Number(customText)))
  const hours = parsedHours === null || Number.isNaN(parsedHours) ? null : parsedHours

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Duração do jejum"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 lg:items-center lg:p-6"
    >
      <div className="w-full max-w-sm rounded-t-2xl border border-line bg-surface-2 p-4 lg:rounded-2xl">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-accent">
          Duração do jejum
        </p>
        <p className="mt-1 text-xs text-faint">
          Define quantas horas o ciclo dura — o fim é calculado a partir do início.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {PRESETS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setCustomText(String(h))}
              className={`min-h-[48px] rounded-xl border font-display text-sm font-semibold transition-colors duration-200 ${
                hours === h ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-bg text-muted'
              }`}
            >
              {h}h
            </button>
          ))}
        </div>

        <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-bg px-4 py-3 text-sm text-fg">
          <span className="text-muted">Personalizado</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={customText}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/[^0-9]/g, '')
              setCustomText(digitsOnly)
            }}
            className="tnum w-16 bg-transparent text-right text-fg focus:outline-none"
          />
        </label>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] flex-1 rounded-xl border border-line text-xs font-semibold uppercase tracking-[0.14em] text-muted hover:text-fg"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={hours === null}
            onClick={() => hours !== null && onSave(hours)}
            className="min-h-[44px] flex-1 rounded-xl bg-accent font-display text-xs font-semibold uppercase tracking-[0.14em] text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      </div>
    </motion.div>
  )
}
