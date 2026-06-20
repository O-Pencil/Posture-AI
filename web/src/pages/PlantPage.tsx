/**
 * [WHO]: 导出 PlantPage（函数组件）
 * [FROM]: react (useState), @/lib/utils (cn)
 * [TO]: 被 App.tsx 消费
 * [HERE]: web/src/pages/PlantPage.tsx · 植物养成（5 阶段 SVG + 积分表格）
 */

import { useState } from "react"
import { cn } from "@/lib/utils"

const STAGES = [
  { id: 0, name: "Seed" },
  { id: 1, name: "Sprout" },
  { id: 2, name: "Sapling" },
  { id: 3, name: "Bud" },
  { id: 4, name: "Fruit" },
]

// Warm-leaning plant palette: olive, moss, fern, leaf, deep fern
// (avoids the Tailwind green rainbow that fights the Haptic warm neutrals)
const PLANT_PALETTE = {
  pot: { body: "#C2725A", rim: "#A0563D", highlight: "#D4886F" },
  soil: "#5C3D24",
  sprout: "#A3B559",
  stemYoung: "#7BA05B",
  stemMid: "#5B8043",
  stemMature: "#3F6A2E",
  leaf: "#7BA05B",
  leafLight: "#9DBE6E",
  bud: "#CE82FF",
  budLight: "#E9B0FF",
  fruitRed: "#C75348",
  fruitYellow: "#E8A93C",
}

const SCORE_LOG = [
  { id: 1, time: "06-08 14:30", action: "Good posture 30 min", delta: +5, score: 92 },
  { id: 2, time: "06-08 12:00", action: "Missed stretch break", delta: -3, score: 87 },
  { id: 3, time: "06-08 09:15", action: "Morning check-in", delta: +2, score: 90 },
  { id: 4, time: "06-07 18:30", action: "Sustained good posture", delta: +8, score: 88 },
  { id: 5, time: "06-07 15:00", action: "Slouching detected", delta: -5, score: 80 },
  { id: 6, time: "06-07 10:00", action: "Morning check-in", delta: +2, score: 85 },
  { id: 7, time: "06-06 20:15", action: "Evening stretch done", delta: +3, score: 83 },
  { id: 8, time: "06-06 14:00", action: "Forward head posture", delta: -4, score: 80 },
  { id: 9, time: "06-06 09:30", action: "Morning check-in", delta: +2, score: 84 },
  { id: 10, time: "06-05 16:45", action: "Good posture 45 min", delta: +7, score: 82 },
]

function PlantSvg({ stage }: { stage: number }) {
  return (
    <svg viewBox="0 0 100 100" className="w-44 h-44">
      {/* Shadow */}
      <ellipse cx="50" cy="93" rx="30" ry="3" fill="#000" opacity="0.1" />

      {/* Pot */}
      <path d="M 14 70 L 22 92 L 58 92 L 66 70 Z" fill={PLANT_PALETTE.pot.body} />
      <path d="M 14 70 L 66 70 L 64 73 L 16 73 Z" fill={PLANT_PALETTE.pot.rim} />
      <rect x="14" y="67" width="52" height="4" rx="1" fill={PLANT_PALETTE.pot.highlight} />
      <ellipse cx="40" cy="70" rx="24" ry="2.5" fill={PLANT_PALETTE.soil} />

      {/* Stage 0: Seed */}
      {stage === 0 && (
        <g>
          <ellipse cx="50" cy="68" rx="3" ry="1.5" fill={PLANT_PALETTE.sprout} />
        </g>
      )}

      {/* Stage 1: Sprout */}
      {stage === 1 && (
        <g>
          <path d="M 50 68 L 50 50" stroke={PLANT_PALETTE.stemYoung} strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="46" cy="55" rx="6" ry="2.5" fill={PLANT_PALETTE.leafLight} transform="rotate(-25 46 55)" />
          <ellipse cx="54" cy="52" rx="6" ry="2.5" fill={PLANT_PALETTE.leafLight} transform="rotate(25 54 52)" />
        </g>
      )}

      {/* Stage 2: Sapling */}
      {stage === 2 && (
        <g>
          <path d="M 50 68 L 50 35" stroke={PLANT_PALETTE.stemMid} strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="40" cy="50" rx="9" ry="3.5" fill={PLANT_PALETTE.leaf} transform="rotate(-25 40 50)" />
          <ellipse cx="60" cy="45" rx="9" ry="3.5" fill={PLANT_PALETTE.leaf} transform="rotate(25 60 45)" />
          <ellipse cx="42" cy="62" rx="7" ry="3" fill={PLANT_PALETTE.leafLight} transform="rotate(-15 42 62)" />
          <ellipse cx="58" cy="58" rx="7" ry="3" fill={PLANT_PALETTE.leafLight} transform="rotate(15 58 58)" />
          <circle cx="50" cy="35" r="2" fill={PLANT_PALETTE.leaf} />
        </g>
      )}

      {/* Stage 3: Bud */}
      {stage === 3 && (
        <g>
          <path d="M 50 68 L 50 22" stroke={PLANT_PALETTE.stemMature} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="38" cy="50" rx="11" ry="4" fill={PLANT_PALETTE.leaf} transform="rotate(-30 38 50)" />
          <ellipse cx="62" cy="44" rx="11" ry="4" fill={PLANT_PALETTE.leaf} transform="rotate(30 62 44)" />
          <ellipse cx="40" cy="62" rx="9" ry="3.5" fill={PLANT_PALETTE.leafLight} transform="rotate(-15 40 62)" />
          <ellipse cx="60" cy="56" rx="9" ry="3.5" fill={PLANT_PALETTE.leafLight} transform="rotate(15 60 56)" />
          <ellipse cx="50" cy="22" rx="8" ry="10" fill={PLANT_PALETTE.bud} />
          <ellipse cx="50" cy="22" rx="5" ry="7" fill={PLANT_PALETTE.budLight} />
        </g>
      )}

      {/* Stage 4: Fruit */}
      {stage === 4 && (
        <g>
          <path d="M 50 68 L 50 14" stroke={PLANT_PALETTE.stemMature} strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="35" cy="50" rx="13" ry="4.5" fill={PLANT_PALETTE.leaf} transform="rotate(-30 35 50)" />
          <ellipse cx="65" cy="45" rx="13" ry="4.5" fill={PLANT_PALETTE.leaf} transform="rotate(30 65 45)" />
          <ellipse cx="40" cy="64" rx="10" ry="4" fill={PLANT_PALETTE.leafLight} transform="rotate(-15 40 64)" />
          <ellipse cx="60" cy="60" rx="10" ry="4" fill={PLANT_PALETTE.leafLight} transform="rotate(15 60 60)" />
          <circle cx="42" cy="40" r="4" fill={PLANT_PALETTE.fruitRed} />
          <circle cx="58" cy="38" r="4" fill={PLANT_PALETTE.fruitYellow} />
          <circle cx="50" cy="22" r="3.5" fill={PLANT_PALETTE.fruitRed} />
          <circle cx="46" cy="30" r="3" fill={PLANT_PALETTE.fruitYellow} />
        </g>
      )}
    </svg>
  )
}

export function PlantPage() {
  const [currentStage, setCurrentStage] = useState(2)
  const currentScore = SCORE_LOG[0]?.score ?? 0

  return (
    <div className="pb-24 px-4 space-y-3">
      {/* Header */}
      <div className="pt-2 pb-1">
        <div
          className="text-lg font-bold text-[#141414]"
          style={{ fontFamily: "'Fredoka', sans-serif" }}
        >
          Posture Plant
        </div>
      </div>

      {/* Plant Display */}
      <div className="skeuo-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div
              className="text-[11px] text-[#9B9590] font-medium tracking-wider"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              PLANT
            </div>
            <div
              className="text-lg font-bold text-[#141414]"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              Today's Plant
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#9B9590]">Current Stage</div>
            <div className="text-base font-mono font-bold text-[#fb4b00]">
              {currentStage} · {STAGES[currentStage].name}
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl h-56 flex items-center justify-center relative overflow-hidden"
          style={{
            background: "linear-gradient(to bottom, #FFFCF7, #F5F0E8)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.06)",
          }}
        >
          {/* Sun */}
          <div className="absolute top-3 right-3 opacity-30">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5" fill="#E8A93C" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" stroke="#E8A93C" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <PlantSvg stage={currentStage} />
        </div>

        {/* Stage Selector */}
        <div className="grid grid-cols-5 gap-1.5 mt-4">
          {STAGES.map((stage) => (
            <button
              key={stage.id}
              onClick={() => setCurrentStage(stage.id)}
              className={cn(
                "text-center py-3 rounded-xl transition-colors min-h-[44px]",
                currentStage === stage.id
                  ? "bg-[#fb4b00]/10 border border-[#fb4b00]/40"
                  : "hover:bg-[#f5f5f5]"
              )}
            >
              <div
                className={cn(
                  "text-[10px] font-mono font-bold",
                  currentStage === stage.id ? "text-[#fb4b00]" : "text-[#9B9590]"
                )}
              >
                {stage.id}
              </div>
              <div
                className={cn(
                  "text-[11px] mt-0.5",
                  currentStage === stage.id ? "text-[#fb4b00] font-bold" : "text-[#9B9590]"
                )}
              >
                {stage.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Score Log */}
      <div className="skeuo-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] font-mono text-[#9B9590] font-bold tracking-wider">SCORE LOG</div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-extrabold text-[#fb4b00]">{currentScore}</span>
            <span className="text-[11px] text-[#9B9590]">pts</span>
          </div>
        </div>

        <div className="space-y-0">
          {SCORE_LOG.map((entry, i) => (
            <div
              key={entry.id}
              className={cn(
                "flex items-center justify-between py-3",
                i < SCORE_LOG.length - 1 && "border-b border-[#e5e5e5]"
              )}
            >
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-[11px] font-mono text-[#9B9590]">{entry.time}</span>
                <span className="text-[13px] text-[#333333] truncate">{entry.action}</span>
              </div>
              <span
                className={cn(
                  "font-mono text-sm font-bold shrink-0 ml-3",
                  entry.delta > 0 ? "text-[#3a9e1f]" : "text-[#c20a0a]"
                )}
              >
                {entry.delta > 0 ? "+" : ""}{entry.delta}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
