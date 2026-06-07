# Product

## Register

product

## Users

Office workers and remote knowledge workers aged 22–45 who sit at a desk 6–10 hours per day. They already know "sitting is bad" but lack continuous, real-time feedback. They use a single phone, glance at it periodically, and want gentle nudges rather than alarms. The interface is read in 1–3 second glances between tasks.

## Product Purpose

Catune is a real-time posture coach that pairs a phone-mounted IMU/AI perception system with a calm, glanceable app. The app surface shows three things: live posture state, a gentle habit-reward (the plant), and device/config control. Success means: the user opens the app, gets a one-glance read on whether they are sitting well, and returns to work. The app itself should never be a place to dwell.

## Brand Personality

Cautious, warm, quietly confident.
Three words: gentle, tactile, precise.

The interface should feel like a well-made ceramic mug: rounded, warm to the eye, a little weight in the hand. Skeuomorphic depth is part of the brand; flat or glassy design is the wrong register. It is not "playful" in a noisy way (no confetti, no loud gamification fanfare) — it is playful in a tabletop-museum way.

## Anti-references

- Duolingo: not loud, not the "ding! streak broken" voice. The plant rewards quiet growth, not streaks with confetti.
- Notion: not the flat, paper-white, all-gray-text register. The Haptic skeuomorphic shell is the brand.
- Apple Health: not the medical-clinical white-and-blue. We use warm neutrals with orange.
- Generic SaaS dashboards: no "01 / 02 / 03" eyebrows, no gradient text, no identical card grids.

## Design Principles

1. Glanceable first. Every screen must communicate its primary signal in under 1.5 seconds.
2. Skeuomorphism as identity, not decoration. Depth (raised, pressed, inset) carries meaning; shadow is a state.
3. Quiet orange. Orange is the brand color (≈ #fb4b00) but used at low surface area — never as a background flood, only on the focal point and the title.
4. Cute title, serious body. Rounded display face for the wordmark and section heads; clean sans for body and data.
5. Live data, not live UI. Animations on data changes (node pulse, status pill) are welcome; page-level reveal animations are not the way the product speaks.

## Accessibility & Inclusion

- WCAG AA contrast minimum on all body and data text.
- Respect `prefers-reduced-motion` for the pulsing node indicators.
- Color is never the only state signal: each status pill pairs color with a small icon/dot and a word.
- Body font size floor of 14px for any user-facing data label.
- Future i18n: copy in natural English sentences, no idioms that don't translate.
