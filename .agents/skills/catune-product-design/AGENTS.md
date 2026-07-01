# catune-product-design · Skill Governance

## Load Order

1. Root `AGENTS.md`
2. `.agents/skills/catune-product-design/SKILL.md`
3. Only the routed files in `references/`
4. Relevant source files in `src/design/`

Do not load every reference by default. Route narrowly.

## Validation

After a user-visible change, run:

```bash
npm run design:check
npm run tsc:rn
npm test -- --runInBand
npm run lint
```

For material visual changes, also inspect the rendered App via:

```bash
npm run dev
```

## Governance

- New design rules must be narrow, evidenced, and placed in the smallest relevant reference.
- Mechanical rules belong in `scripts/check-product-design.mjs`.
- Judgment rules belong in `references/`.
- Candidate rules from feedback must go through `references/review-loop.md`.
- Use `references/decision-template.md` when accepting or rejecting a durable rule.
- Accepted examples belong in `exemplars/`.
- Missing standards belong in `references/coverage-gaps.md`.
- Do not turn one screenshot, one old file, or one reviewer preference into a universal rule.
