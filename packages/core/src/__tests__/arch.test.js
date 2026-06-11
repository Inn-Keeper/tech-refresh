import { SCENARIOS, evaluate, meta } from "../arch.js";

const payment = SCENARIOS.find((s) => s.id === "payment");

let nextId = 0;
const node = (type) => ({ id: `n${nextId++}`, type, x: 0, y: 0 });
const edge = (from, to) => ({ id: `${from.id}->${to.id}`, from: from.id, to: to.id });

/** A reference payment architecture that satisfies every check. */
function passingPaymentBoard() {
  const client = node("client");
  const gateway = node("gateway");
  const auth = node("auth");
  const service = node("service");
  const psp = node("psp");
  const queue = node("queue");
  const worker = node("worker");
  const sql = node("sql");
  const monitor = node("monitor");
  const nodes = [client, gateway, auth, service, psp, queue, worker, sql, monitor];
  const edges = [
    edge(client, gateway),
    edge(gateway, service),
    edge(service, psp),
    edge(psp, service),
    edge(service, queue),
    edge(queue, worker),
    edge(worker, sql),
  ];
  return { nodes, edges };
}

describe("evaluate", () => {
  it("scores a complete payment architecture at 100% with no warnings", () => {
    const { nodes, edges } = passingPaymentBoard();
    const result = evaluate(payment, nodes, edges);
    expect(result.score).toBe(100);
    expect(result.warnings).toEqual([]);
    expect(result.checks.every((check) => check.passed)).toBe(true);
  });

  it("scores an empty board at 0%", () => {
    const result = evaluate(payment, [], []);
    expect(result.score).toBe(0);
    expect(result.cost).toBe(0);
    expect(result.checks.some((check) => check.passed)).toBe(false);
  });

  it("flags a client wired directly to a database", () => {
    const client = node("client");
    const sql = node("sql");
    const result = evaluate(payment, [client, sql], [edge(client, sql)]);
    expect(result.warnings.some((w) => w.includes("client talks directly to a database"))).toBe(true);
  });

  it("flags going over the scenario budget", () => {
    // Three payment providers (cost 3 each) plus a full passing board blows the budget of 16.
    const { nodes, edges } = passingPaymentBoard();
    const extras = [node("psp"), node("psp"), node("psp")];
    const result = evaluate(payment, [...nodes, ...extras], edges);
    expect(result.warnings.some((w) => w.startsWith("Over budget"))).toBe(true);
  });

  it("flags a queue that nothing consumes", () => {
    const queue = node("queue");
    const result = evaluate(payment, [queue], []);
    expect(result.warnings.some((w) => w.includes("queue with no consumer"))).toBe(true);
  });

  it("honors bidirectional edge checks (worker -> queue also counts)", () => {
    const queue = node("queue");
    const worker = node("worker");
    const result = evaluate(payment, [queue, worker], [edge(worker, queue)]);
    const queueCheck = result.checks.find((check) => check.label.includes("consume from the queue"));
    expect(queueCheck.passed).toBe(true);
  });
});

describe("meta", () => {
  it("resolves every palette type to its spec", () => {
    expect(meta("psp").label).toBe("Payment Provider");
    expect(meta("cache").cost).toBe(1);
  });
});
