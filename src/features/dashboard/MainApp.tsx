import { useState } from 'react'
import { BottomNav, type TabId } from '@/components/BottomNav'
import { ComingSoonView } from '@/sections/ComingSoonView'
import { HomeView } from '@/sections/HomeView'
import { WeekView } from '@/sections/WeekView'
import { IconReports, IconSettings, IconWater } from '@/icons'

const soon: Partial<Record<TabId, { title: string; description: string; icon: React.ReactNode }>> = {
  relatorios: {
    title: 'Relatórios',
    description: 'Relatórios semanais e mensais do seu protocolo, com retrospecto de saldo calórico, proteína e variação de peso.',
    icon: <IconReports size={32} />,
  },
  agua: {
    title: 'Água',
    description: 'Registro rápido de hidratação com meta diária de 40ml por kg — cada dia é independente, sem redistribuição semanal.',
    icon: <IconWater size={32} />,
  },
  ajustes: {
    title: 'Ajustes',
    description: 'Parametrização do ritmo esperado e dos ajustes de fase: incrementos de carboidrato e thresholds dos alertas.',
    icon: <IconSettings size={32} />,
  },
}

export function MainApp() {
  const [tab, setTab] = useState<TabId>('hoje')
  const soonTab = soon[tab]

  return (
    <main className="min-h-screen bg-bg text-fg">
      <div className="pb-[104px]">
        {tab === 'hoje' && <HomeView />}
        {tab === 'semana' && <WeekView />}
        {soonTab && (
          <ComingSoonView title={soonTab.title} description={soonTab.description} icon={soonTab.icon} />
        )}
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </main>
  )
}
