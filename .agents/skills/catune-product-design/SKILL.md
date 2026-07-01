---
name: catune-product-design
description: >-
  Single entry point for Catune UI/UX, product flow, copy, visible state,
  accessibility, responsive behavior, and design-system work. Use whenever a
  change affects what a user sees, understands, chooses, or does in src/design.
  Not for backend-only, native-only, firmware-only, training-only, or test-only
  work with no shipped UI impact.
---

# Catune Product Design

Make the interface correct for the user, the App, and the design system. Working code is not enough: choose the right interaction, make state and consequence clear, cover reachable states, and verify the rendered surface.

## Operating Contract

- Start with the job, not the pixels: identify the user, task, product object, and system change.
- Define outcome before output: current problem, desired behavior, success signal, and non-goals.
- Use evidence, not taste: prefer existing `src/design` patterns, theme tokens, i18n keys, and verified rendered behavior.
- Treat shipped code as evidence, not automatic precedent.
- Choose the smallest coherent intervention before adding new screens, settings, or abstractions.
- Decide interaction and state behavior before decoration.
- Design every reachable state that the product can actually enter.
- Verify the real surface with `npm run dev` for visual/interaction changes.

## Request Modes

Resolve the mode before acting:

| Mode | Use when | Behavior |
| --- | --- | --- |
| Shape | The flow or behavior is not settled | Frame alternatives, states, acceptance criteria, risks, and open decisions. Do not edit unless asked. |
| Implement | Build, fix, improve, simplify, or make production-ready | Make the smallest coherent end-to-end change inside scope. |
| Review | Audit, critique, or inspect a screenshot/diff/route | Findings first, ordered by user impact. Do not edit unless asked. |
| Copy | Rewrite labels, errors, onboarding, or accessible names | Change language and directly required JSX only. Do not silently redesign. |
| Harden | Polish an already-settled direction | Fix states, resilience, accessibility, responsive behavior, and finish defects. |

If ambiguous, use the narrowest mode supported by the user's verb.

## Routing

Load only the references needed for the task:

| Need | Read |
| --- | --- |
| Product/flow/component decision | `references/product-judgment.md` |
| Visual hierarchy, component quality, layout | `references/interface-quality.md` |
| Copy, labels, empty/error text, accessible names | `references/copy.md` |
| Screen-specific entry points and state ownership | `references/surfaces.md` |
| Unknown or missing standard | `references/coverage-gaps.md` |
| Turning feedback into standards | `references/review-loop.md` and `references/decision-template.md` |

## Workflow

1. Name the target surface and mode.
2. Read `AGENTS.md`, then this skill, then routed references.
3. Map the reachable states: loading, empty, populated, error, disabled, permission, offline, long content, compact width.
4. Decide before styling: object, action, consequence, state, and component choice.
5. Implement in `src/design` unless the routed decision requires a boundary change.
6. Verify:
   - `npm run tsc:rn`
   - `npm test -- --runInBand`
   - `npm run lint`
   - For material UI changes, inspect via `npm run dev`.

## Standards

- Make the primary task and primary action unmistakable.
- Preserve user context unless changing it solves a verified problem.
- Use navigation components for navigation and action components for actions.
- Prefer inline disclosure before adding modal-like surfaces.
- Prefer strong defaults over adding configuration users must understand.
- Use `src/design/theme` tokens before new hardcoded visual values.
- Keep touch targets stable and text within bounds on compact screens.
- Preserve input through validation and recoverable errors.
- Make destructive actions explicit about object, scope, and consequence.
- Do not add decorative novelty, motion, or copy unless it clarifies structure, state, or brand intent.
- Do not promote one-off taste into a standard. Use the review loop before adding rules.

## Review Output

Lead with findings:

- P0: blocks the primary task or can cause severe user harm.
- P1: likely task failure, misleading consequence, missing critical state, or major responsive/accessibility defect.
- P2: meaningful friction, inconsistency, weak hierarchy, or recoverability issue.
- P3: minor craft or consistency improvement.

Each finding should include location, user consequence, and smallest concrete fix.
