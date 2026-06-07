import { useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  HapticAccordion,
  HapticAccordionContent,
  HapticAccordionItem,
  HapticAccordionTrigger,
  HapticAvatar,
  HapticBadge,
  HapticButton,
  HapticCheckbox,
  HapticChip,
  HapticIconButton,
  HapticKnob,
  HapticProgress,
  HapticRadio,
  HapticSegmentedControl,
  HapticSelect,
  HapticSlider,
  HapticStepper,
  HapticSwitch,
  HapticTabs,
  HapticTooltip,
  type HapticChipColor,
  type HapticSelectOption,
} from "@/components/haptic"

/* ============================================================
   Helper Components
   ============================================================ */

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-12">
      <h2 className="skeuo-text-embossed text-2xl font-semibold mb-1">
        {title}
      </h2>
      {description && (
        <p className="text-muted-foreground text-sm mb-6">{description}</p>
      )}
      {children}
    </section>
  )
}

function ShadowDemo({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-24 h-24 rounded-lg bg-card ${className}`} />
      <span className="text-xs text-muted-foreground font-mono">{label}</span>
    </div>
  )
}

const CHIP_COLORS: HapticChipColor[] = [
  "white",
  "grey",
  "yellow",
  "green",
  "red",
  "blue",
  "purple",
]

/* ============================================================
   Main Showcase
   ============================================================ */

export function SkeuomorphismShowcase() {
  const [switch1, setSwitch1] = useState(false)
  const [switch2, setSwitch2] = useState(true)
  const [selectorSwitch, setSelectorSwitch] = useState(true)
  const [newsletter, setNewsletter] = useState(false)
  const [hapticRadio, setHapticRadio] = useState(true)
  const [hapticCheckbox, setHapticCheckbox] = useState(false)
  const [sliderValue, setSliderValue] = useState(60)
  const [stepperValue, setStepperValue] = useState(3)
  const [progressValue, setProgressValue] = useState(72)
  const [segment, setSegment] = useState("day")
  const [activeTab, setActiveTab] = useState("overview")
  const [openItem, setOpenItem] = useState<string>("")
  const [knobValue, setKnobValue] = useState(45)
  const [fruit, setFruit] = useState("apple")
  const [stepper2, setStepper2] = useState(1)

  const FRUIT_OPTIONS: HapticSelectOption[] = [
    { value: "apple", label: "Apple", description: "Crisp & sweet" },
    { value: "banana", label: "Banana", description: "Soft & tropical" },
    { value: "cherry", label: "Cherry", description: "Tiny & tart" },
    { value: "durian", label: "Durian", description: "Spiky & pungent", disabled: true },
    { value: "elderberry", label: "Elderberry", description: "Dark & rich" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="skeuo-surface skeuo-border-b py-8 px-6 text-center">
        <h1 className="skeuo-text-embossed text-4xl font-bold tracking-tight mb-2">
          HapticDesign
        </h1>
        <p className="text-muted-foreground text-lg">
          拟物化设计系统 — Token 工具类 + Figma 组件
        </p>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* 1. Shadow Tokens */}
        <Section
          title="Shadow Tokens"
          description="6 levels of skeuomorphic shadows: raised, flat, deep, pressed, inset, highlight"
        >
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-6">
            <ShadowDemo label="raised" className="skeuo-raised" />
            <ShadowDemo label="flat" className="skeuo-flat" />
            <ShadowDemo label="deep" className="skeuo-deep" />
            <ShadowDemo label="pressed" className="skeuo-pressed" />
            <ShadowDemo label="inset" className="skeuo-inset" />
            <ShadowDemo label="highlight" className="skeuo-highlight" />
          </div>
        </Section>

        {/* 2. Surface Gradients */}
        <Section
          title="Surface Gradients"
          description="Simulated curvature and metallic sheen via directional gradients"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="h-32 rounded-lg skeuo-surface skeuo-raised skeuo-border flex items-center justify-center">
              <span className="skeuo-text-embossed-subtle text-sm font-medium">
                Surface
              </span>
            </div>
            <div className="h-32 rounded-lg skeuo-surface-radial skeuo-raised skeuo-border flex items-center justify-center">
              <span className="skeuo-text-embossed-subtle text-sm font-medium">
                Surface + Radial
              </span>
            </div>
            <div className="h-32 rounded-lg skeuo-metallic skeuo-raised skeuo-border flex items-center justify-center">
              <span className="skeuo-text-embossed-subtle text-sm font-medium">
                Metallic
              </span>
            </div>
          </div>
        </Section>

        {/* 3. Texture Overlays */}
        <Section
          title="Texture Overlays"
          description="Noise/grain, linen/paper, and brushed metal textures via ::after pseudo-elements"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="h-32 rounded-lg bg-card skeuo-raised skeuo-texture-noise skeuo-border flex items-center justify-center">
              <span className="skeuo-text-embossed-subtle text-sm font-medium relative z-10">
                Noise / Grain
              </span>
            </div>
            <div className="h-32 rounded-lg bg-card skeuo-raised skeuo-texture-linen skeuo-border flex items-center justify-center">
              <span className="skeuo-text-embossed-subtle text-sm font-medium relative z-10">
                Linen / Paper
              </span>
            </div>
            <div className="h-32 rounded-lg bg-card skeuo-raised skeuo-texture-brushed skeuo-border flex items-center justify-center">
              <span className="skeuo-text-embossed-subtle text-sm font-medium relative z-10">
                Brushed Metal
              </span>
            </div>
          </div>
        </Section>

        {/* 4. Figma Components */}
        <Section
          title="Components"
          description="Figma 设计稿还原的 Button、Switch、Radio、Checkbox、Chip"
        >
          <div className="space-y-8">
            <div>
              <h3 className="skeuo-text-embossed-subtle text-sm font-medium mb-3">
                Button & IconButton
              </h3>
              <div className="haptic-btn-demo">
                <HapticButton variant="standard" label="Filter" />
                <HapticButton variant="primary" label="New entry" />
                <HapticIconButton
                  variant="standard"
                  aria-label="Filter"
                />
                <HapticIconButton
                  variant="primary"
                  aria-label="New entry"
                />
                <HapticButton
                  variant="primary"
                  label="Disabled"
                  disabled
                />
              </div>
            </div>

            <div>
              <h3 className="skeuo-text-embossed-subtle text-sm font-medium mb-3">
                Selectors
              </h3>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <HapticSwitch
                    checked={selectorSwitch}
                    onCheckedChange={setSelectorSwitch}
                  />
                  <span className="text-sm text-muted-foreground">
                    Switch {selectorSwitch ? "ON" : "OFF"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <HapticRadio
                    selected={hapticRadio}
                    onClick={() => setHapticRadio(true)}
                  />
                  <HapticRadio
                    selected={!hapticRadio}
                    onClick={() => setHapticRadio(false)}
                  />
                  <span className="text-sm text-muted-foreground">Radio</span>
                </div>
                <div className="flex items-center gap-3">
                  <HapticCheckbox
                    selected={hapticCheckbox}
                    onClick={() => setHapticCheckbox(!hapticCheckbox)}
                  />
                  <span className="text-sm text-muted-foreground">
                    Checkbox
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="skeuo-text-embossed-subtle text-sm font-medium mb-3">
                Chip
              </h3>
              <div className="flex flex-wrap gap-2">
                {CHIP_COLORS.map((color) => (
                  <HapticChip key={color} color={color} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* 5. Inputs */}
        <Section
          title="Inputs"
          description="Recessed/inset appearance with focus glow"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
            <div>
              <label className="skeuo-text-embossed-subtle text-sm font-medium block mb-2">
                Standard Input
              </label>
              <Input
                className="skeuo-input h-10 px-3"
                placeholder="Type something..."
              />
            </div>
            <div>
              <label className="skeuo-text-embossed-subtle text-sm font-medium block mb-2">
                Recessed Well
              </label>
              <div className="skeuo-well p-3 min-h-[40px] flex items-center">
                <span className="text-muted-foreground text-sm">
                  Well content area
                </span>
              </div>
            </div>
          </div>
        </Section>

        {/* 7. Cards */}
        <Section
          title="Cards"
          description="Raised surface with directional borders and texture"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card className="skeuo-card skeuo-texture-linen">
              <CardHeader>
                <CardTitle className="skeuo-text-embossed">
                  Raised Card
                </CardTitle>
                <CardDescription>
                  With linen texture and directional border
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This card uses the skeuo-card composite class with raised
                  shadow, overhead light border, and linen texture overlay.
                </p>
              </CardContent>
            </Card>
            <Card className="skeuo-deep skeuo-border rounded-[var(--radius-skeuo-lg)] bg-card">
              <CardHeader>
                <CardTitle className="skeuo-text-embossed">
                  Deep Elevation
                </CardTitle>
                <CardDescription>
                  Higher elevation with stronger shadows
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This card uses the deep shadow for a floating effect with
                  multiple shadow layers at different distances.
                </p>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* 8. Switch & Slider */}
        <Section
          title="Switch & Slider"
          description="HapticSwitch 开关与 HapticSlider 滑块"
        >
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            <div className="flex items-center gap-4">
              <HapticSwitch
                checked={switch1}
                onCheckedChange={setSwitch1}
              />
              <span className="skeuo-text-embossed-subtle text-sm">
                {switch1 ? "ON" : "OFF"}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <HapticSwitch
                checked={switch2}
                onCheckedChange={setSwitch2}
              />
              <span className="skeuo-text-embossed-subtle text-sm">
                {switch2 ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex-1 max-w-xs">
              <label className="skeuo-text-embossed-subtle text-sm font-medium block mb-2">
                Slider: {sliderValue}%
              </label>
              <HapticSlider
                value={sliderValue}
                onValueChange={setSliderValue}
              />
            </div>
          </div>
        </Section>

        {/* 9. Text Effects */}
        <Section
          title="Text Effects"
          description="Embossed (raised) and debossed (engraved) text via text-shadow"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg bg-card skeuo-raised skeuo-border text-center">
              <span className="skeuo-text-embossed text-xl font-semibold">
                Embossed
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Light shadow above
              </p>
            </div>
            <div className="p-6 rounded-lg skeuo-well text-center">
              <span className="skeuo-text-debossed text-xl font-semibold">
                Debossed
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Engraved into surface
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card skeuo-raised skeuo-border text-center">
              <span className="skeuo-text-embossed-subtle text-xl font-semibold">
                Subtle Emboss
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Gentle raised effect
              </p>
            </div>
          </div>
        </Section>

        {/* 10. Directional Borders */}
        <Section
          title="Directional Borders"
          description="Overhead light simulation — lighter on top/left, darker on bottom/right"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="h-24 rounded-lg bg-card skeuo-raised skeuo-border flex items-center justify-center">
              <span className="skeuo-text-embossed-subtle text-sm font-medium">
                Standard
              </span>
            </div>
            <div className="h-24 rounded-lg bg-card skeuo-flat skeuo-border-subtle flex items-center justify-center">
              <span className="skeuo-text-embossed-subtle text-sm font-medium">
                Subtle
              </span>
            </div>
            <div className="h-24 rounded-lg bg-card skeuo-pressed skeuo-border-pressed flex items-center justify-center">
              <span className="skeuo-text-embossed-subtle text-sm font-medium">
                Pressed
              </span>
            </div>
          </div>
        </Section>

        {/* 11. Stepper & Progress */}
        <Section
          title="Stepper & Progress"
          description="Canvas 容器 + 细边框的步进器与 8px 细轨道进度条，品牌橙填充"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="skeuo-text-embossed-subtle text-sm font-medium block mb-2">
                  Quantity
                </label>
                <HapticStepper
                  value={stepperValue}
                  onValueChange={setStepperValue}
                  min={0}
                  max={10}
                />
              </div>
              <div>
                <label className="skeuo-text-embossed-subtle text-sm font-medium block mb-2">
                  Quantity (with label)
                </label>
                <HapticStepper
                  value={stepper2}
                  onValueChange={setStepper2}
                  min={-5}
                  max={5}
                  label={`${stepper2} item${stepper2 === 1 ? "" : "s"}`}
                />
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="skeuo-text-embossed-subtle text-sm font-medium block mb-2">
                  Download ({progressValue}%)
                </label>
                <HapticProgress
                  value={progressValue}
                  variant="blue"
                  showLabel
                  striped
                />
                <div className="flex gap-2 mt-2">
                  <HapticButton
                    variant="standard"
                    label="-25"
                    onClick={() =>
                      setProgressValue((v) => Math.max(0, v - 25))
                    }
                  />
                  <HapticButton
                    variant="primary"
                    label="+25"
                    onClick={() =>
                      setProgressValue((v) => Math.min(100, v + 25))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="skeuo-text-embossed-subtle text-sm font-medium block mb-2">
                  Battery Health
                </label>
                <HapticProgress
                  value={88}
                  max={100}
                  variant="green"
                  showLabel
                />
              </div>
              <div>
                <label className="skeuo-text-embossed-subtle text-sm font-medium block mb-2">
                  Storage
                </label>
                <HapticProgress
                  value={progressValue}
                  variant="gradient"
                  showLabel
                />
              </div>
            </div>
          </div>
        </Section>

        {/* 12. Segmented Control & Tabs */}
        <Section
          title="Segmented Control & Tabs"
          description="iOS-style segmented selector with sliding indicator; tab bar with underline/pill indicator"
        >
          <div className="space-y-8">
            <div>
              <h3 className="skeuo-text-embossed-subtle text-sm font-medium mb-3">
                Segmented Control
              </h3>
              <HapticSegmentedControl
                value={segment}
                onValueChange={setSegment}
                options={[
                  { value: "day", label: "Day" },
                  { value: "week", label: "Week" },
                  { value: "month", label: "Month" },
                  { value: "year", label: "Year" },
                ]}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Selected: {segment}
              </p>
            </div>
            <div>
              <h3 className="skeuo-text-embossed-subtle text-sm font-medium mb-3">
                Tabs (default with underline)
              </h3>
              <HapticTabs
                tabs={[
                  { value: "overview", label: "Overview" },
                  {
                    value: "activity",
                    label: "Activity",
                    badge: 3,
                  },
                  { value: "settings", label: "Settings" },
                  { value: "archived", label: "Archived", disabled: true },
                ]}
                value={activeTab}
                onValueChange={setActiveTab}
                variant="default"
              />
            </div>
            <div>
              <h3 className="skeuo-text-embossed-subtle text-sm font-medium mb-3">
                Tabs (pill variant)
              </h3>
              <HapticTabs
                tabs={[
                  { value: "all", label: "All" },
                  { value: "photos", label: "Photos" },
                  { value: "videos", label: "Videos" },
                  { value: "docs", label: "Documents" },
                ]}
                value={activeTab}
                onValueChange={setActiveTab}
                variant="pill"
              />
            </div>
          </div>
        </Section>

        {/* 13. Avatar & Badge */}
        <Section
          title="Avatar & Badge"
          description="简洁描边头像与状态点；扁平色块徽章，soft shadow 轻拟物"
        >
          <div className="space-y-8">
            <div>
              <h3 className="skeuo-text-embossed-subtle text-sm font-medium mb-3">
                Avatars
              </h3>
              <div className="flex flex-wrap items-end gap-4">
                <HapticAvatar
                  size="smaller"
                  ring="metal"
                  status="online"
                  name="Alice Chen"
                />
                <HapticAvatar
                  size="default"
                  ring="metal"
                  status="busy"
                  name="Bob Smith"
                />
                <HapticAvatar
                  size="bigger"
                  ring="gold"
                  status="online"
                  name="Carol Davis"
                />
                <HapticAvatar
                  size="huge"
                  ring="gold"
                  name="David Wilson"
                />
                <HapticAvatar
                  size="default"
                  ring="none"
                  name="Eve Foster"
                />
              </div>
            </div>
            <div>
              <h3 className="skeuo-text-embossed-subtle text-sm font-medium mb-3">
                Badges (pill)
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <HapticBadge color="red" variant="pill" label="Live" />
                <HapticBadge color="orange" variant="pill" label="Beta" />
                <HapticBadge color="yellow" variant="pill" label="New" />
                <HapticBadge color="green" variant="pill" label="Active" />
                <HapticBadge color="blue" variant="pill" label="Verified" />
                <HapticBadge color="purple" variant="pill" label="Pro" />
                <HapticBadge color="grey" variant="pill" label="Draft" />
              </div>
            </div>
            <div>
              <h3 className="skeuo-text-embossed-subtle text-sm font-medium mb-3">
                Count Badges
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <HapticBadge color="red" variant="count" count={3} />
                <HapticBadge color="red" variant="count" count={12} />
                <HapticBadge color="red" variant="count" count={99} />
                <HapticBadge color="red" variant="count" count={150} />
                <HapticBadge color="blue" variant="count" count={7} size="bigger" />
              </div>
            </div>
            <div>
              <h3 className="skeuo-text-embossed-subtle text-sm font-medium mb-3">
                Outline & Dots
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <HapticBadge color="green" variant="dot" />
                <HapticBadge color="yellow" variant="dot" />
                <HapticBadge color="red" variant="dot" />
                <HapticBadge color="blue" variant="outline" label="Outlined" />
                <HapticBadge color="purple" variant="outline" label="Custom" />
              </div>
            </div>
          </div>
        </Section>

        {/* 14. Accordion */}
        <Section
          title="Accordion"
          description="Expandable section with animated chevron and recessed content area"
        >
          <div className="max-w-2xl">
            <HapticAccordion
              value={openItem}
              onValueChange={(v) => setOpenItem(Array.isArray(v) ? (v[0] ?? "") : v)}
            >
              <HapticAccordionItem value="item-1">
                <HapticAccordionTrigger>
                  What is HapticDesign?
                </HapticAccordionTrigger>
                <HapticAccordionContent>
                  A skeuomorphic design system built with React, Tailwind v4,
                  and Motion. Utility 风格精致拟物：品牌橙、canvas 表面、
                  soft shadow 与轻量渐变，配合 Motion 按压反馈。
                </HapticAccordionContent>
              </HapticAccordionItem>
              <HapticAccordionItem value="item-2">
                <HapticAccordionTrigger>
                  How do I install it?
                </HapticAccordionTrigger>
                <HapticAccordionContent>
                  Clone the repo, run <code>pnpm install</code>, then{" "}
                  <code>pnpm dev</code>. The dev server opens with the full
                  showcase page so you can see every component in action.
                </HapticAccordionContent>
              </HapticAccordionItem>
              <HapticAccordionItem value="item-3">
                <HapticAccordionTrigger>
                  Can I use the components in production?
                </HapticAccordionTrigger>
                <HapticAccordionContent>
                  Absolutely. Every component follows accessibility best
                  practices (ARIA roles, keyboard navigation, focus management)
                  and is fully tree-shakeable.
                </HapticAccordionContent>
              </HapticAccordionItem>
            </HapticAccordion>
          </div>
        </Section>

        {/* 15. Knob */}
        <Section
          title="Rotary Knob"
          description="拖拽旋转拨盘，与 Utility 按钮同风格的精致拟物质感"
        >
          <div className="flex flex-wrap items-end gap-8">
            <div>
              <HapticKnob
                value={knobValue}
                onValueChange={setKnobValue}
                min={0}
                max={100}
              />
              <p className="text-xs text-center text-muted-foreground mt-2">
                Standard ({knobValue})
              </p>
            </div>
            <div>
              <HapticKnob value={30} variant="metal" disabled />
              <p className="text-xs text-center text-muted-foreground mt-2">
                Subtle (disabled)
              </p>
            </div>
            <div>
              <HapticKnob value={75} variant="neon" size="bigger" />
              <p className="text-xs text-center text-muted-foreground mt-2">
                Accent
              </p>
            </div>
            <div>
              <HapticKnob value={20} size="smaller" />
              <p className="text-xs text-center text-muted-foreground mt-2">
                Smaller
              </p>
            </div>
          </div>
        </Section>

        {/* 16. Select & Tooltip */}
        <Section
          title="Select & Tooltip"
          description="与 Utility 按钮同风格的下拉触发器；品牌色 Tooltip 气泡箭头"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="skeuo-text-embossed-subtle text-sm font-medium mb-3">
                Select
              </h3>
              <HapticSelect
                label="Favorite Fruit"
                value={fruit}
                onValueChange={setFruit}
                options={FRUIT_OPTIONS}
                placeholder="Pick one..."
              />
            </div>
            <div>
              <h3 className="skeuo-text-embossed-subtle text-sm font-medium mb-3">
                Tooltips
              </h3>
              <div className="flex flex-wrap gap-3">
                <HapticTooltip content="Edit this item" side="top">
                  <HapticButton variant="standard" label="Hover me (top)" />
                </HapticTooltip>
                <HapticTooltip content="Saved to your library" side="bottom" variant="accent">
                  <HapticButton variant="primary" label="Save" />
                </HapticTooltip>
                <HapticTooltip content="Light variant" side="right" variant="light">
                  <HapticButton variant="standard" label="Hint" />
                </HapticTooltip>
              </div>
            </div>
          </div>
        </Section>

        {/* 17. Composite Form */}
        <Section
          title="Composite Form"
          description="Token 工具类与 Figma 组件组合使用的示例表单"
        >
          <Card className="skeuo-card skeuo-texture-noise max-w-lg">
            <CardHeader>
              <CardTitle className="skeuo-text-embossed">Contact Us</CardTitle>
              <CardDescription>
                skeuo-input / skeuo-well + Haptic 组件
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="skeuo-text-embossed-subtle text-sm font-medium block mb-2">
                  Name
                </label>
                <Input
                  className="skeuo-input h-10 px-3"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="skeuo-text-embossed-subtle text-sm font-medium block mb-2">
                  Email
                </label>
                <Input
                  className="skeuo-input h-10 px-3"
                  placeholder="you@example.com"
                  type="email"
                />
              </div>
              <div>
                <label className="skeuo-text-embossed-subtle text-sm font-medium block mb-2">
                  Message
                </label>
                <div className="skeuo-well p-3 min-h-[80px]">
                  <span className="text-muted-foreground text-sm">
                    Your message here...
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <HapticSwitch
                  checked={newsletter}
                  onCheckedChange={setNewsletter}
                />
                <span className="skeuo-text-embossed-subtle text-sm">
                  Subscribe to newsletter
                </span>
              </div>
              <HapticButton
                label="Send Message"
                variant="primary"
                className="w-full"
              />
            </CardContent>
          </Card>
        </Section>
      </main>

      <footer className="skeuo-surface skeuo-border-t py-6 px-6 text-center">
        <p className="skeuo-text-embossed-subtle text-sm">
          HapticDesign — Skeuomorphic Design System
        </p>
      </footer>
    </div>
  )
}
