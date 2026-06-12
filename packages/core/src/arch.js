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

/** @type {Scenario[]} */
export const SCENARIOS = [
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

  return { checks, earned, totalPts, score: Math.round((earned / totalPts) * 100), cost, maint, warnings };
}
