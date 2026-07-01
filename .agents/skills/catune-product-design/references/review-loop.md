# Review Loop

Use this when turning real product/design feedback into agent guidance, lint,
examples, or coverage gaps.

## Principle

Automation may collect and group candidates, but it does not create standards by
itself. A human accepts, rejects, or scopes every new rule.

## Inputs

- User feedback from this repo's chat history.
- PR review comments.
- Screenshots or preview observations from `npm run preview`.
- Repeated fixes in `src/design`.
- Failing or noisy guardrail output.

## Triage

For each candidate, choose exactly one destination:

- `agent guidance`: judgment-heavy, needs product context.
- `lint rule`: mechanically detectable with low false positives.
- `example`: useful as a good/bad exemplar but too contextual for lint.
- `eval/test`: behavior should remain stable over time.
- `coverage gap`: important, but no accepted standard yet.
- `no change`: one-off preference, obsolete context, or insufficient evidence.

## Review Packet

Before changing standards, write a short packet with:

- Source: link, file, screenshot, or transcript reference.
- Candidate rule: one sentence.
- Scope: files/surfaces affected.
- Evidence: why this repeated or mattered.
- Proposed destination: guidance, lint, exemplar, eval, coverage gap, or no change.
- Risk: likely false positives or overreach.
- Human decision: accepted, rejected, or needs follow-up.

## Promotion Rules

- If code can identify the issue and the fix is concrete, prefer lint.
- If the rule needs product intent, locale, user consequence, or visual judgment,
  prefer guidance or exemplar.
- If a rule needs many exceptions, move it back to guidance.
- If a question matters but lacks evidence, record it in `coverage-gaps.md`.

## Maintenance

- Accepted guidance goes into the smallest relevant file under `references/`.
- Mechanical accepted rules go into `scripts/check-product-design.mjs`.
- Good and bad examples go into `exemplars/`.
- Open standards go into `coverage-gaps.md`.
- Update `AGENTS.md` only when the workflow itself changes.
