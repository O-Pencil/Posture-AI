import { useState } from "react"
import { cn } from "@/lib/utils"
import { HapticProgress } from "@/components/haptic/haptic-progress"
import { HapticBadge } from "@/components/haptic/haptic-badge"

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

function BadgeIcon({ kind }: { kind: string }) {
  // Hand-drawn glyphs that match the skeuomorphic depth instead of flat emoji
  switch (kind) {
    case "link":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fb4b00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      )
    case "flame":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fb4b00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      )
    case "star":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fb4b00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )
    case "trophy":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fb4b00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      )
    case "bloom":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B9590" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5" />
          <path d="M12 7.5V9" />
          <path d="M7.5 12H9" />
          <path d="M16.5 12H15" />
          <path d="M12 16.5V15" />
          <path d="m8 8 1.88 1.88" />
          <path d="M14.12 9.88 16 8" />
          <path d="m8 16 1.88-1.88" />
          <path d="M14.12 14.12 16 16" />
        </svg>
      )
    case "crown":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B9590" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
          <path d="M5 21h14" />
        </svg>
      )
    default:
      return null
  }
}

const BADGES = [
  { id: 1, name: "First Pair", kind: "link", unlocked: true },
  { id: 2, name: "3-Day Streak", kind: "flame", unlocked: true },
  { id: 3, name: "Perfect Pose", kind: "star", unlocked: true },
  { id: 4, name: "7-Day Streak", kind: "trophy", unlocked: true },
  { id: 5, name: "Plant Bloom", kind: "bloom", unlocked: false },
  { id: 6, name: "30-Day Streak", kind: "crown", unlocked: false },
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
  const streak = 7
  const todayMinutes = 185
  const targetMinutes = 300

  return (
    <div className="pb-24 px-4 space-y-3">
      {/* Header */}
      <div className="pt-2 pb-1">
        <div
          className="text-lg font-bold text-[#141414]"
          style={{ fontFamily: "'Quicksand', sans-serif" }}
        >
          Posture Plant
        </div>
      </div>

      {/* Plant Display */}
      <div className="skeuo-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] font-mono text-[#9B9590] font-bold tracking-wider">PLANT</div>
            <div
              className="text-lg font-bold text-[#141414]"
              style={{ fontFamily: "'Quicksand', sans-serif" }}
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

      {/* Streak Counter */}
      <div className="skeuo-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-[#9B9590] font-bold tracking-wider">STREAK</div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-mono text-[#fb4b00] text-5xl font-extrabold">{streak}</span>
              <span className="text-sm text-[#666666]">days</span>
            </div>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <div
                key={day}
                className={cn(
                  "size-8 rounded-lg flex items-center justify-center text-[10px] font-bold",
                  day <= streak
                    ? "bg-[#fb4b00] text-white"
                    : "bg-[#f5f5f5] text-[#9B9590]"
                )}
              >
                {day}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today Progress */}
      <div className="skeuo-card p-5">
        <div className="text-[10px] font-mono text-[#9B9590] font-bold tracking-wider mb-3">TODAY</div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[#333333]">Good Posture Time</span>
          <span className="font-mono text-sm font-bold text-[#141414]">
            {todayMinutes}/{targetMinutes} min
          </span>
        </div>
        <HapticProgress
          value={todayMinutes}
          max={targetMinutes}
          variant="orange"
          showLabel
          label={`${Math.round((todayMinutes / targetMinutes) * 100)}%`}
        />
      </div>

      {/* Badges */}
      <div className="skeuo-card p-5">
        <div className="text-[10px] font-mono text-[#9B9590] font-bold tracking-wider mb-3">BADGES</div>
        <div className="grid grid-cols-3 gap-3">
          {BADGES.map((badge) => (
            <div
              key={badge.id}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl transition-colors",
                badge.unlocked
                  ? "bg-[#fb4b00]/5 border border-[#fb4b00]/20"
                  : "bg-[#f5f5f5] border border-[#e5e5e5] opacity-50"
              )}
            >
              <BadgeIcon kind={badge.kind} />
              <span className="text-[10px] font-semibold text-center text-[#333333]">
                {badge.name}
              </span>
              {badge.unlocked && (
                <HapticBadge color="orange" variant="pill" size="smaller" label="Unlocked" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
