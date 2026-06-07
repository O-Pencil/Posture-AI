import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface Tab {
  value: string
  label: string
  icon: React.ReactNode
}

interface TabBarProps {
  tabs: Tab[]
  value: string
  onValueChange: (value: string) => void
}

export function TabBar({ tabs, value, onValueChange }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-lg">
        <div
          className="mx-4 mb-4 rounded-2xl bg-gradient-to-b from-white to-[#e5e5e5] p-1"
          style={{
            boxShadow:
              "inset 0 1px 0 0 rgba(255,255,255,0.6), inset 0 -1px 0 0 rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => onValueChange(tab.value)}
                className={cn(
                  "relative flex-1 flex flex-col items-center gap-1 py-2.5 px-3 rounded-xl transition-colors",
                  value === tab.value
                    ? "text-[#141414]"
                    : "text-[#666666] hover:text-[#333333]"
                )}
              >
                {value === tab.value && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute inset-0 rounded-xl bg-gradient-to-b from-white to-[#f5f5f5]"
                    style={{
                      boxShadow:
                        "inset 0 1px 0 0 rgba(255,255,255,0.8), 0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.06)",
                    }}
                    transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.75 }}
                  />
                )}
                <span className="relative z-10">{tab.icon}</span>
                <span className="relative z-10 text-[10px] font-semibold">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
