import { useState } from "react";

const categories = [
  {
    name: "Languages",
    emoji: "🧠",
    color: "#6366f1",
    items: [
      {
        tech: "TypeScript",
        oneliner: "JavaScript with a type system that catches bugs before runtime.",
        prep: "Know structural typing, `unknown` vs `any`, utility types (Partial, Pick, Omit, ReturnType), generics, and discriminated unions. Be ready to explain why you'd choose TS over JS in a team setting.",
      },
      {
        tech: "JavaScript",
        oneliner: "The language of the web — event-driven, single-threaded, prototype-based.",
        prep: "Master the event loop, closures, `this` binding, Promises vs async/await, the prototype chain, and ES2020+ features like optional chaining and nullish coalescing.",
      },
      {
        tech: "Java",
        oneliner: "Strongly typed, OOP-first language powering enterprise backends and Android.",
        prep: "Review OOP principles (SOLID), interfaces vs abstract classes, generics, streams, and concurrency basics. Know how Spring Boot works if relevant.",
      },
      {
        tech: "PHP",
        oneliner: "Server-side scripting language that still powers most of the web.",
        prep: "Know PSR standards, Composer, modern PHP 8 features (named args, enums, fibers), and how to build REST APIs with Laravel or Slim.",
      },
      {
        tech: "Python",
        oneliner: "Readable, batteries-included language dominating scripting and AI/ML.",
        prep: "Cover list comprehensions, generators, decorators, type hints, and async I/O. If AI-adjacent, know pandas, FastAPI, and how to interact with LLM APIs.",
      },
      {
        tech: "C++",
        oneliner: "Systems-level language with manual memory control and zero-overhead abstractions.",
        prep: "Focus on RAII, smart pointers (unique_ptr/shared_ptr), the rule of three/five, move semantics, and how the STL works. Helpful for audio/DSP and plugin contexts.",
      },
    ],
  },
  {
    name: "Frontend & Mobile",
    emoji: "🖥️",
    color: "#0ea5e9",
    items: [
      {
        tech: "React",
        oneliner: "Component-based UI library built around declarative rendering and a virtual DOM.",
        prep: "Be solid on hooks (useState, useEffect, useCallback, useMemo, useRef), reconciliation, rendering performance, lifting state vs context, and common patterns like compound components.",
      },
      {
        tech: "React Native",
        oneliner: "Write once in React, ship native apps to iOS and Android.",
        prep: "Know the bridge vs JSI architecture, platform-specific code, navigation (React Navigation), metro bundler, and the full App Store/Play Store release pipeline.",
      },
      {
        tech: "Next.js",
        oneliner: "React framework for production — SSR, SSG, App Router, and edge rendering baked in.",
        prep: "Understand App Router vs Pages Router, Server Components vs Client Components, data fetching patterns, caching strategies, middleware, and deployment on Vercel.",
      },
      {
        tech: "TanStack",
        oneliner: "Headless, framework-agnostic utilities — primarily React Query for server state.",
        prep: "Know the difference between server state and client state, query keys, stale-while-revalidate, mutations, and how it compares to Redux for async data.",
      },
      {
        tech: "Redux",
        oneliner: "Predictable state container with a unidirectional data flow.",
        prep: "Cover actions, reducers, selectors, middleware (thunk/saga), and modern Redux Toolkit. Know when Redux is overkill vs when it shines (large teams, complex shared state).",
      },
      {
        tech: "Tailwind",
        oneliner: "Utility-first CSS framework — style directly in markup, no custom class names needed.",
        prep: "Know the JIT engine, responsive prefixes, dark mode, arbitrary values, and how to extend the config. Be ready to defend utility-first vs BEM/CSS Modules.",
      },
      {
        tech: "Material UI",
        oneliner: "Google's Material Design implemented as a rich React component library.",
        prep: "Know the theme system, `sx` prop vs `styled`, component overrides, and how to customize tokens. Understand when MUI speeds you up vs slows you down.",
      },
      {
        tech: "Vite",
        oneliner: "Lightning-fast dev server and bundler using native ESM and Rollup under the hood.",
        prep: "Understand why Vite is faster than Webpack in dev (no bundling), how plugins work, and config for aliases, env vars, and build optimization.",
      },
      {
        tech: "Rspack",
        oneliner: "Webpack-compatible Rust-based bundler — drop-in replacement, 10× faster.",
        prep: "Know why Rspack exists (Rust perf vs JS bundlers), its Webpack API compatibility story, and migration considerations from Webpack.",
      },
      {
        tech: "Webpack",
        oneliner: "The veteran module bundler — highly configurable, powers most legacy frontends.",
        prep: "Cover loaders vs plugins, code splitting, tree shaking, module federation, and common performance pitfalls. Know when to reach for Vite/Rspack instead.",
      },
      {
        tech: "pnpm / Corepack",
        oneliner: "Fast, disk-efficient package manager with strict node_modules and workspace support.",
        prep: "Know content-addressable storage, hoisting behavior differences from npm/yarn, monorepo workspaces, and how Corepack pins package manager versions per project.",
      },
    ],
  },
  {
    name: "Backend",
    emoji: "⚙️",
    color: "#10b981",
    items: [
      {
        tech: "Node.js",
        oneliner: "JavaScript runtime on the server — event-driven, non-blocking I/O.",
        prep: "Know the event loop in depth, streams, worker threads, clustering, and common performance gotchas. Be ready to compare Node with Deno or Bun.",
      },
      {
        tech: "NestJS",
        oneliner: "Opinionated Node.js framework using decorators and modules — Angular-inspired.",
        prep: "Cover modules, controllers, providers/services, guards, interceptors, pipes, and how DI works. Know how it integrates with TypeORM or Prisma and when to pick it over Express.",
      },
      {
        tech: "GraphQL (Relay)",
        oneliner: "Query language for APIs that gives clients exactly the data they need.",
        prep: "Know schema definition, resolvers, N+1 problem (DataLoader), fragments, Relay connections/pagination spec, and when REST is a better fit.",
      },
      {
        tech: "REST / OpenAPI",
        oneliner: "Standard HTTP API paradigm — stateless, resource-based, documented with OpenAPI specs.",
        prep: "Review REST constraints, proper HTTP verbs and status codes, versioning strategies, and how OpenAPI/Swagger enables contract-first design and codegen.",
      },
      {
        tech: "Microservices",
        oneliner: "Architectural style where a system is split into small, independently deployable services.",
        prep: "Know service discovery, inter-service communication (sync HTTP/gRPC vs async messaging), eventual consistency, distributed tracing, and the pitfalls of premature decomposition.",
      },
    ],
  },
  {
    name: "Cloud & DevOps",
    emoji: "☁️",
    color: "#f59e0b",
    items: [
      {
        tech: "Azure DevOps",
        oneliner: "Microsoft's end-to-end platform for repos, CI/CD pipelines, boards, and artifacts.",
        prep: "Know YAML pipelines, stages/jobs/steps, environments, variable groups, service connections, and how to gate deployments with approvals.",
      },
      {
        tech: "Azure Portal / GCP",
        oneliner: "Cloud control planes for provisioning compute, storage, networking, and managed services.",
        prep: "Be able to discuss identity (RBAC, service principals), resource groups, cost management, and core managed services like App Service, Blob Storage, Cloud Run, and BigQuery.",
      },
      {
        tech: "CI/CD Pipelines",
        oneliner: "Automated workflows that build, test, and deploy code on every change.",
        prep: "Know the principles — fast feedback, reproducible builds, rollback strategies. Be ready to walk through a real pipeline you've designed: triggers, stages, artifacts, and secrets handling.",
      },
      {
        tech: "Git",
        oneliner: "Distributed version control — the backbone of every modern development workflow.",
        prep: "Be fluent in branching strategies (trunk-based vs gitflow), rebase vs merge, interactive rebase, cherry-pick, bisect, and resolving complex merge conflicts.",
      },
    ],
  },
  {
    name: "Monitoring",
    emoji: "📊",
    color: "#ec4899",
    items: [
      {
        tech: "Application Insights",
        oneliner: "Azure's APM service — traces, exceptions, performance metrics, and live telemetry.",
        prep: "Know how to instrument Node/React apps, custom events and metrics, availability tests, and alerting. Understand how it ties into Log Analytics workspaces.",
      },
      {
        tech: "KQL",
        oneliner: "Kusto Query Language — used to query Azure Monitor, Log Analytics, and App Insights.",
        prep: "Practice common operators: `where`, `summarize`, `join`, `extend`, `project`, `bin`. Know how to build time-series queries and spot anomalies in log data.",
      },
      {
        tech: "Datadog",
        oneliner: "Full-stack observability platform — metrics, logs, traces, and dashboards in one.",
        prep: "Know APM tracing, log correlation, monitors/alerts, dashboards, and the difference between infrastructure metrics and APM spans.",
      },
      {
        tech: "Grafana",
        oneliner: "Open-source dashboarding tool that visualizes metrics from almost any data source.",
        prep: "Know how to connect data sources (Prometheus, Loki, PostgreSQL), build dashboards with variables, and set up alerting rules.",
      },
      {
        tech: "LaunchDarkly",
        oneliner: "Feature flag platform for controlled rollouts, A/B testing, and kill switches.",
        prep: "Know flag targeting (users, segments, percentages), SDK integration patterns, and how to use flags for progressive delivery and trunk-based development without long-lived branches.",
      },
    ],
  },
  {
    name: "AI Tooling",
    emoji: "🤖",
    color: "#8b5cf6",
    items: [
      {
        tech: "GitHub Copilot",
        oneliner: "AI pair programmer embedded in your editor — autocomplete, chat, and code review.",
        prep: "Know how to write effective prompts, when to trust vs verify suggestions, and how it integrates with GitHub PR reviews. Be able to discuss security and IP considerations.",
      },
      {
        tech: "Claude / OpenAI Codex",
        oneliner: "LLMs accessed via API for code generation, summarization, and reasoning tasks.",
        prep: "Know the messages API structure, system prompts, temperature/top_p, tool use/function calling, token limits, and cost-latency tradeoffs between models.",
      },
      {
        tech: "RAG Pipelines",
        oneliner: "Retrieval-Augmented Generation — ground LLM responses in your own data via vector search.",
        prep: "Know the full pipeline: chunking, embedding, vector store (Pinecone/pgvector), retrieval, and prompt assembly. Understand tradeoffs between semantic search and keyword search.",
      },
    ],
  },
  {
    name: "Testing",
    emoji: "🧪",
    color: "#14b8a6",
    items: [
      {
        tech: "Playwright (E2E)",
        oneliner: "Modern browser automation framework for reliable end-to-end testing across all browsers.",
        prep: "Know auto-waiting, locator strategies (prefer `getByRole`/`getByText`), Page Object Model, network mocking, and how to run tests in CI with traces on failure.",
      },
      {
        tech: "Jest",
        oneliner: "All-in-one JavaScript test runner with built-in mocking, assertions, and coverage.",
        prep: "Know `describe`/`it`/`beforeEach`, manual mocks vs `jest.fn()`, snapshot testing tradeoffs, module mocking, and how to configure for TypeScript and ESM.",
      },
      {
        tech: "React Testing Library",
        oneliner: "Test React components the way users interact — via accessible queries, not implementation details.",
        prep: "Know the query priority (`getByRole` > `getByText` > `getByTestId`), `userEvent` vs `fireEvent`, async utilities (`waitFor`, `findBy`), and why RTL discourages testing internals.",
      },
      {
        tech: "TDD",
        oneliner: "Write the failing test first, then write only enough code to make it pass.",
        prep: "Know the Red-Green-Refactor cycle, how TDD shapes API design, where it adds most value (pure functions, complex logic), and where it's friction (UI, integration tests).",
      },
    ],
  },
  {
    name: "Mobile Delivery",
    emoji: "📱",
    color: "#f97316",
    items: [
      {
        tech: "App Store / Play Store",
        oneliner: "Apple and Google's distribution pipelines — submission, review, versioning, and rollout.",
        prep: "Know code signing and provisioning profiles (iOS), build variants and keystore (Android), staged rollouts, OTA updates (Expo/CodePush), and how to handle review rejections.",
      },
    ],
  },
  {
    name: "Databases & CRM",
    emoji: "🗄️",
    color: "#64748b",
    items: [
      {
        tech: "PostgreSQL",
        oneliner: "Powerful open-source relational database with strong ACID compliance and rich feature set.",
        prep: "Know indexing (B-tree, GIN, partial), EXPLAIN ANALYZE, JSONB, CTEs, window functions, connection pooling (PgBouncer), and row-level security.",
      },
      {
        tech: "MySQL",
        oneliner: "The most widely deployed open-source relational database — fast reads, huge ecosystem.",
        prep: "Know InnoDB vs MyISAM, query optimization, indexing strategies, replication basics, and common differences from PostgreSQL.",
      },
      {
        tech: "Oracle",
        oneliner: "Enterprise-grade RDBMS known for performance, features, and large corporate deployments.",
        prep: "Know PL/SQL basics, partitioning, explain plans, and common migration patterns to/from Oracle. Useful for finance and government-adjacent roles.",
      },
      {
        tech: "MongoDB",
        oneliner: "Document-oriented NoSQL database — flexible schema, horizontal scaling, JSON-native.",
        prep: "Know document modeling vs relational, aggregation pipeline, indexing, Atlas Search, and when embedding vs referencing is the right call.",
      },
      {
        tech: "Couchbase",
        oneliner: "Distributed NoSQL database combining key-value speed with SQL-like querying (N1QL).",
        prep: "Know the bucket/scope/collection model, N1QL queries, indexing, and Couchbase's mobile sync (Lite) story for offline-first apps.",
      },
      {
        tech: "SQLite",
        oneliner: "Embedded, serverless SQL database — the default choice for local and mobile storage.",
        prep: "Know when SQLite is the right tool (single writer, local/mobile), WAL mode for concurrent reads, and how React Native and Expo use it under the hood.",
      },
      {
        tech: "HubSpot",
        oneliner: "CRM and marketing platform with an API for contacts, deals, workflows, and custom objects.",
        prep: "Know the HubSpot API structure (contacts, companies, deals, properties), webhooks, workflow automation, and CRM data modeling with associations and custom objects.",
      },
    ],
  },
];

export default function InterviewPrep() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [flipped, setFlipped] = useState({});
  const [search, setSearch] = useState("");

  const allItems = categories.flatMap((c) =>
    c.items.map((item) => ({ ...item, category: c.name, color: c.color, emoji: c.emoji }))
  );

  const filtered = search.trim()
    ? allItems.filter(
        (i) =>
          i.tech.toLowerCase().includes(search.toLowerCase()) ||
          i.oneliner.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const displayCategory = categories[activeCategory];

  const toggleFlip = (key) =>
    setFlipped((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minWidth: "100vw", minHeight: "100vh", background: "#0f1117", color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{ padding: "32px 24px 0", maxWidth: "100%", justifyContent: "space-between", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 28 }}>⚡</span>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: "#f1f5f9" }}>
            Interview Prep
          </h1>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748b", fontWeight: 500 }}>
            {allItems.length} technologies
          </span>
        </div>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>
          Tap a card to flip it and reveal interview prep notes.
        </p>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 24 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: 14 }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search any technology…"
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 12px 10px 36px",
              background: "#1e2330", border: "1px solid #2d3748",
              borderRadius: 10, color: "#e2e8f0", fontSize: 14,
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Search results */}
      {filtered ? (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 48px" }}>
          {filtered.length === 0 ? (
            <p style={{ color: "#64748b", textAlign: "center", marginTop: 40 }}>No matches found.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {filtered.map((item) => {
                const key = `search-${item.tech}`;
                const isFlipped = flipped[key];
                return (
                  <FlipCard key={key} item={item} isFlipped={isFlipped} onFlip={() => toggleFlip(key)} />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Category tabs */}
          <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none" }}>
              {categories.map((cat, i) => (
                <button
                  key={cat.name}
                  onClick={() => { setActiveCategory(i); setFlipped({}); }}
                  style={{
                    padding: "7px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                    background: activeCategory === i ? cat.color : "#1e2330",
                    color: activeCategory === i ? "#fff" : "#94a3b8",
                    transition: "all 0.15s",
                  }}
                >
                  {cat.emoji} {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div style={{ maxWidth: 960, margin: "16px auto 0", padding: "0 24px 48px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {displayCategory.items.map((item) => {
                const key = `${activeCategory}-${item.tech}`;
                const isFlipped = flipped[key];
                return (
                  <FlipCard
                    key={key}
                    item={{ ...item, color: displayCategory.color, emoji: displayCategory.emoji }}
                    isFlipped={isFlipped}
                    onFlip={() => toggleFlip(key)}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FlipCard({ item, isFlipped, onFlip }) {
  return (
    <div
      onClick={onFlip}
      style={{
        cursor: "pointer",
        perspective: 1000,
        height: 180,
        borderRadius: 14,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1)",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front */}
        <div
          style={{
            position: "absolute", inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            background: "#1e2330",
            border: `1px solid ${item.color}30`,
            borderRadius: 14,
            padding: "20px 18px",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{
              display: "inline-block", padding: "3px 10px",
              background: `${item.color}20`, borderRadius: 20,
              color: item.color, fontSize: 11, fontWeight: 700,
              letterSpacing: "0.04em", marginBottom: 10,
            }}>
              {item.tech}
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#cbd5e1" }}>
              {item.oneliner}
            </p>
          </div>
          <div style={{ fontSize: 11, color: "#475569", textAlign: "right", marginTop: 8 }}>
            tap to prep →
          </div>
        </div>

        {/* Back */}
        <div
          style={{
            position: "absolute", inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: `linear-gradient(135deg, ${item.color}18, #1e2330)`,
            border: `1px solid ${item.color}50`,
            borderRadius: 14,
            padding: "18px",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
            overflow: "hidden",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: item.color, marginBottom: 8, letterSpacing: "0.06em" }}>
              INTERVIEW PREP
            </div>
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "#94a3b8", overflowY: "auto", maxHeight: 118 }}>
              {item.prep}
            </p>
          </div>
          <div style={{ fontSize: 11, color: "#475569", textAlign: "right" }}>
            {item.tech}
          </div>
        </div>
      </div>
    </div>
  );
}