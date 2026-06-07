# Figma Make 提示词 v3 · Haptic 拟物化 × 前卫大胆英文版

> 用途：在 Figma Make 中生成 Catune App 完整 UI
> 风格：**项目自有 Haptic 设计系统**（17 个组件、oklch 配色、4 级圆角层级） × **Editorial Avant-Garde**（编辑式前卫大胆排版）
> 界面语言：**English-first**，Chinese 作为 secondary toggle
> 中心角色：黑猫坐在白桌前（来自用户提供的 Image #1）
> 创建日期：2026-06-08 · 修订 v3（结合 web/src/components/haptic/ 实际设计系统）

---

## 配套资源（生成时一并使用）

生成前请把以下两份文件作为参考图一起喂给 Figma Make：

1. `web/src/components/haptic/tokens.ts` — 完整色板和尺寸 token
2. `web/src/styles/index.css` 的 Section 1 + Section 7 — 阴影 token、动画 keyframe、Haptic 组件 CSS

Figma Make 拿到这些后会**复用 Haptic 库的视觉语言**，而不是发明新风格。

---

## 使用方法

1. 在 Figma 中打开 Figma Make（或 Figma AI）
2. 完整复制下面"提示词正文"中的全部内容
3. 在指令末尾追加：
   ```
   Use the following image as the central cat character illustration: [附上 Image #1 那张黑猫图]
   Reference design system: this app uses a custom Haptic component library (see tokens.ts and index.css for tokens). Match the tokens, shadows, radius hierarchy, and component patterns exactly.
   ```
4. Figma Make 会生成一组 390×844 的 frame，覆盖 10 个核心页面，每个页面 EN + 中文 双版本 = 20 frames
5. 生成后手动微调：替换插画为实际 cat 角色素材、调整字号间距、补充 icon

---

## 提示词正文

```
Design a mobile health app called "POSTURE.AI" — a posture correction coach for desk workers. This app uses a **custom Haptic skeuomorphic design system** as the foundation. The visual language blends that system's tactile, utility-grade component aesthetic with **Editorial Avant-Garde** typography. The result feels like a high-fashion magazine spread rendered with the precision of an industrial control panel: huge confident typography, asymmetric editorial layouts, BUT every interactive control is a properly engineered Haptic component (button, switch, chip, slider, stepper, knob, segmented control, tab, badge, accordion, avatar, tooltip, select, checkbox, radio, progress, icon button).

**NOT** flat design. **NOT** traditional mobile UI patterns. **NOT** corporate dashboard. **NOT** a Duolingo clone. The Haptic system already has its own identity — respect it, don't replace it with generic "skeuomorphic" tropes.

---

## Design Philosophy (CRITICAL — read first)

1. **Typography is the hero.** Numbers are ENORMOUS (200-320pt). Headlines are condensed, uppercase, tight-tracked. Body is sparse and confident. One screen should feel like one page of a fashion magazine **using Haptic components as the actual interactive elements**.
2. **Break the grid (carefully).** Editorial asymmetry lives in layout, headlines, and number placement. Haptic components themselves stay aligned and properly sized — they look like real industrial controls embedded in the editorial layout. The contrast is the design.
3. **One character, one accent.** The black cat with the orange scarf is the ONLY 3D character. The Haptic brand orange `#fb4b00` is the ONLY warm accent. Everything else is monochrome + functional status color.
4. **Material contrast.** 3D matte objects (cat, plant, sensor) sit on a 2D typographic surface. Haptic components sit on the same surface but read as raised/pressed industrial controls. The three layers (3D object / 2D type / Haptic control) coexist.
5. **Confident copy.** Short. Punchy. Sometimes lowercase. Sometimes ALL CAPS. No corporate jargon. The cat "speaks" to the user in first-person sometimes via italic serif.
6. **Bilingual, English-first.** All UI text in English by default. A language toggle in settings switches to Chinese (中文). English is the lead, Chinese is the variant.

---

## Central Hero Asset (CRITICAL)

The app's signature character is a **3D-rendered black cat** sitting on a small white stool at a minimalist white desk, viewed from behind. The cat is matte black with a slightly soft, plush texture (think rubber/silicone product render), and wears a **warm orange scarf** (`#fb4b00` — matches Haptic brand) around its neck with the ends hanging down its back. The desk is clean white with thin legs. The stool is white, simple, four-legged. The whole scene sits on a soft white background with a gentle ambient shadow grounding it.

**Place this exact illustration as the centerpiece of the Home/Desk screen**, occupying ~60% of the screen height, centered horizontally BUT allowed to bleed off the bottom edge slightly for editorial drama.

**The cat's spine area must be visible** — overlay 3 small glowing dots here representing IMU nodes at C7/T12/L5. They look like physical LED indicators embedded into the cat's back, with a soft glow:
- Green (`#7dd957` / dark `#3a9e1f` — matches Haptic Chip green) when normal
- Yellow (`#ffb84d` / dark — matches Haptic Chip yellow) when attention
- Red (`#ff7070` / dark `#c20a0a` — matches Haptic Chip red) only when sustained abnormal

The dots pulse gently (scale 1→1.15, soft glow halo, 2s loop). They look like real physical LEDs.

---

## Design System — Haptic Tokens (USE THESE EXACTLY)

This app already has a Haptic design system. The colors, shadows, radius hierarchy, and component patterns below are the **actual project tokens** from `web/src/components/haptic/tokens.ts` and `web/src/styles/index.css`. Match them.

### Color Tokens (Haptic palette + oklch mapping)

```
/* Haptic Brand */
--color-haptic-brand:         #fb4b00   /* primary brand orange (matches cat scarf) */
--color-haptic-brand-dark:    #cc3402   /* brand dark, for borders + pressed state */
--color-haptic-brand-light:   #ffa060   /* brand light, for gradient start */
--color-haptic-brand-foreground: #fff0ea /* text on brand surfaces */

/* Haptic Neutrals */
--color-haptic-surface:       #fafafa   /* card surface */
--color-haptic-canvas:        #f5f5f5   /* page background */
--color-haptic-foreground:    #333333   /* body text */
--color-haptic-foreground-strong: #141414 /* headlines + emphasized text */

/* Haptic Gradient Stops (top → bottom for raised controls) */
--color-haptic-neutral-start: #ffffff
--color-haptic-neutral-end:   #e5e5e5
--color-haptic-indent-start:  #e5e5e5
--color-haptic-indent-end:    #ffffff
--color-haptic-selected-start: #ffa060
--color-haptic-selected-end:   #cc3402

/* Haptic Borders + Shadows */
--haptic-shadow-tint: 22, 36, 44      /* RGB triple for shadow rgba() */
--color-haptic-border:        rgba(22, 36, 44, 0.08)
--color-haptic-border-strong: rgba(22, 36, 44, 0.12)

/* Status (Haptic Chip colors) */
--haptic-green-light:  #7dd957
--haptic-green-dark:   #3a9e1f
--haptic-red-light:    #ff7070
--haptic-red-dark:     #c20a0a
--haptic-yellow-light: #ffb84d
--haptic-blue-light:   #ffa060 (= brand light, used for AI/info)
--haptic-purple-light: #c49bff
--haptic-grey-light:   #fafafa
--haptic-grey-dark:    #8c8c8c

/* AI indicator */
--haptic-ai-blue:      #2962FF
```

### Haptic Shadow Tokens (USE EXACT STRINGS)

```
--haptic-shadow-soft:
  0 1px 2px rgba(22, 36, 44, 0.06),
  0 0 0 1px rgba(22, 36, 44, 0.06);

--haptic-shadow-standard:
  0 4px 8px -4px rgba(22, 36, 44, 0.16),
  0 1px 2px rgba(22, 36, 44, 0.16),
  0 0 0 1px rgba(22, 36, 44, 0.12);

--haptic-shadow-primary:
  0 4px 8px -4px rgba(0, 0, 0, 0.32),
  0 1px 2px rgba(0, 0, 0, 0.32),
  0 0 0 1px #cc3402;  /* brand-dark border */

--haptic-shadow-elevated:
  0 0 1px rgba(0, 0, 0, 0.25),
  0 2px 4px rgba(0, 0, 0, 0.45);

--haptic-inset-subtle:
  inset 0 1px 2px rgba(22, 36, 44, 0.06);
```

### Haptic Radius Hierarchy (FOUR levels, not two)

```
--radius-haptic-shell:    1rem      (16px)  ← outer containers, indent wells
--radius-haptic-frame:    0.5rem    (8px)   ← buttons, accordions, cards
--radius-haptic-surface:  0.25rem   (4px)   ← chips, segments, stepper buttons
--radius-haptic-pill:     9999px            ← switches, radios, badges
```

### Haptic Texture (CRITICAL — this is the Haptic signature)

The Haptic library uses a **subtle noise overlay** on canvas backgrounds. The noise is a fractal SVG turbulence applied with mix-blend-mode: overlay at 0.1 opacity. Reference data URI:

```css
.skeuo-noise::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0.1;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-size: cover;
  mix-blend-mode: overlay;
}
```

**Apply this noise texture to the page background, demo canvases, and any large flat surface.** It's what makes Haptic feel premium, not generic.

---

## Haptic Component Library (17 components — design them faithfully)

Every interactive control in the app must be one of the following Haptic components. Do NOT invent new control styles. If a screen needs a button, it must look like a HapticButton. If it needs a toggle, it must look like a HapticSwitch.

### Naming convention
- All prefixed with `Haptic*` (PascalCase) or `haptic-*` (kebab-case)
- Common dimensions: `smaller` (24-28px), `default` (32-40px), `bigger` (40-56px)
- Common shapes: `rounded` (surface radius 4px), `pill` (9999px)
- Common variants: `standard` (neutral gradient) and `primary` (brand gradient)

### 1. HapticButton (the workhorse)
- Two variants: **standard** (white-to-grey gradient, neutral text) and **primary** (brand-light-to-brand-dark gradient, brand-foreground text)
- Size: 8px top / 16px sides / 8px bottom padding, height ~32-40px
- Shape: `frame` radius (8px)
- Standard uses `--haptic-shadow-standard`; primary uses `--haptic-shadow-primary` (with brand-dark border)
- Has a 1px top inner highlight (light catches the top edge — 70% gradient stop, see CSS line 670-682)
- Has a 1px bottom inner shadow (the pressed look preview)
- Optional left icon (8px gap to label)
- Animation: spring (y: -0.5 hover, y: 0.5 + scale 0.99 tap) — 150ms ease
- Disabled: opacity 0.55

### 2. HapticIconButton
- Same as HapticButton but icon-only, square padding (8px)
- Used for tab bar items, inline actions, tool icons

### 3. HapticSwitch
- Pill shape, 44×24px total
- Track: canvas color with `--haptic-inset-subtle` (pressed-in look) and 1px border
- Thumb: 18×18px white sphere with `--haptic-shadow-soft`, sits 2px from edge
- When checked: track becomes selected gradient (`#ffa060` → `#cc3402`) with additional inset glow `inset 0 0 8px color-mix(in srgb, #cc3402 35%, transparent)`
- Thumb slides right 20px (1.25rem translate) over 200ms

### 4. HapticSlider
- Track: 8px tall, canvas color, `--haptic-inset-subtle`, pill shape
- Fill: brand color at 35% opacity (color-mix) to match selected state
- Thumb: 20×20px white sphere, sits 4px above track, `--haptic-shadow-soft`
- Active/inactive state changes cursor to grab/grabbing

### 5. HapticStepper
- Container: 3px padding, frame radius (8px), canvas background, 1px border
- Buttons: 28×28px, surface radius (4px), neutral gradient, --haptic-shadow-soft
- Value display: tabular-nums, 14px medium, 56px min-width, surface radius, inset
- Layout: [- button] [value] [+ button] in a row

### 6. HapticSegmentedControl
- Container: 3px padding, frame radius, canvas bg, 1px border
- Indicator (active): 1px border, soft shadow, surface radius, neutral-start bg
- Items: 6/14px padding, 13px medium font, transparent bg, no border
- Active text: foreground-strong + weight 600

### 7. HapticTabs
- Two variants: `default` (underline style) and `pill` (segmented style)
- Default: 1px bottom border on container, 2px brand-color underline for active
- Pill: same as segmented but with horizontal layout and badge support
- Badge: 18×18px pill, brand gradient, 10px font

### 8. HapticChip
- Size smaller/default/bigger (16px font, 4/6/8px padding, 6/8/10px sides)
- Shape: `rounded` (4px) or `pill` (9999px)
- Color: white/grey/yellow/green/red/blue/purple
- Tone: `light` (pastel bg) or `dark` (saturated bg + brand-foreground text)
- Weight 600, letter-spacing 0.02em

### 9. HapticBadge
- Variants: `dot` (8px circle), `pill` (text pill), `count` (numeric badge), `outline` (border-only)
- Sizes: smaller (10px), default (11px), bigger (13px)
- Same color set as HapticChip
- Outline variant uses currentColor for border, 1px solid

### 10. HapticRadio
- Standalone: just the dot, transparent bg
- Indent variant: 12px padding wrapper, pill radius, canvas bg, 1px border
- Dot size: 24/32/40px (smaller/default/bigger)
- Selected: dot filled with brand color (or the actual implementation shows gradient)

### 11. HapticCheckbox
- Same as HapticRadio but square (4px radius) and shows a check icon when selected
- Check icon: brand-foreground (white) SVG, sized 14/18/22px

### 12. HapticProgress
- Track: 8px tall, canvas bg, inset shadow, 1px border, pill shape
- Fill: brand gradient OR with stripes (`-45deg` repeating 4px white-transparent)
- Optional shine overlay: top 22% white opacity gradient
- Label: 12px medium, right-aligned, tabular-nums

### 13. HapticAvatar
- Sizes: smaller (40), default (56), bigger (80), huge (120)
- Inner: 3px from edge, 1px border, neutral-start bg, overflow hidden
- Initials: 36% of avatar size, weight 600
- Ring variants: `none` (just the inner), `metal` (2px neutral border), `gold` (2px brand color border)
- Status dot: 22% of avatar size, 2px white border, positioned bottom-right
- Status colors: online=green, busy=red, away=brand

### 14. HapticAccordion
- Container: flex column, 8px gap
- Item: 1px border, frame radius, neutral-start bg, soft shadow
- Trigger: 14/18px padding, 14px weight 600, full-width flex between
- Chevron: 24px pill, canvas bg, 1px border
- Content: 18px sides, 16px bottom padding, foreground text, 1.6 line-height

### 15. HapticKnob (rotary dial)
- Variant: standard (cap on canvas) or neon (dark cap, brand-foreground text, brand-soft glow)
- Track: radial mask to show only an arc, 8px stroke
- Cap: 12px inset from edge, pill shape, surface gradient, standard shadow
- Indicator: 2px wide, 26% height, 10% top margin, brand color (or brand-light with glow on neon)
- Value text: bottom 12% of cap, tabular-nums, 12px medium
- Disabled: 0.5 opacity, not-allowed cursor

### 16. HapticSelect
- Sizes: smaller (6/10px padding, 12px font), default (10/14px, 14px), bigger (14/18px, 16px)
- Trigger: full width, frame radius, surface gradient, soft shadow, 1px strong border
- Open state: inset subtle shadow, canvas bg
- List: absolute, 4px padding, frame radius, neutral-start bg, soft shadow, 240px max-height
- Option: 8/12px padding, surface radius, foreground-strong text
- Hover: canvas bg
- Active: brand-12% mix bg with inset brand-20% mix border

### 17. HapticTooltip
- Variants: default (dark cap), light (light cap), accent (brand gradient cap)
- Sizes: smaller (10px), default (12px), bigger (14px)
- Padding: 6/12px (default)
- Box-shadow: deep + soft layered
- Position: top/bottom/left/right of trigger, 8px offset
- Has a small arrow (8x8 rotated 45deg, with shadow)

---

## Typography (Editorial Avant-Garde on top of Haptic's Geist + Open Sans)

The Haptic system uses Geist Variable + Open Sans. Push the typography further for editorial drama.

- **Display / Hero number** (the score, countdowns): 
  - Font: a heavy condensed sans like "Bebas Neue" or "Anton" (override the rounded Geist for display)
  - Size: **200-320pt** for home score — ENORMOUS
  - Tracking: -0.04em
  - Color: `#141414` (foreground-strong)
- **Section headlines** (page titles like "MY PLANT."): 
  - Font: Open Sans 700 (the actual Haptic font for headings)
  - Size: 48-64pt
  - ALL CAPS
  - Color: `#141414`
  - End with a period (editorial punctuation)
- **Subhead / category labels** (like "STATUS" / "GROWTH"): 
  - Font: Geist Variable 500 (matches Haptic body)
  - Size: 10-11pt
  - ALL CAPS
  - Tracking: +0.12em (very wide)
  - Color: `#9B9B9B` (not in Haptic — use a neutral mid-grey)
- **Body text**: 
  - Font: Geist Variable 400-500 (matches Haptic body)
  - Size: 14-16pt
  - Sentence case
  - Line height: 1.4
  - Color: `#333333` (Haptic foreground)
- **Mono / technical**: 
  - Font: JetBrains Mono or Geist Mono
  - Size: 11-13pt
  - Color: `#333333`
- **Quote / cat speaks** (the "i've been holding this posture for 47 minutes" voice): 
  - Font: italic serif like "Newsreader" or "Source Serif Pro" italic
  - Size: 17-20pt
  - Color: `#141414`
  - The ONLY serif in the app — when the cat speaks, the system breaks on purpose

### Status bar (matches existing app)
The Haptic system already has a mono status bar at the top (used in `app/App.tsx`): `9:41` left, `████ 5G 89%` right, 11px font, color `#9B9590`. Use this exact style for all screens.

---

## Haptic Gradients (the secret sauce)

Every "raised" Haptic control uses a top-to-bottom gradient. The light comes from above.

```
/* Neutral control: top is white, bottom is light grey */
linear-gradient(to bottom, #ffffff, #e5e5e5)

/* Selected/active: top is brand-light, bottom is brand-dark */
linear-gradient(to bottom, #ffa060, #cc3402)

/* Indent (pressed in) control: top is grey, bottom is white — INVERTED */
linear-gradient(to bottom, #e5e5e5, #ffffff)

/* Primary button shine: 0-70% transparent, 70-93% white-to-transparent, 93-100% transparent */
linear-gradient(180deg, transparent 70%, rgba(255,255,255,0.5) 93.619%, transparent 100%)
```

This shine line is what makes Haptic buttons feel like real physical buttons. Use it on every HapticButton in the design.

---

## Layout Rules (BOLD editorial choices, but use Haptic components for controls)

- **Editorial asymmetry** lives in: number placement, headline position, card offsets
- **Haptic components stay aligned** — they look like real industrial controls embedded in the editorial layout
- **3D cat + plant + sensor**: 3D matte, soft, tactile, allowed to bleed slightly off the bottom edge
- **2D typography**: massive, asymmetric, allowed to touch card edges
- **Haptic components**: 1-3px smaller than expected, deliberate, "embedded into the page"
- **Generous whitespace** between editorial sections, but the Haptic controls themselves are tightly packed (proper touch targets)
- **No emoji, no cute icons** anywhere except the 3D rendered cat/plant
- **3 sizes of text only**: huge (200-320pt display) / medium (14-20pt body) / tiny (9-11pt labels)

### Rules (HARD constraints)
- Use Haptic components for ALL interactive controls. Do not invent new control styles.
- Use Haptic colors exactly. No off-token colors.
- The orange `#fb4b00` is the ONLY warm accent (besides cat scarf).
- Status colors strict: green/yellow/red per Haptic Chip palette.
- Red only for sustained abnormal, never as background.
- Apply noise texture to the page background and large flat surfaces.
- Bilingual: English first; Chinese appears when user toggles language in settings.

---

## App Structure — 4-tab bottom navigation (using HapticTabs pill variant)

Tab 1: HOME (cat scene)
Tab 2: PLANT (gamification)
Tab 3: TRAIN (exercises)
Tab 4: AGENT (MCP gateway)

Plus: Settings accessible from top-right gear HapticIconButton. Language toggle inside Settings using HapticSegmentedControl (EN / 中文).

---

## Screen 1: HOME — The Hero

Mobile portrait, 390×844. **Status bar at top (9:41 left, ████ 5G 89% right, 11px mono, #9B9590).**

**Top bar:**
- Top-left: a **HapticChip** with `tone=light` and `color=green` (when normal) — text "NOMINAL". Rounded full pill.
- Top-right: a **HapticIconButton** (gear icon, standard variant) for settings.

**Below status bar, tiny uppercase caption (10pt, #9B9B9B, +0.12em tracking):**
"POSTURE SCORE / NOW"

**THE SCORE — editorial hero:**
- Massive number "86" centered, taking up ~30% of screen width
- **280pt, Bebas Neue / Anton weight 900, `#141414`, tracking -0.04em**
- The number BLEEDS — so big it almost touches the screen edges
- Below: tiny 9pt grey uppercase: "/ 100"
- Bottom-right of the number: a tiny **HapticBadge** variant=pill color=orange with "+2" — sits next to the number, looks like a price tag

**Center: 3D cat scene (~50% screen height)**
- The 3D black cat at the white desk, centered, allowed to bleed off the bottom edge
- 3 LED dots on the spine glowing green (use Haptic green colors)
- Orange scarf
- Small 3D desk plant to the left (3 leaves, healthy)
- Tiny closed white laptop to the right
- Soft ambient shadow

**Below the cat — editorial caption (italic serif, cat voice):**
- Italic serif text, 17pt, `#141414`, centered
- "i've been holding this posture for 47 minutes. not bad."

**Below caption — AI action card (asymmetric, flush left, 70% width):**
- A **HapticAccordion item** (frame radius 8px, white bg, soft shadow, 1px border) — but always-expanded for the home card
- Inside: tiny uppercase 9pt grey label "AI INSIGHT" + small AI sparkle icon (Haptic blue `#2962FF`)
- Body text in Geist 15pt regular, foreground color
- Bottom-right: a tiny orange text link "see more →" (use Haptic brand color, NOT a button)

**Bottom: HapticTabs pill variant, floating 16px above bottom edge**
- 4 tabs with HapticAvatar-sized icons (40px) and 11px label
- HOME / PLANT / TRAIN / AGENT
- Active: pill indicator (neutral-start bg) behind active tab item, foreground-strong + weight 600
- Inactive: foreground color, weight 500

---

## Screen 2: PLANT — Gamification (editorial garden)

**Top: large editorial header**
- Uppercase tiny caption: "GROWTH / 2026.06.08" (mono)
- Huge Open Sans 700 headline: **"MY PLANT."** (64pt, ALL CAPS, period at end)

**Center: the 3D plant in a white ceramic pot**
- Same material language as the cat
- Current stage large, centered
- 5 stages as small HapticChip rounded thumbnails in a horizontal row below (current is selected with brand color)

**Below plant — STREAK block (asymmetric, big):**
- Left: HUGE number "7" (**200pt, Bebas Neue 900, `#fb4b00`** — orange because the streak is celebrated)
- Right: smaller text "DAYS. IN A ROW." (Open Sans 18pt, 700, foreground-strong)
- Below: **7 HapticBadge variant=dot** in a row (8px each), green for completed days, grey for incomplete

**ACHIEVEMENTS section:**
- Tiny caption: "TROPHIES"
- Big headline: "6 TO COLLECT." (48pt, Open Sans 700)
- 6 **HapticAvatar** (size=default, 56px) in a horizontal row, ring=gold when unlocked, ring=none when locked
- Inside avatar: the badge icon (a Haptic Chip colored by status, or just a glyph)
- Locked avatar shows a small lock glyph in the bottom-right status dot position
- Each avatar has a small uppercase 9pt label below

**Bottom: HapticTabs pill variant.**

---

## Screen 3: TRAIN — Exercise Guide

**Top: editorial header**
- Tiny caption: "TODAY / 3 MOVES"
- Huge headline: **"STAND TALL."** (64pt, Open Sans 700, period at end)
- Subtitle (italic serif, cat voice): "5 minutes. trust me."

**Exercise list (NOT a card list, editorial index):**
- 3 rows, each full-width with hairline divider (`--color-haptic-border`)
- Each row:
  - Left: small mono number "01" / "02" / "03" in #9B9B9B
  - Middle: exercise name in 24pt Open Sans 700, with duration below in 11pt grey "30 SEC"
  - Right: 3 small **HapticBadge variant=dot** (8px) for difficulty (filled = active)
  - Far right: a small **HapticButton variant=primary** with label "START →" (compact, smaller padding)

**Active state (full screen):**
- Center: MASSIVE countdown number "30" (**300pt, Bebas Neue 900, `#141414`**)
- Around the number: a **HapticProgress** with brand gradient + shine + 45deg stripes (8px tall, pill)
- Top-left corner: small uppercase "MOVE 01 / 03" in mono
- Bottom: italic serif tip from the cat: "breathe. you're doing fine."

**After exercise — feedback chips:**
- Tiny label: "HOW WAS IT?"
- 4 **HapticChip** (size=default, shape=pill, tone=light) in a row: TOO EASY, JUST RIGHT, TOO HARD, PAIN
- Selected chip: tone=dark with brand foreground text

---

## Screen 4: AGENT — MCP Gateway

**Top: editorial header**
- Tiny caption: "DEVELOPER / MCP"
- Huge headline: **"AGENT GATEWAY."** (64pt, Open Sans 700)

**Status block (asymmetric, off-grid):**
- Left: a **HapticAvatar** ring=gold with a small green dot inside (Haptic green), label "RUNNING" + tiny mono "for 2h 34m"
- Right: three inline mono stats: "1 CLIENT" / "142 REQUESTS" / "0 ERRORS"

**Connection info card (Haptic Accordion item style, full width):**
- One **HapticAccordion item** (frame radius, white bg, soft shadow, 1px border)
- Inside, label-value rows in JetBrains Mono:
  - URL: `http://192.168.1.5:8765/mcp`
  - TOKEN: `cat_****...a3f2` (with **HapticIconButton** copy icon next to it)
  - PROTOCOL: `SSE + POST` (as a **HapticChip** color=blue tone=light)

**Tools section:**
- Tiny caption: "10 TOOLS"
- 2-column grid of tool tiles. Each tile is a HapticAccordion item (small, 12px padding)
- Inside: HapticIconButton-style icon (24px, blue tone) top-left, tool name in mono 12pt, one-line description in 9pt grey, call count as a tiny HapticBadge count variant top-right (brand color)

**Terminal demo (the only dark element, also editorial):**
- A HapticAccordion item with dark cap (override `--color-haptic-foreground-strong` as bg, white text)
- Header: tiny orange label "// LIVE DEMO" in mono
- Simulated Claude Code session in green mono text (#7dd957)
- Blinking cursor
- The card bleeds slightly off the page padding (editorial)

**Bottom: HapticTabs pill variant.**

---

## Screen 5: PAIRING (first-time)

- Tiny caption: "STEP 01 / 03"
- Huge headline: **"PAIR YOUR BAND."** (64pt, Open Sans 700)
- Subtitle (italic serif, cat voice): "looking for you nearby..."

**Center: the BLE scan animation**
- A small 3D white sensor device (Apple-AirTag-like) with a soft pulsing **HapticProgress** ring around it (pill shape, brand gradient, 4px tall, animating)

**Three states as separate frames in the design file:**
- Scanning: orange HapticProgress pulsing, label "SCANNING"
- Connected: green HapticAvatar ring=gold with check icon, "3 NODES ONLINE"
- Failed: red HapticBadge variant=dot pulsing, "NOT FOUND" + **HapticButton** primary "RETRY"

**Bottom: a HUGE primary HapticButton "BEGIN →"** (size=bigger, full width minus 24px)

---

## Screen 6: CALIBRATION (first-time)

- Tiny caption: "STEP 02 / 03 · HOLD STILL"
- Center: MASSIVE countdown number "5" (**350pt, Bebas Neue 900, `#141414`**) counting down 5→4→3→2→1
- Around the number: a **HapticProgress** with brand gradient + stripes (8px tall, pill, ring layout)
- Below: italic serif cat voice: "just your natural posture. that's the baseline."
- Bottom-right: a tiny uppercase "SKIP" text link (Geist 11pt, foreground color)

The number is SO big that the rest of the screen feels empty — editorial drama.

---

## Screen 7: SETTINGS (editorial menu using HapticAccordion)

- Tiny caption: "PREFS"
- Huge headline: **"SETTINGS."** (64pt, Open Sans 700)

Below: a **HapticAccordion** with 6 items:

1. **DEVICE** (expanded by default)
   - HapticAvatar ring=metal (smaller, 40px) + label "PostureBand-C6" + HapticBadge pill color=green "85%" battery
2. **ALERTS**
   - 3 rows of HapticSwitch toggles
3. **VIBRATION**
   - HapticSegmentedControl with 3 items: LOW / MID / HIGH (selected = brand)
4. **LANGUAGE**
   - HapticSegmentedControl with 2 items: EN / 中文
5. **TROPHIES**
   - Trigger: small accordion expanding to show 6 HapticAvatar trophies
6. **ABOUT**
   - Version "v0.1.0" + tiny uppercase "TAP 5× FOR DEMO"
   - Privacy, License, Open Source links

The whole list feels like a magazine table of contents, not an iOS settings page.

---

## Screen 8: DEMO CONSOLE (hidden, dark theme)

This is the only dark page. The Haptic system has dark mode CSS overrides — use them.

- Dark canvas: `#141414` (foreground-strong)
- Top: orange uppercase tiny label "// DEMO MODE" in mono
- Huge white headline: **"PRETEND."** (64pt, Open Sans 700, white)
- 4 large **HapticButton** in a 2x2 grid:
  - NOMINAL (use `--haptic-green-light` bg)
  - TECH NECK (use `--haptic-yellow-light` bg)
  - HUNCH (use `--haptic-red-light` bg)
  - LEFT LEAN (use `--haptic-purple-light` bg)
- Each button: bigger size, frame radius, with a small HapticBadge variant=dot (white) on the left and the label in foreground-strong
- Below: 5 small HapticSwitch toggles for operational controls (BLE / AI PRESET / REPORT PRESET / VIBRATE / RESET), each with a tiny mono label

---

## Screen 9: DAILY REPORT (editorial data visualization)

- Tiny caption: "REPORT / 2026.06.08"
- Huge headline: **"TODAY."** (64pt, Open Sans 700)

**Three big numbers in a row (each in its own HapticAccordion item, no card body, just the number):**
- "86" / SCORE (**200pt, Bebas Neue 900, `#141414`**, brand-foreground-strong text in foreground)
- "5H 23M" / GOOD TIME (**80pt**, same style)
- "3" / ALERTS (**200pt, Bebas Neue 900, `#fb4b00`** — orange because it's the one being highlighted)

**Hourly heatmap:**
- 24 small HapticBadge variant=dot (8px) in a row (one per hour, 7am-11pm)
- Colored: green / yellow / red / grey (Haptic Chip colors)
- Wrap in a HapticAccordion item (no expanded body, just the dots in a flex row)
- Below: tiny uppercase legend: "GREEN=GOOD / YELLOW=ATTENTION / RED=ALERT / GREY=NO DATA"

**AI summary:** italic serif cat voice: "good day. one blip at 2pm — probably that meeting."

**7-day trend:** A HapticProgress with brand gradient + shine, varying width per day, in a horizontal flex row

---

## Screen 10: ALERT BOTTOM SHEET (overlays Home)

Slides up from above the bottom tab bar, ~45% screen height.

- Top: thin orange accent strip (4px, brand color) — orange, not red, to keep it friendly
- Tiny uppercase caption: "ALERT / TECH NECK"
- **HapticKnob** (variant=neon) on the left as a visual indicator (pulsing brand-soft glow)
- Headline: **"HEADS UP."** (48pt, Open Sans 700, ALL CAPS)
- Body: "TECH NECK FOR 5 MIN" (mono 13pt, uppercase, foreground)
- AI advice in a HapticAccordion item with Haptic blue tint: sparkle icon + text "try a chin tuck. push back. hold 5."
- Two buttons side by side:
  - "FIXED" (HapticButton primary, 60% width)
  - "LATER" (HapticButton standard, 40% width)
- Auto-dismiss countdown: a HapticProgress at top with brand gradient

---

## Animations (use Haptic motion tokens)

- **Score number change**: scale 1→1.15→1 with overshoot spring, 400ms
- **Spine dots**: pulse scale 1→1.15→1 (2s loop) + halo glow opacity 0.5→1→0.5
- **Cat**: subtle breathing (scale 1→1.005→1, 4s loop) + very slight tail sway
- **Plant**: gentle rotation ±3deg, 4s loop
- **HapticButton hover**: y: -0.5px translate, 150ms spring
- **HapticButton tap**: y: 0.5px + scale 0.99, 150ms spring
- **HapticSwitch toggle**: 200ms ease, thumb translates 1.25rem
- **HapticAccordion expand**: motion height animation, 250ms spring
- **HapticChip select**: tone transition from light to dark, 150ms
- **Card appear**: fade up (opacity 0→1, translateY 16px→0) + shadow expanding, 500ms ease-out, stagger 80ms per card
- **Number countdown** (calibration / exercise): big number scales 1→1.2→1 on each tick, like a heartbeat
- **Badge unlock**: scale pop 1→1.4→1 with overshoot, + tiny orange confetti particles
- **Alert sheet**: slide up 400ms spring (overshoot 6%)

---

## Overall feel

The Haptic system is the engine; the editorial typography is the paint. Every Haptic component you see should be a faithful copy of the project's existing component (Button, Switch, Chip, Knob, Progress, Accordion, etc.) — no new styles. But the layout around them is bold, asymmetric, and confident. The 3D black cat with the orange scarf sits at the emotional center of the home screen. Orange `#fb4b00` is rare and precious. Black ink is everywhere else. The Haptic noise texture gives every surface a subtle premium grain. The app should feel expensive, then warm, then quietly caring.

## Layout requirements:
- 390×844 frames (iPhone 14 Pro size)
- 24px outer padding on sides
- 12px gap between cards in lists
- Bottom HapticTabs floating 16px above bottom
- Status bar (9:41 / ████ 5G 89%) at top of every frame, 11px mono, #9B9590
- Apply Haptic noise texture to the page background and any large flat surface
- 4 separate language variants per screen: EN (default) / 中文 (toggle variant). Generate both for each of the 10 screens = 20 frames total.
```

---

## 关键设计决策记录

### v2 vs v3（结合 Haptic 实际设计系统）

| 维度 | v3 之前（"Editorial Avant-Garde" 通用拟物） | **v3 之后（基于项目 Haptic 实际 token）** |
|------|--------------------------------------------|------------------------------------------|
| 品牌色 | `#FF4500`（杜撰） | **`#fb4b00`**（来自 Haptic tokens.ts，**完全对齐**项目实际） |
| 字体 | Bebas Neue / Newsreader 等通用字体 | **Geist Variable + Open Sans**（项目实际）+ Bebas Neue 仅做 display 数字 |
| 组件 | "raised pill button" 等通用描述 | **17 个 Haptic 组件逐个描述**（HapticButton / HapticSwitch / HapticChip / HapticKnob / HapticProgress / HapticAccordion 等） |
| 阴影 | 单一柔和投影 | **5 套 Haptic shadow token**（soft / standard / primary / elevated / inset-subtle），每套给完整 rgba 值 |
| 圆角 | 24/28px 单一层级 | **4 级圆角层级**（shell 16 / frame 8 / surface 4 / pill 9999） |
| 渐变 | 无 | **3 套 Haptic gradient**（neutral / selected / indent）+ 1 套按钮 shine |
| 纹理 | 无 | **Haptic noise 纹理**（SVG turbulence，mix-blend-mode overlay，0.1 opacity）—— 这是 Haptic 系统的视觉签名 |
| 状态色 | 高饱和平面 | **Haptic Chip 调色板**（light + dark 两套，7 色） |
| 尺寸系统 | 无明确 | **smaller / default / bigger / huge**（4 档），与项目 API 一致 |
| 变体系统 | standard / primary | **standard / primary**（完全一致）+ **light / dark tone**（Haptic Chip 特有） |
| 动画 | 自定义 | **沿用 motion/react 的 springSoft**（与项目 motion.ts 一致） |

### 设计哲学：Haptic × Editorial 的融合张力

```
项目 Haptic 组件库（工业控件、精确 token）
        ＋
Editorial Avant-Garde 排版（巨型数字、不对称、cat 开口）
        ＋
3D matte 角色（cat / plant / sensor）
        ＋
Haptic noise 纹理（拟物签名）
        ↓
    「工业精度的时尚杂志」
    —— 每个按钮都是真正的 HapticButton，
       但它们的排版是 Vogue 编辑风格。
```

### 配套使用建议

1. **生成前**：把 `web/src/components/haptic/tokens.ts` 和 `web/src/styles/index.css` 截图，作为 reference image 一起喂给 Figma Make
2. **生成后**：手动核对 17 个 Haptic 组件的尺寸 / 阴影 / 圆角是否与代码一致
3. **多语言**：在 Figma Make 输出 20 frames 后，把 10 个 EN frame 的文本批量替换为中文，保留所有视觉 token 不变
4. **字体**：Open Sans 600/700 是项目已用字体，Bebas Neue 仅在 display 数字处用

### 必读文件（生成 Haptic UI 前）

- `web/src/components/haptic/tokens.ts` —— 完整设计 token
- `web/src/styles/index.css` Section 1（@theme inline）+ Section 7（@layer utilities）—— 阴影 + Haptic 组件 CSS
- `web/src/components/haptic/index.ts` —— 17 个组件导出列表
- `web/src/app/App.tsx` —— Status bar 实际样式（11px mono, #9B9590）

---

## 维护说明

- 改色板/字体/组件风格 → 同步更新本文档 + AGENTS.md 引用 + 实际 `tokens.ts`
- 新增页面 → 在「Screen 编号」章节追加完整描述，并指明使用了哪些 Haptic 组件
- 删减页面 → 同步删除对应章节
- 任何 Haptic token 变化（颜色 / 阴影 / 圆角）→ 优先改 `tokens.ts`，再 sync 到本文档
- 本文档由 Claude Code 在 Figma Make 提示词维护场景下使用
