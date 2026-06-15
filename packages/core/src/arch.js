// Arch Board domain: component palette, scenarios, evaluator.
// Shared by web and mobile — keep free of UI/framework imports.

/**
 * @typedef {object} NodeSpec
 * @property {string} type
 * @property {string} label
 * @property {string} emoji
 * @property {number} cost
 * @property {number} maint
 */

/**
 * @typedef {object} BoardNode
 * @property {string} id
 * @property {string} type
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {object} BoardEdge
 * @property {string} id
 * @property {string} from
 * @property {string} to
 */

/**
 * @typedef {object} Check
 * @property {"node" | "edge"} kind
 * @property {string[]} [type]
 * @property {string[]} [from]
 * @property {string[]} [to]
 * @property {boolean} [bidi]
 * @property {string} label
 * @property {number} points
 */

/**
 * @typedef {object} WarningRule
 * @property {(helpers: {
 *   hasNode: (types: string[]) => boolean,
 *   hasEdge: (from: string[], to: string[], bidi?: boolean) => boolean,
 * }) => boolean} when
 * @property {string} text
 */

/**
 * @typedef {object} Scenario
 * @property {string} id
 * @property {string} name
 * @property {string} brief
 * @property {number} budget
 * @property {Check[]} checks
 * @property {WarningRule[]} [warnings]
 */

/**
 * @typedef {object} EvalResult
 * @property {(Check & { passed: boolean })[]} checks
 * @property {number} earned
 * @property {number} totalPts
 * @property {number} score
 * @property {number} cost
 * @property {number} maint
 * @property {string[]} warnings
 */

/** @type {NodeSpec[]} */
export const NODE_TYPES = [
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

/** @type {Record<string, string>} */
// Data-viz ramp: Tailwind-400 weights, no teal (reserved for the brand accent),
// no pure danger-red (reserved for errors). Rules in /DESIGN.md.
export const TYPE_COLORS = {
  client: "#38BDF8", cdn: "#7DD3FC", lb: "#FBBF24", gateway: "#FB923C",
  auth: "#A78BFA", service: "#4ADE80", worker: "#818CF8", queue: "#FACC15",
  cache: "#F472B6", sql: "#94A3B8", nosql: "#A3E635", psp: "#E879F9", monitor: "#C084FC",
};

/**
 * Palette lookup. Board nodes are only ever created from NODE_TYPES,
 * so a miss is a programmer error.
 * @param {string} type
 * @returns {NodeSpec}
 */
export const meta = (type) => NODE_TYPES.find((t) => t.type === type) ?? NODE_TYPES[0];

// The 100-scenario default library lives in scenarios.js; re-exported here so
// both apps keep importing everything board-related from "@tech-refresh/core/arch".
export { SCENARIOS, SCENARIO_CATEGORIES } from "./scenarios.js";

/**
 * Compiles a user-authored custom scenario's requirements into evaluator checks.
 * Points are split evenly so every custom scenario scores out of the same scale.
 * @param {string[]} requiredNodes - node types that must be on the board
 * @param {{ from: string, to: string }[]} requiredEdges - connections that must exist
 * @returns {Check[]}
 */
export function buildCustomChecks(requiredNodes, requiredEdges) {
  /** @type {Check[]} */
  const checks = [
    ...requiredNodes.map((type) => ({
      kind: "node",
      type: [type],
      label: `${meta(type).label} is part of the design`,
    })),
    ...requiredEdges.map(({ from, to }) => ({
      kind: "edge",
      from: [from],
      to: [to],
      label: `${meta(from).label} connects to ${meta(to).label}`,
    })),
  ];
  const points = Math.max(1, Math.round(100 / Math.max(1, checks.length)));
  return checks.map((check) => ({ ...check, points }));
}

/**
 * Scores a board against a scenario's checks, budget, and global design rules.
 * @param {Scenario} scenario
 * @param {BoardNode[]} nodes
 * @param {BoardEdge[]} edges
 * @returns {EvalResult}
 */
export function evaluate(scenario, nodes, edges) {
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

  // A scenario with no scorable checks would divide by zero; treat it as 0%.
  const score = totalPts > 0 ? Math.round((earned / totalPts) * 100) : 0;
  return { checks, earned, totalPts, score, cost, maint, warnings };
}
