# Grip Mobile - Plan

Goal: a React Native (Expo) version of the Grip toolkit, sharing one Postgres database
with the existing web app, built deliberately as a **study case** — every layer maps to an
interview-prep topic, and the project itself becomes a STAR story.

## Decisions (with reasoning)

| Decision | Choice | Why / tradeoff |
| --- | --- | --- |
| Backend | **Supabase** (not Neon) | Neon is raw Postgres — would force building/hosting an API layer first. Supabase = Postgres + auto REST (PostgREST) + auth + RLS; same JS client on web and RN. Tradeoff: more vendor surface, fine for a personal tool. |
| Repo shape | **pnpm workspaces monorepo** | Web + mobile share quiz content, scenarios, scoring logic via a `core` package. pnpm/Corepack is itself on the study list. |
| Server state | **TanStack Query** in both apps | Caching, optimistic updates, retry — replaces the hand-rolled fetch/rollback code. Also on the study list. |
| Quiz content | **Stays in code** (`packages/core`) | Static, version-controlled content doesn't belong in a DB. Only user-generated data (contacts, stories, answers) moves to Postgres. |
| Scores model | **Normalized `answer_events` table** | Instead of one JSON blob: one row per answer (tech, correct, source, timestamp). Enables accuracy-over-time analytics; XP becomes derivable. Better SQL study case. |
| Auth | **Supabase magic-link, from day one** | The anon key ships in the client; without RLS + auth, anyone could read your hiring pipeline. RLS policies (`user_id = auth.uid()`) are literally a card in the Prep tab. |
| Phone connection | **Expo Go over LAN first** | Metro dev server on the Mac, phone on same Wi-Fi. Supabase is cloud, so no tunneling needed for data. Dev build (expo-dev-client) only if a native module demands it. |

## Target layout

```text
grip/                          (git repo - init first, this isn't one yet!)
  pnpm-workspace.yaml
  packages/
    core/                      prepData, techLinks, arch scenarios, scoring/rank logic, shared types
  apps/
    web/                       existing Vite app, moved
    mobile/                    Expo app (expo-router)
  supabase/
    migrations/                SQL schema + RLS policies
    seed.mjs                   imports current contacts.json / stories.json / scores.json
  PLAN.md
```

## Database schema (v1)

```sql
contacts(id uuid pk, user_id uuid, name text, status text, role text, link text,
         note text, date date, next_action text, next_action_date date, created_at)
retros(id uuid pk, contact_id uuid fk, round text, questions text,
       went_well text, to_improve text, created_at)
stories(id uuid pk, user_id uuid, title text, competency text,
        situation text, task text, action text, result text, created_at)
answer_events(id uuid pk, user_id uuid, tech text, correct bool,
              source text check (source in ('card','drill')), created_at)
```

RLS on every table: `user_id = auth.uid()`. Retros become a proper 1:N table
(currently nested JSON). Dates become real `date` columns — display stays DD-MM-YYYY at the UI edge.

## Phases

Status: **phases 0-4 shipped** (11-06-2026). Phase 5 in progress — NativeTabs,
offline reads, the modern-features audit, simulator dev-client setup, the job-hunt
funnel dashboard, saved boards, baseline CI, celebrations, the accuracy chart, the
second Maestro flow, and RNTL screen tests are done; EAS/OTA remains deliberately parked.

**Phase 0 — Foundations (1 evening)** ✅
git init + first commit (protect everything before restructuring). pnpm + Corepack pinned.
Monorepo skeleton; move web app to `apps/web`; extract `packages/core` (prepData, techLinks,
scenarios, scoring). Verify web build is identical. *Exit: web runs from the monorepo.*

**Phase 1 — Single DB (1–2 evenings)** ✅
Supabase project, schema migration, RLS, magic-link auth. Seed script imports the three JSON
files. Web app swaps the file-API for Supabase via TanStack Query (optimistic updates replace
the hand-rolled rollback). Retire the Vite middleware. *Exit: web reads/writes Supabase;
phone-readiness is now free.*

**Phase 2 — Expo app: Prep tab (2–3 evenings)** ✅
Expo + expo-router tabs + TanStack Query + Supabase client. Prep tab: card grid, **Reanimated
3D flip** (rotateY worklet — the flip the web version lost), quiz flow, weakest-drill, XP bar.
Stats from `answer_events`. *Exit: full quiz loop on the phone over LAN.*

**Phase 3 — Stories + Contacts tabs (1–2 evenings)** ✅
Standard RN forms/lists; prompt drill with Reanimated transitions; next-action due
highlighting and retro forms. *Exit: full CRUD parity on mobile.*

**Phase 4 — Arch Board with Skia (2–3 evenings, hardest)** ✅
Skia `Canvas` for nodes + bezier edges + arrowheads; gesture-handler for drag (worklets —
JSI in practice); evaluation panel in RN views. Fallback if gestures fight the scroll view:
mobile v1 is evaluate/view-focused, web stays the primary editor. *Exit: at least one scenario
playable on the phone.*

**Phase 5 — Platform polish & delivery (in progress)**

- ✅ **NativeTabs** — true `UITabBarController` (Liquid Glass on current iOS) via
  `expo-router/unstable-native-tabs`, SF Symbol icons; screens own their safe-area insets.
- ✅ **Offline reads** — TanStack Query cache persisted to AsyncStorage
  (`PersistQueryClientProvider`, 24h TTL): instant cold-start render, data visible offline.
- ✅ **Modern-Expo audit** — New Architecture (only option in SDK 56), Hermes,
  **React Compiler** (`experiments.reactCompiler` + babel-plugin-react-compiler 1.0 —
  auto-memoization, so no hand-written React.memo/useMemo policing), typed routes,
  precompiled RN for iOS, Android edge-to-edge. All verified active.
- ✅ **Testing layer** — Jest on `packages/core` (37 tests: quiz mechanics, arch
  evaluator, due-date rules, funnel/accuracy analytics, saved-board data, data layer against a fake Supabase client — caught a real
  `dateToDb` validation bug on day one) plus `jest-expo` + RNTL on mobile
  (7 screen/component tests covering Prep, StatsBar, DrillSession, and the Skia
  accuracy chart). Maestro E2E smoke coverage includes sign-in and all four tabs.
  Gates: `pnpm test` + `pnpm typecheck` + web build.
- ✅ **Simulator dev-client path** — `expo-dev-client` is installed for Skia/native-module
  development, with explicit simulator scripts (`pnpm ios:sim`, `pnpm dev-client`) so the
  day-to-day loop avoids physical-device signing, provisioning, Developer Mode, and iPhone
  platform-support issues.
- ✅ **Job-hunt funnel dashboard** — Contacts now surfaces active pipeline counts,
  Contacted -> Applied -> Interviewing -> Offer conversion, applications/week, due
  follow-ups, and bottleneck signals. Current limitation: the contacts table stores the
  current stage date, not historical transition dates, so the dashboard is a pragmatic
  current-pipeline read rather than a complete event-sourced funnel.
- ✅ **Baseline CI** — GitHub Actions runs `pnpm test`, `pnpm typecheck`, and `pnpm build`
  on pushes/PRs. This intentionally avoids native mobile builds for now; simulator/EAS
  builds stay manual until delivery stabilizes.
- ✅ **Saved Arch Boards** — `arch_boards` persists scenario id plus node/edge JSONB
  snapshots with RLS; the mobile board can save, load, update, and delete drafts.
- ⬜ **EAS build + OTA updates** — optional cloud delivery path, then expo-updates for OTA
  (App Store / Play Store study card). Needs an Expo account login and a deliberate
  decision to re-enter device/cloud build work.
- ✅ **Rank-up + perfect-drill celebration** — Prep now has a reusable celebration overlay
  with Skia-drawn confetti particles for perfect drills and rank unlocks.
- ✅ **Accuracy-over-time chart** — Prep renders a Skia line chart from cumulative
  `answer_events.created_at` accuracy, with the data transformation covered in core tests.
- ✅ **Second Maestro flow** — `board-zen-evaluate.yaml` covers Arch Board zen mode,
  node creation, tap-to-wire, and evaluate.
- ✅ **jest-expo + RNTL component tests** — screen-level coverage is wired into
  CI for Prep plus stable drill/chart/stat components.

## Product seed — Arch Board

Market note (11-06-2026): the Arch Board (scenario-driven system-design practice with
cost/maintainability scoring) may have legs as a standalone product — system design is a
top-tier hiring skill and the practice-tool space is thin (ByteByteGo teaches, excalidraw
draws, nothing *scores decisions*). Engineering bar is therefore product-grade, not
demo-grade: the viewport (focal-point zoom/pan, fit-to-content) is built on a virtual
canvas for that reason. Obvious next steps if pursued: more scenarios, shareable evaluations, scenario authoring. Saved boards now persist node/edge snapshots to Supabase and are the base for later sharing.

## Study-case map (what each piece rehearses)

- **pnpm workspaces / Corepack** → monorepo card
- **TanStack Query** → server-state, optimistic updates, invalidation
- **Supabase/Postgres** → RLS, schema design, migrations; PostgREST ≈ REST card
- **Auth** → JWT validation, RLS authorization
- **Reanimated worklets** → JSI vs bridge story, told from experience
- **Skia canvas** → rendering performance, gesture systems
- **EAS/OTA (stretch)** → mobile delivery pipeline card

## Animation showcase (presentable demos)

Animations are a first-class goal — each one is built to be shown in an interview, labeled by the API it demonstrates:

| Moment | Animation | Demonstrates |
| --- | --- | --- |
| Card flip | 3D rotateY with spring physics + backface visibility | Reanimated shared values, interpolate, worklets |
| Card grid load | Staggered entrance (FadeInDown with per-index delay) | Layout/entering animations |
| Perfect drill | Skia confetti particle burst over the score | Skia canvas, per-frame animation off the JS thread |
| Rank-up | Celebratory overlay: scale + glow on the new rank | Sequenced animations, withSpring/withSequence |
| Drill questions | Swipe-away transition between questions with momentum | Gesture-handler + worklet-driven gestures (the JSI story) |
| XP bar | Springy fill + count-up number | Animating derived values |
| Arch Board wiring | Animated dashed "pending" connector; arrowhead draws on when linked | Skia path interpolation |
| Arch Board nodes | Drag with subtle scale-up + shadow lift, magnetic snap on release | Gesture + Skia integration |

Stretch: a hidden **Showcase screen** that replays each demo in sequence — a self-running portfolio piece for interviews.

## Current priority read (11-06-2026)

1. ✅ **Funnel dashboard** — shipped first because it serves the job hunt directly: volume,
   conversion, and follow-up discipline are now visible from existing contact data.
2. ✅ **CI** — shipped next because it is cheap, resume-coherent, and protects the repo while
   the mobile/product surface keeps changing.
3. ✅ **Saved boards** — Arch Board node/edge snapshots now persist to Supabase, so the
   board graduates from single-session toy to reusable tool.
4. ✅ **Rank-up + perfect-drill confetti** — Prep now shows a Skia confetti burst for
   perfect drills and a celebration overlay when XP crosses a rank threshold.
5. ✅ **Accuracy-over-time Skia chart** — Prep now makes `answer_events` analytically
   visible with a compact Skia trend line.
6. ✅ **Second Maestro flow** — Arch Board zen/wiring/evaluate is covered.
7. ✅ **RNTL screen tests** — mobile Jest now covers Prep plus stable drill/chart/stat components; EAS/OTA stays parked by choice.

## Risks

1. **Metro + monorepo** needs `watchFolders`/resolver config — known territory, Expo documents it.
2. **Skia/Reanimated in Expo Go**: both currently ship in Expo Go; if a version mismatch bites,
   the answer is a dev build (expo-dev-client) — itself worth learning.
3. **Arch Board gestures** are the real complexity spike — phased last on purpose, with a
   scoped fallback defined.
4. **Scope creep**: each phase has an exit criterion; stop at any phase and the project is
   still coherent and useful.
