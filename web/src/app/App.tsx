/**
 * [WHO]: 默认导出 App（根组件）
 * [FROM]: react (useEffect/useRef/useState), @/components/layout/TabBar, @/pages/DeskPage, @/pages/PlantPage, @/pages/SettingsPage, @/components/icons/GaugeIcon, @/components/icons/FanIcon, @/components/icons/SettingsIcon
 * [TO]: 被 main.tsx 默认导入
 * [HERE]: web/src/app/App.tsx · 根组件，Tab 路由 + URL query 参数 + 动画图标管理
 */

import { useEffect, useRef, useState } from "react"
import { TabBar } from "@/components/layout/TabBar"
import { DeskPage } from "@/pages/DeskPage"
import { PlantPage } from "@/pages/PlantPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { GaugeIcon, type GaugeIconHandle } from "@/components/icons/GaugeIcon"
import { FanIcon, type FanIconHandle } from "@/components/icons/FanIcon"
import { SettingsIcon, type SettingsIconHandle } from "@/components/icons/SettingsIcon"

function getInitialTab() {
  const tab = new URLSearchParams(window.location.search).get("tab")
  if (tab === "desk" || tab === "plant" || tab === "settings") return tab
  return "desk"
}

function App() {
  const [activeTab, setActiveTab] = useState(getInitialTab)
  const deskIconRef = useRef<GaugeIconHandle>(null)
  const plantIconRef = useRef<FanIconHandle>(null)
  const settingsIconRef = useRef<SettingsIconHandle>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const refMap: Record<string, React.RefObject<{ startAnimation: () => void; stopAnimation: () => void } | null>> = {
      desk: deskIconRef,
      plant: plantIconRef,
      settings: settingsIconRef,
    }

    const ref = refMap[activeTab]
    ref?.current?.startAnimation()
    const timer = setTimeout(() => {
      ref?.current?.stopAnimation()
    }, 1200)
    return () => clearTimeout(timer)
  }, [activeTab])

  const tabs = [
    {
      value: "desk",
      label: "Desk",
      icon: (
        <div className="size-5">
          <GaugeIcon ref={deskIconRef} size={20} />
        </div>
      ),
    },
    {
      value: "plant",
      label: "Plant",
      icon: (
        <div className="size-5">
          <FanIcon ref={plantIconRef} size={20} />
        </div>
      ),
    },
    {
      value: "settings",
      label: "Settings",
      icon: (
        <div className="size-5">
          <SettingsIcon ref={settingsIconRef} size={20} />
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen text-[#141414]" style={{ backgroundColor: '#F2F0EC' }}>
      <main className="mx-auto flex min-h-screen max-w-lg flex-col overflow-hidden">
        {activeTab === "desk" && <DeskPage />}
        {activeTab === "plant" && <PlantPage />}
        {activeTab === "settings" && <SettingsPage />}
      </main>

      <TabBar tabs={tabs} value={activeTab} onValueChange={setActiveTab} />
    </div>
  )
}

export default App
