// Status colors: brand-coherent, not Duolingo-palette
// Healthy = warm sage (echoes the Haptic warm-neutral background), warning = brand orange, alert = muted clay
const STATUS_COLORS = {
  healthy: "#7BA05B",
  warning: "#fb4b00",
  alert: "#C75348",
  offline: "#AFA8A0",
} as const

// Mock data
const MOCK_DATA = {
  score: 92,
  state: "NORMAL",
  nodes: {
    c7: { angle: 5.2, status: "healthy" as const },
    t12: { angle: 2.1, status: "healthy" as const },
    l5: { angle: 3.4, status: "healthy" as const },
  },
  device: {
    name: "PoseMaster-C6",
    battery: 72,
    signal: -52,
    firmware: "v1.2.3",
    connected: true,
  },
}

function DeviceStatus() {
  const { device } = MOCK_DATA
  return (
    <div className="skeuo-card p-4">
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center"
          style={{
            background: "rgba(251, 75, 0, 0.1)",
            boxShadow: "inset 0 0 0 1px rgba(251, 75, 0, 0.2)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fb4b00" strokeWidth="2">
            <rect x="4" y="6" width="16" height="12" rx="2" />
            <circle cx="8" cy="12" r="1.5" fill="#fb4b00" />
            <circle cx="16" cy="12" r="1.5" fill="#fb4b00" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-[#141414]">{device.name}</span>
            <span
              className="size-2 rounded-full"
              style={{ background: device.connected ? STATUS_COLORS.healthy : STATUS_COLORS.offline }}
            />
          </div>
          <div className="text-[10px] text-[#666666] font-mono">
            3 Nodes · {device.signal}dBm · {device.firmware}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1">
            <svg width="18" height="10" viewBox="0 0 22 12" fill="none">
              <rect x="0.5" y="0.5" width="18" height="11" rx="2" stroke="#9B9590" />
              <rect x="20" y="4" width="2" height="4" rx="1" fill="#9B9590" />
              <rect x="2" y="2" width="13" height="8" rx="1" fill="#fb4b00" />
            </svg>
            <span className="text-[11px] font-mono font-bold text-[#333333]">{device.battery}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SpineVisualizer() {
  const { score, state } = MOCK_DATA

  const stateLabel = state === "NORMAL" ? "Good Posture" : state === "FORWARD" ? "Slouching" : "Leaning"
  const stateColor = state === "NORMAL" ? STATUS_COLORS.healthy : state === "FORWARD" ? STATUS_COLORS.warning : STATUS_COLORS.alert

  return (
    <div
      className="skeuo-card p-4 relative overflow-hidden"
      style={{ height: 380 }}
    >
      {/* Status pill */}
      <div className="absolute top-3 left-3 z-10">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{
            background: `${stateColor}15`,
            color: stateColor,
            boxShadow: `inset 0 0 0 1px ${stateColor}40`,
          }}
        >
          <span className="size-1.5 rounded-full" style={{ background: stateColor }} />
          {stateLabel}
        </span>
      </div>

      {/* Score */}
      <div className="absolute top-3 right-3 z-10 text-right">
        <div className="text-[9px] font-mono text-[#9B9590] font-bold tracking-wider">SCORE</div>
        <div
          className="font-mono text-4xl leading-none font-extrabold"
          style={{ color: stateColor }}
        >
          {score}
        </div>
      </div>

      {/* Desk scene image */}
      <img
        src="/src/assets/desk-scene.png"
        alt="Desk scene"
        className="w-full h-full object-contain"
      />

      {/* Spine nodes overlay */}
      <svg
        viewBox="0 0 400 380"
        className="w-full h-full absolute inset-0 pointer-events-none"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* C7 Node */}
        <g>
          <circle cx="295" cy="110" r="7" fill="none" stroke={STATUS_COLORS.healthy} strokeWidth="2.5">
            <animate attributeName="r" values="7;9;7" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.7;1" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx="295" cy="110" r="4" fill={STATUS_COLORS.healthy}>
            <animate attributeName="r" values="4;5;4" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <rect x="305" y="100" width="28" height="20" rx="6" fill="white" stroke={STATUS_COLORS.healthy} strokeWidth="1.5" />
          <text x="319" y="114" textAnchor="middle" fontFamily="monospace" fontSize="10" fontWeight="700" fill="#141414">C7</text>
        </g>

        {/* T12 Node */}
        <g>
          <circle cx="293" cy="155" r="7" fill="none" stroke={STATUS_COLORS.healthy} strokeWidth="2.5">
            <animate attributeName="r" values="7;9;7" dur="2.4s" begin="0.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.7;1" dur="2.4s" begin="0.4s" repeatCount="indefinite" />
          </circle>
          <circle cx="293" cy="155" r="4" fill={STATUS_COLORS.healthy}>
            <animate attributeName="r" values="4;5;4" dur="2.4s" begin="0.4s" repeatCount="indefinite" />
          </circle>
          <rect x="303" y="145" width="30" height="20" rx="6" fill="white" stroke={STATUS_COLORS.healthy} strokeWidth="1.5" />
          <text x="318" y="159" textAnchor="middle" fontFamily="monospace" fontSize="10" fontWeight="700" fill="#141414">T12</text>
        </g>

        {/* L5 Node */}
        <g>
          <circle cx="291" cy="205" r="7" fill="none" stroke={STATUS_COLORS.healthy} strokeWidth="2.5">
            <animate attributeName="r" values="7;9;7" dur="2.4s" begin="0.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.7;1" dur="2.4s" begin="0.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="291" cy="205" r="4" fill={STATUS_COLORS.healthy}>
            <animate attributeName="r" values="4;5;4" dur="2.4s" begin="0.8s" repeatCount="indefinite" />
          </circle>
          <rect x="301" y="195" width="28" height="20" rx="6" fill="white" stroke={STATUS_COLORS.healthy} strokeWidth="1.5" />
          <text x="315" y="209" textAnchor="middle" fontFamily="monospace" fontSize="10" fontWeight="700" fill="#141414">L5</text>
        </g>
      </svg>
    </div>
  )
}

function NodeAngleCard({ label, angle, status }: { label: string; angle: number; status: "healthy" | "warning" | "alert" }) {
  return (
    <div
      className="flex-1 rounded-xl p-3 text-center"
      style={{
        background: `linear-gradient(to bottom, #ffffff, #f5f5f5)`,
        boxShadow:
          "inset 0 1px 0 0 rgba(255,255,255,0.6), inset 0 -1px 0 0 rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      <div className="text-[10px] font-mono text-[#9B9590] font-bold">{label}</div>
      <div className="text-lg font-mono font-bold" style={{ color: STATUS_COLORS[status] }}>
        {angle}°
      </div>
    </div>
  )
}

export function DeskPage() {
  const { nodes } = MOCK_DATA

  return (
    <div className="pb-24 px-4 space-y-3">
      {/* Greeting */}
      <div className="pt-2 pb-1">
        <div className="text-[10px] font-mono text-[#9B9590] font-bold tracking-wider">POSTURE-AI</div>
        <div
          className="text-lg font-bold tracking-tight text-[#141414]"
          style={{ fontFamily: "'Quicksand', sans-serif" }}
        >
          Good afternoon, <span className="text-[#fb4b00]">Xiao Yu</span>
        </div>
      </div>

      {/* Device Status */}
      <DeviceStatus />

      {/* Spine Visualizer */}
      <SpineVisualizer />

      {/* Node Angles */}
      <div className="flex gap-2">
        <NodeAngleCard label="C7 Neck" angle={nodes.c7.angle} status={nodes.c7.status} />
        <NodeAngleCard label="T12 Thor." angle={nodes.t12.angle} status={nodes.t12.status} />
        <NodeAngleCard label="L5 Lumbar" angle={nodes.l5.angle} status={nodes.l5.status} />
      </div>
    </div>
  )
}
