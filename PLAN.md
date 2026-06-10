# Tech-Refresh Mobile — Plan

Goal: a React Native (Expo) version of the tech-refresh toolkit, sharing one Postgres database
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
tech-refresh/                  (git repo — init first, this isn't one yet!)
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

**Phase 0 — Foundations (1 evening)**
git init + first commit (protect everything before restructuring). pnpm + Corepack pinned.
Monorepo skeleton; move web app to `apps/web`; extract `packages/core` (prepData, techLinks,
scenarios, scoring). Verify web build is identical. *Exit: web runs from the monorepo.*

**Phase 1 — Single DB (1–2 evenings)**
Supabase project, schema migration, RLS, magic-link auth. Seed script imports the three JSON
files. Web app swaps the file-API for Supabase via TanStack Query (optimistic updates replace
the hand-rolled rollback). Retire the Vite middleware. *Exit: web reads/writes Supabase;
phone-readiness is now free.*

**Phase 2 — Expo app: Prep tab (2–3 evenings)**
Expo + expo-router tabs + TanStack Query + Supabase client. Prep tab: card grid, **Reanimated
3D flip** (rotateY worklet — the flip the web version lost), quiz flow, weakest-drill, XP bar.
Stats from `answer_events`. *Exit: full quiz loop on the phone over LAN.*

**Phase 3 — Stories + Contacts tabs (1–2 evenings)**
Standard RN forms/lists; prompt drill with Reanimated transitions; next-action due
highlighting and retro forms. *Exit: full CRUD parity on mobile.*

**Phase 4 — Arch Board with Skia (2–3 evenings, hardest)**
Skia `Canvas` for nodes + bezier edges + arrowheads; gesture-handler for drag (worklets —
JSI in practice); evaluation panel in RN views. Fallback if gestures fight the scroll view:
mobile v1 is evaluate/view-focused, web stays the primary editor. *Exit: at least one scenario
playable on the phone.*

**Phase 5 — Stretch (the delivery study topics)**
Offline-first: TanStack Query persist + expo-sqlite cache (SQLite card!). EAS build to the
physical device, then OTA updates (App Store / Play Store card). Accuracy-over-time chart
from `answer_events` drawn in Skia.

## Study-case map (what each piece rehearses)

- **pnpm workspaces / Corepack** → monorepo card
- **TanStack Query** → server-state, optimistic updates, invalidation
- **Supabase/Postgres** → RLS, schema design, migrations; PostgREST ≈ REST card
- **Auth** → magic link, JWT validation, RLS authorization
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

## Risks

1. **Metro + monorepo** needs `watchFolders`/resolver config — known territory, Expo documents it.
2. **Skia/Reanimated in Expo Go**: both currently ship in Expo Go; if a version mismatch bites,
   the answer is a dev build (expo-dev-client) — itself worth learning.
3. **Arch Board gestures** are the real complexity spike — phased last on purpose, with a
   scoped fallback defined.
4. **Scope creep**: each phase has an exit criterion; stop at any phase and the project is
   still coherent and useful.
