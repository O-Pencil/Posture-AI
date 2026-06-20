/**
 * [WHO]: 导出 DeskPage（函数组件）
 * [FROM]: public/mp4/left2right.mp4（视频帧占位）
 * [TO]: 被 App.tsx 消费
 * [HERE]: web/src/pages/DeskPage.tsx · Desk 首页布局原型（Header + 模型反馈 + 三指标 + 视频主视觉）
 */

import { useEffect, useMemo, useState } from "react"

const BRAND_ORANGE = "#fb4b00"
const POSTURE_VIDEO_SRC = "/mp4/left2right.mp4"

const MOCK_DATA = {
  userName: "Xiao Yu",
  state: "NORMAL",
  message:
    "Your sitting posture is very standard, please keep it up, you have been sitting still for 3h 28min already!",
  nodes: [
    { key: "c7", label: "C7 Neck", angle: 5.2 },
    { key: "t12", label: "T12 Thor.", angle: 3.4 },
    { key: "l5", label: "L5 Lumbar", angle: 1.8 },
  ],
}

const SENSOR_MOCK_FRAMES = [
  { c7: 0, t12: 0, l5: 0 },
  { c7: 10, t12: 4, l5: -2 },
  { c7: -8, t12: -3, l5: 5 },
  { c7: 4, t12: 8, l5: 2 },
]

function DeskHeader() {
  return (
    <header className="shrink-0 px-5 pt-4 pb-2">
      <div
        className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#9B9590]"
        style={{ fontFamily: "'Fredoka', sans-serif" }}
      >
        CATUNE
      </div>
      <div
        className="mt-1.5 text-[14px] leading-5 text-[#141414]"
        style={{ fontFamily: "'Fredoka', sans-serif" }}
      >
        Good afternoon, <span className="text-[#fb4b00]">{MOCK_DATA.userName}</span>
      </div>
      <p
        className="mt-2 max-w-[320px] text-[14px] font-bold leading-5 text-[#141414]"
        style={{ fontFamily: "'Fredoka', sans-serif" }}
      >
        {MOCK_DATA.message}
      </p>
    </header>
  )
}

function MetricStrip() {
  return (
    <section className="grid shrink-0 grid-cols-3 gap-5 px-8 pb-1">
      {MOCK_DATA.nodes.map((node) => (
        <div key={node.key} className="min-w-0">
          <div className="truncate text-[7px] font-semibold text-[#aaa29a]">{node.label}</div>
          <div className="mt-1 font-mono text-[13px] font-bold leading-none" style={{ color: BRAND_ORANGE }}>
            {node.angle.toFixed(1)}°
          </div>
        </div>
      ))}
    </section>
  )
}

function SensorOverlay() {
  const [frameIndex, setFrameIndex] = useState(0)
  const sensorFrame = SENSOR_MOCK_FRAMES[frameIndex]
  const basePoints = useMemo(
    () => [
      { key: "c7", y: 62, offsetAngle: sensorFrame.c7 },
      { key: "t12", y: 108, offsetAngle: sensorFrame.t12 },
      { key: "l5", y: 154, offsetAngle: sensorFrame.l5 },
    ],
    [sensorFrame],
  )
  const pixelsPerDegree = 1.5
  const centerX = 92
  const points = basePoints.map((point) => ({
    ...point,
    x: centerX + point.offsetAngle * pixelsPerDegree,
  }))
  const curvePath = `M ${points[0].x} ${points[0].y} C ${points[0].x} ${(points[0].y + points[1].y) / 2}, ${points[1].x} ${(points[0].y + points[1].y) / 2}, ${points[1].x} ${points[1].y} S ${points[2].x} ${(points[1].y + points[2].y) / 2}, ${points[2].x} ${points[2].y}`

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % SENSOR_MOCK_FRAMES.length)
    }, 1800)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 top-[32%] h-[190px] w-[184px] -translate-x-1/2">
        <svg
          className="absolute inset-0 h-full w-full overflow-visible"
          viewBox="0 0 184 190"
          aria-hidden="true"
        >
          <path
            className="cat-sensor-curve"
            d={curvePath}
            fill="none"
            stroke="#5f625d"
            strokeOpacity="0.48"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>

        {points.map((point) => (
          <div
            key={point.key}
            className="cat-sensor-point absolute flex size-[14px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/85 bg-[#141414]/35 shadow-[0_1px_4px_rgba(0,0,0,0.2)]"
            style={{
              left: point.x,
              top: point.y,
            }}
            aria-hidden="true"
          >
            <span className="size-[4px] rounded-full bg-white" />
          </div>
        ))}
      </div>
    </div>
  )
}

function PostureScene() {
  return (
    <section className="relative flex min-h-[290px] flex-1 overflow-hidden px-0">
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent via-white/80 to-white" />
      <div className="relative h-full min-h-[290px] w-full">
        <div className="absolute inset-0 overflow-hidden">
          <video
            className="absolute bottom-[1%] left-1/2 h-[96%] max-w-none -translate-x-[54%] object-contain"
            src={POSTURE_VIDEO_SRC}
            aria-label="Cat posture video frame"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          />
          <SensorOverlay />
        </div>
      </div>
    </section>
  )
}

export function DeskPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white pb-24">
      <DeskHeader />
      <MetricStrip />
      <PostureScene />
    </div>
  )
}
