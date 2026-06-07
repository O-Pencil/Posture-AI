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
    <div className="min-h-screen bg-background">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-mono text-[#9B9590]">
        <span>9:41</span>
        <div className="flex items-center gap-1.5">
          <span>████</span>
          <span>5G</span>
          <span>89%</span>
        </div>
      </div>

      {/* App Title */}
      <div className="text-center pt-2 pb-3">
        <h1
          className="text-3xl font-bold tracking-tight text-[#fb4b00]"
          style={{ fontFamily: "'Fredoka', sans-serif" }}
        >
          Catune
        </h1>
      </div>

      {/* Page Content */}
      <main className="max-w-lg mx-auto">
        {activeTab === "desk" && <DeskPage />}
        {activeTab === "plant" && <PlantPage />}
        {activeTab === "settings" && <SettingsPage />}
      </main>

      {/* Bottom Tab Bar */}
      <TabBar tabs={tabs} value={activeTab} onValueChange={setActiveTab} />
    </div>
  )
}

export default App
