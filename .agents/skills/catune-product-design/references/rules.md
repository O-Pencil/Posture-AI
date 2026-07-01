# Mechanical Rules

These rules should stay enforceable by script where possible.

## rule/no-legacy-surfaces

Source: root project cleanup.

Rule: Do not recreate `docs/`, `PRD/`, `prototype/`, `web/`, or `src/ui/`.

Reason: Catune now has one formal product surface: Expo RN/RNW App in `src/design/`.

Check: `npm run design:check`.

## rule/design-home

Source: root `AGENTS.md`.

Rule: User-visible UI must live under `src/design/`.

Reason: Keeps vibe coding and Agent navigation simple.

Check: `npm run design:check` validates the directory and skill references.

## rule/i18n-pairing

Source: `src/design/i18n`.

Rule: New user-facing copy must keep `en.ts` and `zh.ts` keys aligned.

Reason: Locale switching is part of the App shell.

Check: `npm test -- --runInBand` includes i18n coverage tests.

## rule/no-native-in-ui

Source: architecture boundary.

Rule: Do not import DeviceMotion, BLE libraries, Vibration, FileSystem, or NativeModules directly in screen/component files.

Reason: UI remains easy to vibe and platform behavior stays in `src/platform/` or `src/mnn/`.

Check: `npm run design:check`.

## rule/no-classname-in-design

Source: React Native/RNW design-system boundary.

Rule: Do not use `className` in `src/design`.

Reason: Catune's UI contract is RN primitives plus `src/design/theme`; `className`
would bypass token and primitive guardrails.

Check: `npm run design:check`.

## rule/no-modal-without-decision

Source: overlay/focus risk.

Rule: Do not introduce React Native `Modal` directly in `src/design` without an
accepted decision record. Prefer the existing screen overlay pattern used by
Training and Assess.

Reason: Modal-like surfaces affect focus, layering, back behavior, and compact
screens; they need explicit product intent.

Check: `npm run design:check`.

## rule/small-options-visible

Source: Catune settings and mock-state controls.

Rule: Do not introduce picker/select controls for small static option sets.
Use `SegmentedControl`, `Chip`, or another visible option pattern.

Reason: This app is tuned for fast scanning and demo-state switching; hidden
small option sets slow down UI iteration and user understanding.

Check: `npm run design:check`.

## rule/pressable-accessibility

Source: mobile accessibility baseline.

Rule: Interactive `Pressable` surfaces should expose an accessible role or name
unless they are a transparent hit target over already labeled content.

Reason: Icon-only and custom touch surfaces otherwise become ambiguous to assistive
technology and to agents reviewing interaction intent.

Check: `npm run design:check` can emit warnings with
`CATUNE_SHOW_DESIGN_WARNINGS=1 npm run design:check`. Promote to failure after
current legacy custom `Pressable` sites are cleaned up.
