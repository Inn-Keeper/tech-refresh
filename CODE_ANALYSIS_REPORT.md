# Tech-Refresh Codebase Analysis Report

**Date:** 2026-06-12  
**Scope:** Full stack analysis (packages/core, apps/web, apps/mobile)  

---

## Executive Summary

The codebase has **solid architectural patterns** (monorepo, clean separation of concerns) but exhibits **moderate complexity issues** and **inconsistent type safety**. Key concerns:
- Web components mix JSX with inline styles, increasing complexity
- Missing TypeScript for JavaScript layers
- Several async operations lack error handling
- Untyped parameters in critical functions

---

## 1. COMPLEXITY ISSUES

### HIGH SEVERITY

#### [ArchBoard.jsx](apps/web/src/ArchBoard.jsx#L1-L500) — Excessive state management
**Lines:** 1–500 (full component)  
**Issue:** 8 independent state variables + complex ref-based drag handling + mutation management creates a component with **CC ≈ 18**
```javascript
const [scenarioIdx, setScenarioIdx] = useState(0);
const [nodes, setNodes] = useState([]);
const [edges, setEdges] = useState([]);
const [connectFrom, setConnectFrom] = useState(null);
const [result, setResult] = useState(null);
const [savedOpen, setSavedOpen] = useState(false);
const [activeBoardId, setActiveBoardId] = useState(null);
const [activeBoardTitle, setActiveBoardTitle] = useState(null);
const dragRef = useRef(null);
const suppressClickRef = useRef(false);
```
**Impact:** Hard to test, refactor, or reason about state mutations  
**Fix:** Extract into reducer (`useReducer`) or state management library; separate concerns (canvas logic, board state, UI state)

---

#### [InterviewPrep.jsx](apps/web/src/InterviewPrep.jsx#L1-L350) — Complex card lifecycle + drill state
**Lines:** 1–350  
**Issue:** Nested state objects for card phases, quiz indices, and drill tracking; **CC ≈ 15**
```javascript
const getState = (key) =>
  cardState[key] || { phase: "front", quizIndex: 0, answered: null, runCorrect: 0, shuffled: null };
// ... 50+ lines of conditional setState logic
```
**Impact:** Card state transitions are fragile; adding new phases requires multiple code changes  
**Fix:** Extract card state machine to custom hook (`useCardState`) with explicit transitions

---

#### [Contacts.jsx](apps/web/src/Contacts.jsx#L1-L400) — Multiple mutations + form handling
**Lines:** 1–400  
**Issue:** 4 mutations (save, delete, retro add/delete) with manual error aggregation; complex render conditionals based on `editingId` + `retroFor`  
**Impact:** Hard to add validation or new mutation types  
**Fix:** Custom hook for form state; simplify error handling

---

### MEDIUM SEVERITY

#### [buildFunnelSummary()](packages/core/src/funnel.js#L78-L107) — Multiple signals + calculations
**Lines:** 78–107  
**Issue:** 5 nested signal conditions; missing early returns  
```javascript
if (active.length < 8) signals.push("Top of funnel...");
if (applicationsPerWeek < 3) signals.push("Application pace...");
if (reached.Applied >= 5 && rates.appliedToInterviewing < 0.25) signals.push("...");
// etc.
```
**CC ≈ 12**  
**Impact:** Adding/removing signals requires hunting multiple locations  
**Fix:** Extract signals to a data-driven array of rules

---

#### [api.js createApi()](packages/core/src/api.js#L78-L300) — Deeply nested transformation functions
**Lines:** 78–300  
**Issue:** 6 nested transformer functions + repetitive CRUD patterns; **CC ≈ 14**  
**Impact:** Hard to add new resources or modify schema mappings  
**Fix:** Generalize transformer pattern; use factory function

---

#### [QuizView (mobile)](apps/mobile/src/components/QuizView.tsx#L40-L65) — Complex answer state rendering
**Lines:** 40–65  
**Issue:** Ternary nesting for color/state logic
```typescript
let bg = colors.surfaceHi;
let border = colors.border;
let textColor = colors.textDim;
if (answered !== null) {
  if (isThisCorrect) {
    bg = tints.successSoft;
    border = `${colors.success}80`;
    textColor = colors.successBright;
  } else if (isThisChosen) {
    bg = tints.dangerSoft;
    border = `${colors.danger}80`;
    textColor = colors.dangerBright;
  }
}
```
**CC ≈ 8**  
**Fix:** Extract to `getAnswerStyle()` function

---

### LOW SEVERITY

#### [ArchBoard.jsx](apps/web/src/ArchBoard.jsx#L212) — Inline multi-statement callback
**Line:** 212
```javascript
onClick={() => { setNodes([]); setEdges([]); setConnectFrom(null); setResult(null); setActiveBoardId(null); setActiveBoardTitle(null); }}
```
**Fix:** Extract to `const resetBoard = () => { ... }`

---

## 2. TYPE COVERAGE ISSUES

### HIGH SEVERITY

#### [api.js — Untyped supabase parameter](packages/core/src/api.js#L77-L78)
**Lines:** 77–78
```javascript
export function createApi(supabase) {
  // @param {any} supabase  ← implicit 'any'
```
**Issue:** The critical `supabase` client is typed as `any`, losing IDE support and type safety for all downstream queries  
**Fix:** Define `Supabase` client type:
```typescript
/** @typedef {import('@supabase/supabase-js').SupabaseClient} SupabaseClient */
export function createApi(/** @type {SupabaseClient} */ supabase) { ... }
```

---

#### [useScores.js — Untyped mutation callbacks](apps/web/src/useScores.js#L12-L28)
**Lines:** 12–28
```javascript
const recordMutation = useMutation({
  mutationFn: ({ tech, isCorrect, source }) => recordAnswer(tech, isCorrect, source),  // ← no param types
  onMutate: ({ tech, isCorrect }) =>  // ← no param types
  // ...
});
```
**Issue:** Mutation payloads lack type definition; easy to pass wrong shape  
**Fix:** Add JSDoc typedef for payload

---

### MEDIUM SEVERITY

#### [Web components — Missing prop types](apps/web/src/Contacts.jsx#L208-L220)
**Lines:** 208–220 (ContactCard component)
```javascript
function ContactCard({
  contact: c,
  retroOpen,
  onEdit,
  onDelete,
  onAdvance,
  onClearAction,
  onOpenRetro,
  onAddRetro,
  onDeleteRetro,
}) {  // ← No PropTypes or JSDoc typedef
```
**Issue:** No validation of prop shape; easy to pass undefined callbacks  
**Fix:** Add PropTypes or TypeScript

---

#### [Mobile — Implicit types in accessories](apps/mobile/src/components/DrillSession.tsx#L6-L15)
**Lines:** 6–15
```typescript
export type Drill = {
  questions: { tech: string; color: string; q: { question: string; options: string[]; correct: number } }[];
  index: number;
  answered: number | null;
  correctCount: number;
  done: boolean;
};

type Props = {
  drill: Drill;
  onAnswer: (i: number) => void;  // ← missing 'void' return type docs
  onNext: () => void;
  onExit: () => void;
};
```
**Issue:** Nested object type definition is verbose and hard to reuse  
**Fix:** Extract `Question` type:
```typescript
type Question = { question: string; options: string[]; correct: number };
type Drill = {
  questions: { tech: string; color: string; q: Question }[];
  // ...
};
```

---

### LOW SEVERITY

#### [quiz.js — Missing documentation for shuffle unsafe](packages/core/src/quiz.js#L1-L4)
**Lines:** 1–4
```javascript
export const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
```
**Issue:** Fisher-Yates implementation missing; shuffle quality not documented  
**Impact:** Weak randomization (clustering bias)  
**Fix:** Add JSDoc explaining the limitation or implement proper shuffle

---

## 3. LINT ISSUES

### HIGH SEVERITY

#### [api.js — Unhandled Promise rejections in async functions](packages/core/src/api.js#L155-L170)
**Lines:** 155–170
```javascript
async function recordAnswer(tech, correct, source = "card") {
  const { error } = await supabase.from("answer_events").insert({ tech, correct, source });
  if (error) fail(error);
  if (correct) await addXp(CORRECT_XP);  // ← No try/catch around addXp
}
```
**Issue:** If `addXp()` fails, the error is not caught; caller must handle  
**Fix:** Wrap in try/catch or propagate error explicitly

---

#### [ArchBoard.jsx — Missing null checks on refs](apps/web/src/ArchBoard.jsx#L120-L135)
**Lines:** 120–135
```javascript
const onNodePointerMove = (e) => {
  const d = dragRef.current;
  if (!d) return;
  const rect = canvasRef.current.getBoundingClientRect();  // ← No null check on canvasRef
  const x = Math.max(0, Math.min(rect.width - NODE_W, e.clientX - rect.left - d.dx));
```
**Issue:** If `canvasRef.current` is null, `.getBoundingClientRect()` crashes  
**Fix:** Add guard: `if (!canvasRef.current) return;`

---

#### [InterviewPrep.jsx — No error boundary for failed queries](apps/web/src/InterviewPrep.jsx#L1-L30)
**Lines:** 1–30
```javascript
const { data: accuracy = [] } = useQuery({
  queryKey: ["accuracy-timeline"],
  queryFn: api.getAccuracyTimeline
});
// ← No error handling; failed query silently returns []
```
**Issue:** If query fails, user sees empty chart with no error message  
**Fix:** Check `error` state from useQuery

---

#### [Contacts.jsx — Missing error handling for retroDeleteMutation](apps/web/src/Contacts.jsx#L48-L52)
**Lines:** 48–52
```javascript
const retroDeleteMutation = useMutation({ 
  mutationFn: api.deleteRetro, 
  onSettled: invalidate,  // ← No error reporting
});
```
**Issue:** If delete fails, UI doesn't inform user  
**Fix:** Add `onError` callback to show toast/alert

---

### MEDIUM SEVERITY

#### [Long inline styles (>120 chars)](apps/web/src/ArchBoard.jsx#L187-L196)
**Lines:** 187, 195–196, 260, 264, 269, 274–275, 335, 428, 432, 435, 441, 444, 446, 455, 458, +18 more
**Example:** [Line 264](apps/web/src/ArchBoard.jsx#L264)
```javascript
{t("board.boardMeta", { scenario: boardScenario?.name ?? board.scenarioId, nodes: board.nodes.length, edges: board.edges.length })}
```
**Issue:** Lines exceed 120 chars; readability suffers  
**Impact:** Git diffs are harder to read; style is inconsistent  
**Fix:** Extract to variables or use object shorthand

---

#### [buildDrill() — No bounds checking on division](packages/core/src/quiz.js#L22)
**Line:** 22
```javascript
.map(([tech, s]) => ({ tech, acc: s.correct / (s.correct + s.wrong) }))
```
**Issue:** If both `correct` and `wrong` are 0, `acc = 0/0 = NaN`  
**Fix:** Add guard: `rate = (s.correct + s.wrong) > 0 ? s.correct / (s.correct + s.wrong) : 0`

---

#### [funnel.js — Missing guards on status index lookups](packages/core/src/funnel.js#L10)
**Line:** 10
```javascript
const STATUS_INDEX = Object.fromEntries(STATUSES.map((status, index) => [status, index]));
// Later: STATUS_INDEX[event.status] — no check if status is invalid
```
**Issue:** If event has unknown status, `STATUS_INDEX[status] = undefined`  
**Fix:** Add validation when accessing: `STATUS_INDEX[status] ?? -1`

---

#### [AccuracyChart — Potential width calculation edge case](apps/mobile/src/components/AccuracyChart.tsx#L19)
**Line:** 19
```typescript
const innerW = Math.max(1, width - PAD_X * 2);
// ← If width = 20, innerW = 4 (div by 0 risk downstream)
```
**Issue:** Very small canvas can cause visual glitches  
**Fix:** Minimum width check (e.g., 100px)

---

### LOW SEVERITY

#### [Unused variable in InterviewPrep.jsx](apps/web/src/InterviewPrep.jsx#L85)
**Line:** 85
```javascript
const displayCategory = categories[activeCategory];  // ← Never used
```
**Fix:** Remove or use in render

---

#### [Unused import — api.js](apps/web/src/api.js)
**Issue:** If `supabase.js` re-exports API, some imports may be redundant  
**Fix:** Run `eslint --fix` with unused import rule

---

#### [Missing null check for `latest` in AccuracyChart](apps/mobile/src/components/AccuracyChart.tsx#L43)
**Line:** 43
```typescript
<Text style={{ fontSize: 13, fontWeight: "800", color: latest && latest.accuracy >= 0.7 ? colors.success : colors.warning }}>
  {latest ? `${Math.round(latest.accuracy * 100)}%` : "--"}
</Text>
```
**Issue:** Redundant `latest &&` check (already checked below)  
**Fix:** Simplify to `{latest?.accuracy ? ... : "--"}`

---

## 4. RECOMMENDATIONS BY PRIORITY

### 🔴 CRITICAL (Do First)

1. **[api.js#77]** Add Supabase client type definition
2. **[api.js#155-170]** Add try/catch around async recordAnswer/addXp chain
3. **[quiz.js#22]** Add guard for division by zero in accuracy calculation
4. **[ArchBoard.jsx#120-135]** Add null checks on canvas/ref access
5. **[Contacts.jsx#48-52]** Add error reporting for retro delete mutations

### 🟡 HIGH (Refactor Soon)

6. **[ArchBoard.jsx]** Extract state to `useReducer` + split into sub-components
7. **[InterviewPrep.jsx]** Extract card state machine to custom hook
8. **[Contacts.jsx]** Simplify form state with custom hook
9. **[apps/web/*.jsx]** Add Error Boundary wrapper around query components
10. **[web components]** Add PropTypes or convert to TypeScript

### 🟢 MEDIUM (Code Quality)

11. **[Inline styles]** Extract long style objects to constants/utils
12. **[Web components]** Migrate from JSX inline styles to CSS modules or styled-components
13. **[quiz.js#1]** Document or fix shuffle algorithm
14. **[funnel.js#64]** Add validation for status enum lookups

---

## Appendix: File-Level Complexity Summary

| File | Lines | CC Est. | Type Safety | Issues |
|------|-------|--------|-------------|--------|
| [ArchBoard.jsx](apps/web/src/ArchBoard.jsx) | 500 | 18 | Low (JSX) | High state complexity, no nullchecks |
| [InterviewPrep.jsx](apps/web/src/InterviewPrep.jsx) | 350 | 15 | Low (JSX) | Nested card state, missing error handling |
| [Contacts.jsx](apps/web/src/Contacts.jsx) | 400 | 12 | Low (JSX) | Multiple mutations, complex render |
| [api.js](packages/core/src/api.js) | 300 | 14 | Low (untyped supabase) | 6 nested transformers, async errors |
| [funnel.js](packages/core/src/funnel.js) | 107 | 12 | Medium (JSDoc) | Signal calculation logic |
| [quiz.js](packages/core/src/quiz.js) | 31 | 6 | Low (untyped) | Division by zero risk |
| [QuizView.tsx](apps/mobile/src/components/QuizView.tsx) | 80 | 8 | High (TypeScript) | Complex ternary nesting |
| [DrillSession.tsx](apps/mobile/src/components/DrillSession.tsx) | 65 | 5 | High (TypeScript) | Good structure |
| [AccuracyChart.tsx](apps/mobile/src/components/AccuracyChart.tsx) | 68 | 4 | High (TypeScript) | Clean, type-safe |

---

**Generated:** 2026-06-12  
**Analyzer:** Copilot Code Analysis  
