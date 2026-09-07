# Grip Evaluation Findings Design

## Goal

Close the six correctness and privacy findings from the repository evaluation,
restore the mobile test runner, and keep the existing web, mobile, Supabase, and
AI boundaries small.

## Scope

This work covers account-scoped query caches, grounded AI evidence, complete
answer-history reads, atomic score writes, honest talk-track scoring, migration
ordering, setup documentation, and the missing mobile test dependency. It does
not deploy migrations, write to a live Supabase project, or add a hosted AI
provider.

## Account-scoped caches

Private query results must be removed before a different authenticated subject
can render. A small shared helper will compare the previous and next user IDs.
Once an identity has been established, sign-out or a change to another user will
clear the in-memory QueryClient. The web app will call it from its auth-state
handler and immediately during explicit sign-out.

Mobile will apply the same in-memory rule and use the authenticated user ID as
the persisted-query buster. A cache written by one user therefore cannot hydrate
for another user. On an identity transition, the previous persisted client will
also be removed. The initial session lookup will complete before mounting the
private persisted-query provider, preserving offline restoration for the same
user without briefly hydrating an unknown user's cache.

Tests will reproduce an A-to-B transition and assert that cached A data is gone
before B reads. They will also cover sign-out and the same-user token refresh,
which must not discard valid cached data.

## Grounded AI evidence

The AI schema will continue rejecting empty evidence for `thin` and `covered`
verdicts. After provider validation and before score calculation, the service
will additionally compare each trimmed evidence value with the corresponding
candidate section using an exact, case-sensitive substring check. A mismatch
will return `invalid_model_response`; no score will escape.

This check belongs in orchestration because the response schema does not have
access to the request. Offline service tests will prove that fabricated evidence
is rejected and exact evidence is accepted. The existing live Qwen calibration
remains the model-quality gate.

## Complete answer history

The shared Supabase API will fetch `answer_events` in pages of 1,000 rows until a
short page is returned. Pages will use stable ascending order by `created_at`
and `id`, with inclusive `.range(start, end)` bounds. Scores, the accuracy
timeline, and the review queue will all use this helper. Existing return shapes
and UI query keys remain unchanged.

Tests will provide more than one page and assert that newer rows contribute to
all three calculations. A repeated boundary timestamp will verify the secondary
ID ordering is requested.

## Atomic and retry-safe score writes

A new migration will add a unique `request_id` UUID to `answer_events` and two
security-invoker functions:

- `record_answer(request_id, tech, correct, source, difficulty)` inserts one
  answer and, when correct, updates XP in the same transaction. A duplicate
  request ID performs no second insert or XP increment.
- `reset_scores()` deletes the caller's answers and resets the caller's XP in one
  transaction.

Both functions derive the user from `auth.uid()` and accept no user ID. The
client will replace its separate insert/update calls with these RPCs. An answer
attempt receives its request ID before mutation execution so retries reuse the
same ID. Tests will assert one RPC per operation, stable request IDs across a
retry, and removal of the old partial-write sequences.

## Honest reasoning and readiness metrics

`scoreTalkTrack` will report structural `completion` and the candidate's
`rating`; it will stop combining them into an assessed quality score. Character
count remains useful only for determining whether a section is present.

Board scoring will accept an optional persisted AI grade. With a grade, overall
board quality is the average of topology and the AI grade. Without a grade,
overall quality and the readiness `arch` component are `null`; topology and
completion remain visible as separate practice signals. This prevents arbitrary
text or self-confidence from raising readiness while retaining useful progress
feedback.

The board data shape will allow a nullable talk grade without requiring the UI
to call the local AI service in this change. Existing boards normalize to no
grade. Copy in English, Portuguese, and Swedish will describe diagram score,
reasoning completion, and ungraded reasoning accurately.

Tests will cover empty, partial, self-rated, ungraded-complete, and AI-graded
talk tracks, plus readiness aggregation with mixed graded and ungraded boards.

## Migration and setup reconciliation

The duplicate `0005` migration will be resolved by assigning unique sequential
versions to the questions migration and every later migration. The transactional
score migration and nullable talk-grade column will follow the renumbered chain.
This repository has no automated production migration step; the README will warn
that an already-linked Supabase project must reconcile its migration history
before applying the renamed files.

Setup documentation will show separate environment files:

- `apps/web/.env`: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `apps/mobile/.env`: `EXPO_PUBLIC_SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

No secrets or real project identifiers will be added.

## Mobile tests

`@babel/runtime` will be declared directly where Jest requires it instead of
depending on a transitive installation. The four existing mobile suites must
execute and pass. No Jest configuration expansion is planned unless that direct
dependency exposes a separate failure.

## Delivery and verification

Each boundary will be implemented test-first and committed separately. The final
verification is:

- shared-core tests, including pagination, RPC, scoring, and cache transitions;
- all mobile Jest suites;
- web and mobile TypeScript checks;
- web production build;
- AI offline tests and Ruff checks;
- AI live Qwen calibration only if AI grading code changes invalidate the prior
  live result;
- SQL inspection and a fresh local Supabase migration run when the local CLI and
  Docker environment are available.

Any unavailable database or native runtime check will be reported separately
from product failures.
