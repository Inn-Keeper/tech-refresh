# CV Upload & Tech Extraction Plan

Extract technologies from a user's CV PDF and use them to filter quiz questions and drill scenarios by relevance.

## Overview

**Flow:**
1. User uploads CV (PDF) via drag-drop form in the web/mobile app
2. Frontend reads PDF locally → extracts text → sends to backend
3. Backend parses tech stack from text → returns list of detected techs
4. Frontend stores techs in session state → filters quiz/drill to only relevant questions
5. User sees a curated, personalized prep experience

## Architecture Decisions

| Component | Approach | Rationale | Trade-off |
|-----------|----------|-----------|-----------|
| **PDF Parsing** | `pdfjs-dist` on frontend (client-side) | Keeps backend simple; user's CV stays local; no large file handling on server | +1.5MB bundle (lazy-loadable); no server-side guarantee of correctness |
| **Tech Extraction** | Regex + dictionary in Java (deterministic) | Fast, offline, no API dependency (no LLM cost); reproducible | Won't catch novel/misspelled techs; requires maintaining dictionary (~100 common techs) |
| **Storage** | Session state (React Context or TanStack Query cache) | Lightweight; resets on page reload (privacy) | Lost on refresh; could add localStorage option for "sticky" memory |
| **Quiz Filtering** | Add `techs` param to existing filter logic | Reuses existing difficulty filter pipeline; minimal surface area | Requires `requiredTechs` or `relevantTechs` field on questions/scenarios |

## Files to Create/Modify

### Frontend (React/TypeScript)

#### New Files
- `apps/web/src/lib/cvParser.ts` — PDF reading + text extraction
  - Lazy-loads `pdfjs-dist` on demand
  - Returns raw text from all pages
  - Handles errors gracefully (corrupted PDFs, scanned-image PDFs)

- `apps/web/src/components/CVUploader.tsx` — Upload form component
  - Drag-drop zone + file picker
  - Shows upload progress
  - Displays extracted techs + allows manual editing
  - Clears techs on demand

- `apps/web/src/hooks/useCVTechs.ts` (optional) — Custom hook
  - Manages CV tech state (session/Context/Query)
  - Exposes `techs`, `addTech`, `removeTech`, `setTechs`, `clear`

#### Modified Files
- `apps/web/src/App.tsx`
  - Wire in CV state (Context Provider or Query wrapper)
  - Add CVUploader to a reachable location (e.g., top bar or Prep tab header)

- `apps/web/src/lib/api.ts`
  - Add `extractCvTechs(file: File): Promise<string[]>` client call
  - Posts PDF to `POST /api/cv/extract`

- `apps/web/src/Prep.tsx` (or Quiz component)
  - Consume CV techs from state
  - Pass to `buildDrillFromQuestions(questions, { size: 10, techs: cvTechs })`

### Backend (Java)

#### New Files
- `src/main/java/com/grip/pipeline/web/CvController.java`
  ```java
  @PostMapping("/cv/extract")
  public CvExtractionResponse extract(@RequestParam("file") MultipartFile file)
  ```

- `src/main/java/com/grip/pipeline/service/CvExtractionService.java`
  - `extractText(InputStream pdf): String` — PDF → raw text
  - `parseTechs(String text): Set<String>` — text → detected techs
  - Uses regex patterns + a hardcoded tech dictionary

- `src/main/java/com/grip/pipeline/service/CvExtractionResponse.java`
  ```java
  public record CvExtractionResponse(List<String> techs) {}
  ```

#### Modified Files
- `src/main/java/com/grip/pipeline/config/SecurityConfig.java`
  - Add `/api/cv/extract` to the public endpoint list (or require JWT like other endpoints)

- `pom.xml` or `build.gradle.kts`
  - Add PDF parsing library (e.g., `pdfbox` or `itext`)

#### Tests
- `src/test/java/com/grip/pipeline/service/CvExtractionServiceTest.java`
  - Happy path: PDF with clear tech names → correct extraction
  - Edge cases: empty PDF, no techs, misspelled techs, duplicates
  - Regex robustness: "React.js" vs "react" vs "REACT"

- `src/test/java/com/grip/pipeline/web/CvControllerIT.java`
  - POST with valid JWT → 200, techs extracted
  - POST without file param → 400
  - File size limit (e.g., 10MB)

### Core Package (Shared Logic)

#### Modified Files
- `packages/core/src/quiz.js`
  - Update `buildDrillFromQuestions(questions, opts)` signature
  - Add `opts.techs?: string[]` parameter
  - Filter questions to only those in `techs` (if provided)
  - Fallback: if no techs selected, return all questions (no filtering)

- `packages/core/src/scenarios.js` (if arch board filtering is needed)
  - Similar filtering for custom scenarios
  - Scenario objects already have tags (e.g., "microservices", "cache"); match against CV techs

#### Test Updates
- `packages/core/src/__tests__/quiz.test.js`
  - Assert `buildDrillFromQuestions(qs, { techs: ["React"] })` only returns React questions
  - Assert mixing difficulties + techs works (e.g., hard React questions)

## Tech Dictionary (Starter)

Categories of ~100 common techs to hardcode in the regex patterns:

**Languages:** JavaScript, TypeScript, Python, Java, Go, Rust, C#, C++, PHP, Ruby, Swift, Kotlin
**Frontend:** React, Vue, Angular, Svelte, Next.js, Nuxt, SvelteKit, Qwik
**Mobile:** React Native, Flutter, Swift, Kotlin, Expo, NativeScript
**Backend:** Node.js, Django, FastAPI, Spring Boot, Express, Nest.js, ASP.NET, Rails
**Databases:** PostgreSQL, MySQL, MongoDB, Redis, DynamoDB, Firestore, Cassandra
**Cloud:** AWS, GCP, Azure, Heroku, Vercel, Netlify, DigitalOcean, Supabase
**DevOps:** Docker, Kubernetes, GitHub Actions, GitLab CI, Jenkins, Terraform
**Testing:** Jest, Vitest, Pytest, JUnit, Mocha, Chai
**Monitoring:** Datadog, New Relic, Grafana, Prometheus, CloudWatch, ELK
**AI/ML:** TensorFlow, PyTorch, OpenAI, Langchain, Hugging Face, Anthropic (Claude)
**Other:** GraphQL, REST, gRPC, Elasticsearch, Kafka, RabbitMQ, Redis, Stripe

Regex pattern: `\b(react|react\.js|reactjs|vue|angular|...)\b` (case-insensitive)

## Questions Before Implementation

1. **PDF Library**: Prefer `pdfbox` (Apache, lightweight) or `itext` (featureful but commercial)?
2. **Tech Dictionary**: Should we start with ~50 techs and grow, or be comprehensive from day 1?
3. **Storage**: Session-only (reset on refresh) or also localStorage for "remembered" techs?
4. **Question Fields**: Do existing questions have a `requiredTechs` field, or do we add one?
5. **Backend Auth**: Should CV extraction require JWT (consistent with other `/api` endpoints) or be public?

## Implementation Order

1. **Phase 1 (Backend):**
   - Add PDF parsing + tech extraction service (with tests)
   - Wire `POST /api/cv/extract` endpoint
   - Ship with starter tech dictionary

2. **Phase 2 (Frontend):**
   - `cvParser.ts` + `CVUploader.tsx`
   - `useCVTechs` hook (session state)
   - Integrate into web app (Prep tab or top bar)

3. **Phase 3 (Filtering):**
   - Update `quiz.js` to accept `techs` param
   - Update Prep component to pass CV techs to drill builder
   - Test end-to-end in browser

4. **Phase 4 (Polish & Mobile):**
   - Add to mobile app (if wanted)
   - Improve UX: show extraction progress, allow manual edits
   - Add localStorage option for "sticky" techs (optional)

5. **Phase 5 (Expand):**
   - Add CV filtering to Arch Board scenarios
   - Consider LLM-based extraction as an optional "smart" mode (future)
   - Add CV upload history / re-use previous extractions

## Success Criteria

- ✅ User uploads PDF → techs extracted in < 2s
- ✅ Quiz adapts: only shows questions matching extracted techs
- ✅ Techs can be manually edited/cleared
- ✅ Works on web (mobile deferred)
- ✅ Backend tests cover happy path + edge cases
- ✅ No regressions in existing quiz/drill flow
