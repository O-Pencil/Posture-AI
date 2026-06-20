/**
 * [WHO]: 导出 SettingsPage（函数组件）
 * [FROM]: react (useState), @/components/haptic/haptic-switch (HapticSwitch), @tabler/icons-react
 * [TO]: 被 App.tsx 消费
 * [HERE]: web/src/pages/SettingsPage.tsx · 设置页（设备 / AI / 通知 / 关于）
 */

import { useState } from "react"
import { HapticSwitch } from "@/components/haptic/haptic-switch"
import {
  IconCpu,
  IconBrain,
  IconBell,
  IconInfoCircle,
} from "@tabler/icons-react"

function SectionHeader({ icon: Icon, label }: { icon: React.FC<{ size?: number; className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mt-6 mb-2">
      <Icon size={14} className="text-[#9B9590]" />
      <div
        className="text-[12px] text-[#9B9590] font-medium tracking-wider"
        style={{ fontFamily: "'Fredoka', sans-serif" }}
      >
        {label}
      </div>
    </div>
  )
}

function DeviceSection() {
  return (
    <div>
      <SectionHeader icon={IconCpu} label="DEVICE" />

      {/* Connected Device */}
      <div className="skeuo-card p-5">
        <div className="flex items-start gap-3">
          <div
            className="size-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(251, 75, 0, 0.1)",
              boxShadow: "inset 0 0 0 1px rgba(251, 75, 0, 0.2)",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fb4b00" strokeWidth="2">
              <rect x="4" y="6" width="16" height="12" rx="2" />
              <circle cx="8" cy="12" r="1.5" fill="#fb4b00" />
              <circle cx="16" cy="12" r="1.5" fill="#fb4b00" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-[#141414]">PoseMaster-C6</span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-[#fb4b00]"
                style={{
                  background: "rgba(251, 75, 0, 0.1)",
                  boxShadow: "inset 0 0 0 1px rgba(251, 75, 0, 0.3)",
                }}
              >
                <span className="size-1 rounded-full bg-[#fb4b00]" />
                Connected
              </span>
            </div>
            <div className="text-[10px] text-[#9B9590] font-mono mt-1">MAC · AA:BB:CC:11:22:33</div>

            {/* Device metrics */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div
                className="rounded-lg p-2.5"
                style={{
                  background: "linear-gradient(to bottom, #e5e5e5, #ffffff)",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.06)",
                }}
              >
                <div className="text-[10px] text-[#9B9590] font-mono">Battery</div>
                <div className="text-sm font-semibold font-mono mt-0.5 text-[#141414]">72%</div>
                <div className="text-[10px] text-[#9B9590]">~ 4h</div>
              </div>
              <div
                className="rounded-lg p-2.5"
                style={{
                  background: "linear-gradient(to bottom, #e5e5e5, #ffffff)",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.06)",
                }}
              >
                <div className="text-[10px] text-[#9B9590] font-mono">Signal</div>
                <div className="text-sm font-semibold font-mono mt-0.5 text-[#141414]">-52</div>
                <div className="text-[10px] text-[#9B9590]">dBm</div>
              </div>
              <div
                className="rounded-lg p-2.5"
                style={{
                  background: "linear-gradient(to bottom, #e5e5e5, #ffffff)",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.06)",
                }}
              >
                <div className="text-[10px] text-[#9B9590] font-mono">Firmware</div>
                <div className="text-sm font-semibold font-mono mt-0.5 text-[#141414]">v1.2.3</div>
                <div className="text-[10px] text-[#fb4b00]">Latest</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button className="skeuo-button text-sm font-medium text-[#333333] py-2.5 text-center">
            Re-pair
          </button>
          <button className="skeuo-button text-sm font-medium text-[#333333] py-2.5 text-center">
            Calibrate
          </button>
          <button
            className="rounded-xl py-2.5 text-center text-sm font-medium text-[#C75348] transition-colors"
            style={{
              background: "rgba(199, 83, 72, 0.08)",
              boxShadow: "inset 0 0 0 1px rgba(199, 83, 72, 0.3)",
            }}
          >
            Unbind
          </button>
        </div>
      </div>

      {/* 3 Node Details */}
      <div className="mt-3 skeuo-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
          <span className="text-sm text-[#666666] font-medium">3 Node Status</span>
          <span className="text-[10px] text-[#fb4b00] font-mono">All Online</span>
        </div>
        <div className="divide-y divide-[rgba(0,0,0,0.04)]">
          {[
            { name: "Node-C · Neck Main", chip: "ESP32-S3 · 72%", signal: "Main", color: "#fb4b00" },
            { name: "Node-T · Thoracic", chip: "BNO085 · 78%", signal: "-48dBm", color: "#fb4b00" },
            { name: "Node-L · Lumbar", chip: "BNO085 + Motor · 65%", signal: "-55dBm", color: "#fb4b00" },
          ].map((node) => (
            <div key={node.name} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-2 rounded-full" style={{ background: node.color }} />
                <div>
                  <div className="text-sm font-medium text-[#141414]">{node.name}</div>
                  <div className="text-[10px] text-[#9B9590] font-mono">{node.chip}</div>
                </div>
              </div>
              <span className="text-[10px] text-[#9B9590] font-mono">{node.signal}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ModelSection() {
  return (
    <div>
      <SectionHeader icon={IconBrain} label="AI MODEL" />
      <div className="skeuo-card p-4 flex items-center gap-3">
        <div
          className="size-9 rounded-xl flex items-center justify-center"
          style={{
            background: "rgba(251, 75, 0, 0.1)",
            boxShadow: "inset 0 0 0 1px rgba(251, 75, 0, 0.3)",
          }}
        >
          <span className="text-[#fb4b00] font-mono font-bold text-[10px]">MNN</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[#141414]">Qwen3-VL-2B</div>
          <div className="text-[10px] text-[#9B9590] font-mono">Not installed · 4 required weight files</div>
        </div>
        <button className="text-sm text-[#fb4b00] font-medium">Install</button>
      </div>
      <p className="text-[10px] text-[#9B9590] mt-2 px-1">
        Falls back to rule-based analysis when model is unavailable.
      </p>
    </div>
  )
}

function NotificationSection() {
  const [vibration, setVibration] = useState(true)
  const [systemNotify, setSystemNotify] = useState(true)
  const [dailySummary, setDailySummary] = useState(false)

  return (
    <div>
      <SectionHeader icon={IconBell} label="REMINDERS" />
      <div className="skeuo-card overflow-hidden divide-y divide-[rgba(0,0,0,0.04)]">
        <div className="px-4 py-3.5 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-[#141414]">Haptic Feedback</div>
            <div className="text-[10px] text-[#9B9590] mt-0.5">Via L5 node motor</div>
          </div>
          <HapticSwitch checked={vibration} onCheckedChange={setVibration} />
        </div>
        <div className="px-4 py-3.5 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-[#141414]">System Notify</div>
            <div className="text-[10px] text-[#9B9590] mt-0.5">After 30 min good posture</div>
          </div>
          <HapticSwitch checked={systemNotify} onCheckedChange={setSystemNotify} />
        </div>
        <div className="px-4 py-3.5 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-[#141414]">Daily Summary</div>
            <div className="text-[10px] text-[#9B9590] mt-0.5">Push at 22:00</div>
          </div>
          <HapticSwitch checked={dailySummary} onCheckedChange={setDailySummary} />
        </div>
      </div>
    </div>
  )
}

function AboutSection() {
  const info = [
    { label: "Version", value: "1.0.0" },
    { label: "Model", value: "Qwen2.5-0.5B" },
    { label: "Framework", value: "MNN + SME2" },
  ]
  return (
    <div>
      <SectionHeader icon={IconInfoCircle} label="ABOUT" />
      <div className="skeuo-card p-4">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="size-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(251, 75, 0, 0.1)",
              boxShadow: "inset 0 0 0 1px rgba(251, 75, 0, 0.2)",
            }}
          >
            <span className="text-[#fb4b00] font-bold text-lg font-mono">C</span>
          </div>
          <div>
            <div
              className="text-base font-bold text-[#141414]"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              Catune
            </div>
            <div className="text-[10px] text-[#9B9590] font-mono">No-slouch posture companion</div>
          </div>
        </div>
        <div className="divide-y divide-[rgba(0,0,0,0.04)]">
          {info.map((row) => (
            <div key={row.label} className="px-1 py-2.5 flex items-center justify-between">
              <span className="text-[11px] text-[#9B9590]">{row.label}</span>
              <span className="text-[11px] font-semibold text-[#141414]">{row.value}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#9B9590] mt-3 px-1">
          Wellness aid, not medical diagnosis. Sensor data stays on device.
        </p>
      </div>
    </div>
  )
}

export function SettingsPage() {
  return (
    <div className="bg-white pb-24 px-4 space-y-5">
      {/* Header */}
      <div className="pt-4 pb-1">
        <div
          className="text-[22px] font-semibold text-[#141414]"
          style={{ fontFamily: "'Fredoka', sans-serif" }}
        >
          Settings
        </div>
      </div>

      <DeviceSection />
      <ModelSection />
      <NotificationSection />
      <AboutSection />
    </div>
  )
}
