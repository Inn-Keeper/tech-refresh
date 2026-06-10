import { useRef, useState } from "react";

const NODE_W = 132;
const NODE_H = 54;

const NODE_TYPES = [
  { type: "client", label: "Client", emoji: "📱", cost: 0, maint: 0 },
  { type: "cdn", label: "CDN", emoji: "🌐", cost: 1, maint: 1 },
  { type: "lb", label: "Load Balancer", emoji: "⚖️", cost: 1, maint: 1 },
  { type: "gateway", label: "API Gateway", emoji: "🚪", cost: 2, maint: 2 },
  { type: "auth", label: "Auth Service", emoji: "🔐", cost: 2, maint: 2 },
  { type: "service", label: "Service / API", emoji: "⚙️", cost: 2, maint: 2 },
  { type: "worker", label: "Async Worker", emoji: "🛠️", cost: 2, maint: 2 },
  { type: "queue", label: "Message Queue", emoji: "📨", cost: 2, maint: 2 },
  { type: "cache", label: "Cache (Redis)", emoji: "⚡", cost: 1, maint: 1 },
  { type: "sql", label: "SQL Database", emoji: "🗄️", cost: 2, maint: 2 },
  { type: "nosql", label: "NoSQL DB", emoji: "📦", cost: 2, maint: 2 },
  { type: "psp", label: "Payment Provider", emoji: "💳", cost: 3, maint: 1 },
  { type: "monitor", label: "Monitoring", emoji: "📊", cost: 1, maint: 1 },
];

const TYPE_COLORS = {
  client: "#0ea5e9", cdn: "#38bdf8", lb: "#f59e0b", gateway: "#f97316",
  auth: "#8b5cf6", service: "#10b981", worker: "#14b8a6", queue: "#eab308",
  cache: "#ef4444", sql: "#64748b", nosql: "#84cc16", psp: "#ec4899", monitor: "#a855f7",
};

const meta = (type) => NODE_TYPES.find((t) => t.type === type);

const SCENARIOS = [
  {
    id: "payment",
    name: "💳 Payment end-to-end",
    brief:
      "Design checkout payment processing: accept a payment, call the provider, survive retries and webhooks, and keep records consistent. Card data must never touch your own database.",
    budget: 16,
    checks: [
      { kind: "node", type: ["client"], label: "A client initiates checkout", points: 5 },
      { kind: "edge", from: ["client"], to: ["gateway", "lb"], label: "Traffic enters through a gateway or load balancer — clients never hit services directly", points: 10 },
      { kind: "node", type: ["auth"], label: "Authentication sits in front of money movement", points: 10 },
      { kind: "edge", from: ["gateway", "lb", "auth"], to: ["service"], label: "Requests are routed to a payment service", points: 10 },
      { kind: "edge", from: ["service"], to: ["psp"], label: "The service calls the payment provider — your servers own that integration", points: 15 },
      { kind: "edge", from: ["psp"], to: ["service", "worker", "queue"], label: "A webhook path back from the provider for async confirmations and disputes", points: 15 },
      { kind: "node", type: ["queue"], label: "A queue decouples confirmation and reconciliation work", points: 10 },
      { kind: "edge", from: ["queue"], to: ["worker"], bidi: true, label: "Workers consume from the queue", points: 10 },
      { kind: "edge", from: ["service", "worker"], to: ["sql", "nosql"], label: "Payment state is persisted durably", points: 10 },
      { kind: "node", type: ["monitor"], label: "Observability on the money path", points: 5 },
    ],
    warnings: [
      {
        when: ({ hasEdge }) => hasEdge(["client"], ["psp"]),
        text: "The client integrates the payment provider directly — API secrets belong on the server, and you lose the ability to record the attempt.",
      },
      {
        when: ({ hasNode }) => !hasNode(["sql", "nosql"]),
        text: "Nowhere durable to store payment state — reconciliation against the provider becomes impossible.",
      },
    ],
  },
  {
    id: "catalog",
    name: "🛍️ Read-heavy product catalog",
    brief:
      "Millions of reads, few writes. Serve product pages fast and cheap worldwide without melting the database.",
    budget: 11,
    checks: [
      { kind: "node", type: ["client"], label: "A client browses the catalog", points: 5 },
      { kind: "node", type: ["cdn"], label: "A CDN exists for static assets", points: 10 },
      { kind: "edge", from: ["client"], to: ["cdn"], label: "Clients fetch static assets from the CDN", points: 10 },
      { kind: "edge", from: ["client", "cdn"], to: ["lb", "gateway"], label: "API traffic is load-balanced", points: 10 },
      { kind: "edge", from: ["lb", "gateway"], to: ["service"], label: "A stateless API tier serves catalog reads", points: 10 },
      { kind: "node", type: ["cache"], label: "Hot reads come from a cache", points: 15 },
      { kind: "edge", from: ["service"], to: ["cache"], label: "The service reads cache-aside", points: 15 },
      { kind: "edge", from: ["service"], to: ["sql", "nosql"], label: "The source of truth lives in a database", points: 15 },
      { kind: "node", type: ["monitor"], label: "Latency and error budgets are observable", points: 10 },
    ],
    warnings: [
      {
        when: ({ hasNode }) => !hasNode(["cdn"]),
        text: "Every image and JS bundle ships from origin — a CDN is the cheapest win available here.",
      },
    ],
  },
  {
    id: "flashsale",
    name: "🎟️ Flash-sale ticket burst",
    brief:
      "Spiky traffic: 100× normal load for 10 minutes when sales open. Don't oversell inventory, don't fall over, and keep the queue of buyers fair.",
    budget: 14,
    checks: [
      { kind: "node", type: ["client"], label: "A client tries to buy", points: 5 },
      { kind: "edge", from: ["client"], to: ["lb", "gateway"], label: "Traffic enters through a load balancer or gateway", points: 10 },
      { kind: "edge", from: ["lb", "gateway"], to: ["service"], label: "Stateless services absorb the burst horizontally", points: 10 },
      { kind: "node", type: ["queue"], label: "A queue buffers purchase requests instead of dropping them", points: 15 },
      { kind: "edge", from: ["service"], to: ["queue"], label: "The service enqueues purchases for ordered processing", points: 10 },
      { kind: "edge", from: ["queue"], to: ["worker"], bidi: true, label: "Workers drain the queue at a sustainable rate", points: 10 },
      { kind: "node", type: ["cache"], label: "Inventory counts served from a cache, not the DB", points: 10 },
      { kind: "edge", from: ["service"], to: ["cache"], label: "The service checks availability against the cache", points: 10 },
      { kind: "edge", from: ["worker", "service"], to: ["sql", "nosql"], label: "Orders are persisted durably", points: 10 },
      { kind: "node", type: ["monitor"], label: "You can see the spike happening in real time", points: 10 },
    ],
    warnings: [
      {
        when: ({ hasNode, hasEdge }) => hasNode(["service"]) && hasEdge(["service"], ["sql", "nosql"]) && !hasNode(["queue"]),
        text: "Synchronous writes straight to the database — at 100× load this is where it falls over. Buffer through a queue.",
      },
    ],
  },
];

function evaluate(scenario, nodes, edges) {
  const typeOf = Object.fromEntries(nodes.map((n) => [n.id, n.type]));
  const hasNode = (types) => nodes.some((n) => types.includes(n.type));
  const hasEdge = (from, to, bidi) =>
    edges.some((e) => {
      const a = typeOf[e.from];
      const b = typeOf[e.to];
      return (from.includes(a) && to.includes(b)) || (bidi && from.includes(b) && to.includes(a));
    });

  const checks = scenario.checks.map((c) => ({
    ...c,
    passed: c.kind === "node" ? hasNode(c.type) : hasEdge(c.from, c.to, c.bidi),
  }));
  const earned = checks.filter((c) => c.passed).reduce((s, c) => s + c.points, 0);
  const totalPts = scenario.checks.reduce((s, c) => s + c.points, 0);

  const cost = nodes.reduce((s, n) => s + meta(n.type).cost, 0);
  const maint = nodes.reduce((s, n) => s + meta(n.type).maint, 0);

  const warnings = [];
  if (cost > scenario.budget)
    warnings.push(`Over budget: cost ${cost} against a budget of ${scenario.budget}. Every box is a monthly bill.`);
  if (nodes.length > 12)
    warnings.push("A lot of moving parts — each one is deploy, patch, and on-call surface for the team.");
  if (hasEdge(["client"], ["sql", "nosql"]))
    warnings.push("The client talks directly to a database — no validation layer, no auth boundary.");
  if (hasNode(["cache"]) && !hasEdge(["service", "worker", "gateway"], ["cache"]))
    warnings.push("A cache that nothing reads is pure cost.");
  if (hasNode(["queue"]) && !hasEdge(["queue"], ["worker", "service"], true))
    warnings.push("A queue with no consumer — messages go in and rot.");
  for (const w of scenario.warnings || []) {
    if (w.when({ hasNode, hasEdge })) warnings.push(w.text);
  }

  return { checks, earned, totalPts, score: Math.round((earned / totalPts) * 100), cost, maint, warnings };
}

export default function ArchBoard() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [connectFrom, setConnectFrom] = useState(null);
  const [result, setResult] = useState(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);

  const scenario = SCENARIOS[scenarioIdx];
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const liveCost = nodes.reduce((s, n) => s + meta(n.type).cost, 0);
  const liveMaint = nodes.reduce((s, n) => s + meta(n.type).maint, 0);

  const switchScenario = (i) => {
    setScenarioIdx(i);
    setNodes([]);
    setEdges([]);
    setConnectFrom(null);
    setResult(null);
  };

  const addNode = (type) => {
    const i = nodes.length;
    setNodes([
      ...nodes,
      { id: crypto.randomUUID(), type, x: 30 + (i % 5) * 155, y: 30 + Math.floor(i / 5) * 95 },
    ]);
    setResult(null);
  };

  const removeNode = (id) => {
    setNodes(nodes.filter((n) => n.id !== id));
    setEdges(edges.filter((e) => e.from !== id && e.to !== id));
    if (connectFrom === id) setConnectFrom(null);
    setResult(null);
  };

  const addEdge = (from, to) => {
    if (from === to || edges.some((e) => e.from === from && e.to === to)) return;
    setEdges([...edges, { id: crypto.randomUUID(), from, to }]);
    setResult(null);
  };

  const removeEdge = (id) => {
    setEdges(edges.filter((e) => e.id !== id));
    setResult(null);
  };

  const onNodePointerDown = (e, n) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = canvasRef.current.getBoundingClientRect();
    dragRef.current = { id: n.id, dx: e.clientX - rect.left - n.x, dy: e.clientY - rect.top - n.y, moved: false };
  };

  const onNodePointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width - NODE_W, e.clientX - rect.left - d.dx));
    const y = Math.max(0, Math.min(rect.height - NODE_H, e.clientY - rect.top - d.dy));
    d.moved = true;
    setNodes((prev) => prev.map((n) => (n.id === d.id ? { ...n, x, y } : n)));
  };

  const onNodePointerUp = () => {
    if (dragRef.current?.moved) suppressClickRef.current = true;
    dragRef.current = null;
  };

  const onNodeClick = (n) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (connectFrom && connectFrom !== n.id) {
      addEdge(connectFrom, n.id);
      setConnectFrom(null);
    } else if (connectFrom === n.id) {
      setConnectFrom(null);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 48px" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: "#f1f5f9" }}>
        Arch Board
      </h1>
      <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13 }}>
        Pick a scenario, drag components onto the canvas, wire them with arrows (click a node's ● handle, then the
        target), then evaluate your design — like defending it in an architecture meeting.
      </p>

      {/* Scenario tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {SCENARIOS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => switchScenario(i)}
            style={{
              padding: "7px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600,
              background: scenarioIdx === i ? "#6366f1" : "#1e2330",
              color: scenarioIdx === i ? "#fff" : "#94a3b8",
            }}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div
        style={{
          padding: "12px 16px", background: "#1a1f2e", border: "1px solid #2d3748",
          borderRadius: 10, marginBottom: 14, fontSize: 13, lineHeight: 1.6, color: "#94a3b8",
        }}
      >
        {scenario.brief}
      </div>

      {/* Live cost ticker + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: liveCost > scenario.budget ? "#ef4444" : "#94a3b8" }}>
          💰 Cost {liveCost} / budget {scenario.budget}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>🔧 Maintenance load {liveMaint}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => { setNodes([]); setEdges([]); setConnectFrom(null); setResult(null); }}
            style={{
              padding: "7px 14px", background: "transparent", border: "1px solid #2d3748",
              borderRadius: 8, color: "#94a3b8", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            Clear board
          </button>
          <button
            onClick={() => setResult(evaluate(scenario, nodes, edges))}
            disabled={nodes.length === 0}
            style={{
              padding: "7px 16px", background: "#6366f1", border: "none", borderRadius: 8,
              color: "#fff", fontSize: 12, fontWeight: 600,
              cursor: nodes.length ? "pointer" : "not-allowed", opacity: nodes.length ? 1 : 0.5,
            }}
          >
            Evaluate design
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "stretch", flexWrap: "wrap" }}>
        {/* Palette */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 170 }}>
          {NODE_TYPES.map((t) => (
            <button
              key={t.type}
              onClick={() => addNode(t.type)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                background: "#1e2330", border: `1px solid ${TYPE_COLORS[t.type]}40`,
                borderRadius: 8, color: "#cbd5e1", fontSize: 12, fontWeight: 600,
                cursor: "pointer", textAlign: "left",
              }}
              title={`cost ${t.cost} · maint ${t.maint}`}
            >
              <span>{t.emoji}</span>
              <span style={{ flex: 1 }}>{t.label}</span>
              <span style={{ color: "#475569", fontSize: 10 }}>{"$".repeat(t.cost) || "free"}</span>
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          onClick={(e) => { if (e.target === canvasRef.current) setConnectFrom(null); }}
          style={{
            position: "relative", flex: 1, minWidth: 480, height: 560,
            background: "#13161f",
            backgroundImage: "radial-gradient(#2d3748 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            border: "1px solid #2d3748", borderRadius: 14, overflow: "hidden",
          }}
        >
          {nodes.length === 0 && (
            <div
              style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center",
                justifyContent: "center", color: "#475569", fontSize: 13, pointerEvents: "none",
              }}
            >
              ← Add components from the palette, then wire them up
            </div>
          )}

          {/* Edges */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
              </marker>
            </defs>
            {edges.map((e) => {
              const a = nodeById[e.from];
              const b = nodeById[e.to];
              if (!a || !b) return null;
              const sx = a.x + (b.x >= a.x ? NODE_W : 0);
              const sy = a.y + NODE_H / 2;
              const tx = b.x + (b.x >= a.x ? 0 : NODE_W);
              const ty = b.y + NODE_H / 2;
              const mx = (sx + tx) / 2;
              const d = `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`;
              return (
                <g key={e.id}>
                  <path d={d} fill="none" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="14"
                    style={{ pointerEvents: "stroke", cursor: "pointer" }}
                    onClick={() => removeEdge(e.id)}
                  >
                    <title>Click to remove this connection</title>
                  </path>
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((n) => {
            const t = meta(n.type);
            const color = TYPE_COLORS[n.type];
            const isSource = connectFrom === n.id;
            return (
              <div
                key={n.id}
                onPointerDown={(e) => onNodePointerDown(e, n)}
                onPointerMove={onNodePointerMove}
                onPointerUp={onNodePointerUp}
                onClick={() => onNodeClick(n)}
                style={{
                  position: "absolute", left: n.x, top: n.y, width: NODE_W, height: NODE_H,
                  boxSizing: "border-box",
                  background: "#1e2330",
                  border: `2px solid ${isSource ? "#f1f5f9" : `${color}60`}`,
                  borderRadius: 10, cursor: "grab", touchAction: "none", userSelect: "none",
                  display: "flex", alignItems: "center", gap: 8, padding: "0 10px",
                  boxShadow: isSource ? `0 0 0 3px ${color}30` : "none",
                }}
              >
                <span style={{ fontSize: 18 }}>{t.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#cbd5e1", lineHeight: 1.2 }}>{t.label}</span>
                <button
                  onPointerDown={(ev) => ev.stopPropagation()}
                  onClick={(ev) => { ev.stopPropagation(); removeNode(n.id); }}
                  title="Remove"
                  style={{
                    position: "absolute", top: -8, right: -8, width: 18, height: 18,
                    borderRadius: "50%", border: "none", background: "#2d3748", color: "#94a3b8",
                    fontSize: 11, lineHeight: 1, cursor: "pointer", padding: 0,
                  }}
                >
                  ×
                </button>
                <button
                  onPointerDown={(ev) => ev.stopPropagation()}
                  onClick={(ev) => { ev.stopPropagation(); setConnectFrom(isSource ? null : n.id); }}
                  title={isSource ? "Cancel connection" : "Connect from here — then click a target node"}
                  style={{
                    position: "absolute", right: -9, top: NODE_H / 2 - 9, width: 18, height: 18,
                    borderRadius: "50%", border: "2px solid #13161f", background: color,
                    cursor: "pointer", padding: 0,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Evaluation results */}
      {result && (
        <div
          style={{
            marginTop: 16, padding: "18px 20px", background: "#1a1f2e",
            border: "1px solid #2d3748", borderRadius: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: result.score >= 80 ? "#22c55e" : result.score >= 50 ? "#f59e0b" : "#ef4444" }}>
              {result.score}%
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>
              {result.score >= 80 ? "Ship it 🚀" : result.score >= 50 ? "Needs review before the meeting" : "Back to the whiteboard"}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>
              💰 {result.cost}/{scenario.budget} · 🔧 maint {result.maint} ({result.maint <= 8 ? "lean" : result.maint <= 14 ? "moderate" : "heavy"})
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8, letterSpacing: "0.04em" }}>
                DESIGN CHECKS
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {result.checks.map((c) => (
                  <li key={c.label} style={{ fontSize: 12.5, lineHeight: 1.5, color: c.passed ? "#86efac" : "#fca5a5" }}>
                    {c.passed ? "✅" : "❌"} {c.label}{" "}
                    <span style={{ color: "#475569" }}>({c.points} pts)</span>
                  </li>
                ))}
              </ul>
            </div>
            {result.warnings.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8, letterSpacing: "0.04em" }}>
                  MEETING NOTES
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                  {result.warnings.map((w) => (
                    <li key={w} style={{ fontSize: 12.5, lineHeight: 1.5, color: "#fbbf24" }}>
                      ⚠️ {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
