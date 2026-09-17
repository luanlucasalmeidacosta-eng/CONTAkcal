import { useState } from 'react'
import { BottomNav, type TabId } from '@/components/BottomNav'
import { HomeView } from '@/sections/HomeView'
import { WeekView } from '@/sections/WeekView'
import { WaterView } from '@/sections/WaterView'
import { ReportsView } from '@/sections/ReportsView'
import { FastingView } from '@/sections/FastingView'
import { AjustesView } from '@/sections/AjustesView'

export function MainApp() {
  const [tab, setTab] = useState<TabId>('hoje')

  return (
    <main className="min-h-screen bg-bg text-fg">
      <div className="pb-[104px]">
        {tab === 'hoje' && <HomeView />}
        {tab === 'semana' && <WeekView />}
        {tab === 'agua' && <WaterView />}
        {tab === 'relatorios' && <ReportsView />}
        {tab === 'jejum' && <FastingView />}
        {tab === 'ajustes' && <AjustesView />}
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </main>
  )
}
