import type { WeighInWithId } from '@/lib/firestore/weighIns'

interface WeightHistoryChartProps {
  weighIns: WeighInWithId[]
}

function toDate(createdAt: unknown): Date {
  return (createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date()
}

const WIDTH = 320
const HEIGHT = 140
const PADDING_X = 16
const PADDING_Y = 20

export function WeightHistoryChart({ weighIns }: WeightHistoryChartProps) {
  if (weighIns.length < 2) {
    return (
      <p className="text-sm text-faint">
        Registre pelo menos duas pesagens para ver a evolução ao longo do tempo.
      </p>
    )
  }

  const sorted = [...weighIns].sort((a, b) => toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime())
  const weights = sorted.map((w) => w.peso)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max - min || 1

  const usableWidth = WIDTH - PADDING_X * 2
  const usableHeight = HEIGHT - PADDING_Y * 2

  const points = sorted.map((w, i) => {
    const x = PADDING_X + (i / (sorted.length - 1)) * usableWidth
    const y = PADDING_Y + usableHeight - ((w.peso - min) / range) * usableHeight
    return { x, y, tipo: w.tipo, peso: w.peso, id: w.id }
  })

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Evolução do peso ao longo do tempo">
        <polyline points={polylinePoints} fill="none" stroke="var(--color-accent)" strokeWidth={2} />
        {points.map((p) => (
          <circle
            key={p.id}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={p.tipo === 'mensal' ? 'var(--color-accent)' : 'var(--color-bg)'}
            stroke="var(--color-accent)"
            strokeWidth={2}
          />
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-faint">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
          Pesagem mensal (oficial)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-accent bg-bg" aria-hidden="true" />
          Pesagem semanal (opcional)
        </span>
      </div>
    </div>
  )
}
