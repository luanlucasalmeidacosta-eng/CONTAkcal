import { IconClock, IconReports, IconSettings, IconToday, IconWater, IconWeek } from '@/icons'

export type TabId = 'hoje' | 'semana' | 'relatorios' | 'agua' | 'jejum' | 'ajustes'

const tabs: { id: TabId; label: string; icon: (p: { size?: number }) => React.ReactNode }[] = [
  { id: 'hoje', label: 'Hoje', icon: IconToday },
  { id: 'semana', label: 'Semana', icon: IconWeek },
  { id: 'relatorios', label: 'Relatórios', icon: IconReports },
  { id: 'agua', label: 'Água', icon: IconWater },
  { id: 'jejum', label: 'Jejum', icon: IconClock },
  { id: 'ajustes', label: 'Ajustes', icon: IconSettings },
]

type BottomNavProps = {
  active: TabId
  onChange: (tab: TabId) => void
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/92 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex w-full max-w-xl items-stretch justify-around px-2">
        {tabs.map((tab) => {
          const isActive = active === tab.id
          const Icon = tab.icon
          return (
            <li key={tab.id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-[56px] w-full flex-col items-center justify-center gap-1 px-1 pt-2 pb-2 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
                  isActive ? 'text-accent' : 'text-muted hover:text-fg'
                }`}
              >
                <Icon size={22} />
                <span
                  className={`font-display text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    isActive ? 'glow-text' : ''
                  }`}
                >
                  {tab.label}
                </span>
                <span
                  aria-hidden="true"
                  className={`h-0.5 w-6 rounded-full bg-accent transition-opacity duration-200 ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
