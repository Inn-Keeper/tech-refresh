import { useRef, useState } from "react";
import { NODE_TYPES, TYPE_COLORS, meta, SCENARIOS, evaluate } from "@tech-refresh/core/arch";

const NODE_W = 132;
const NODE_H = 54;

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
