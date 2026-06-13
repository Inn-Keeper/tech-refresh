# Question bank

Source of truth for the tiered quiz `questions` table. One JSON file per
category; each entry is one question:

```json
{
  "tech": "TypeScript",
  "category": "Languages",
  "difficulty": "easy",
  "prompt": "…",
  "options": ["correct answer", "distractor", "distractor", "distractor"],
  "correct": 0,
  "explanation": "Why the right answer is right."
}
```

## Conventions

- **`correct` is the index into `options`.** By convention the right answer is
  authored at index `0`; options are shuffled at runtime by `shuffleOptions()`
  in `packages/core/src/quiz.js`, so order on screen is randomized.
- **Exactly 4 options**, all non-empty.
- **`difficulty`** ∈ `easy` (🐣 Newbie) · `mid` (😎 Can-Do) · `high` (🔥 Full
  Speed) · `ultra` (💀 Overlord). See `packages/core/src/difficulty.js`.
- **No duplicate prompt** within the same `(tech, difficulty)` bucket.

Everything above is enforced by `validateQuestionSet()`
(`packages/core/src/questions.js`), which runs in both the content test
(`__tests__/questions-data.test.js`) and the seed script.

## Adding / growing a batch

Target ~20 per level per tech, authored in reviewable per-tech batches. Add
entries to the matching category file, then:

```bash
pnpm --filter @tech-refresh/core test   # validates structure + no duplicates
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed-questions.mjs
```

The seed script replaces each `(tech, difficulty)` bucket it finds, so
re-running after edits is safe and idempotent.

## Coverage status

| Category   | File                  | Techs seeded            |
| ---------- | --------------------- | ----------------------- |
| Languages  | `languages.json`      | TypeScript, JavaScript  |

Remaining techs (50 total across 9 categories, see
`packages/core/src/prepData.js`) are pending in later batches.
