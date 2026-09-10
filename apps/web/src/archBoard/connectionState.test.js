import assert from "node:assert/strict";
import { test } from "node:test";
import { activateConnection } from "./connectionState.js";

test("first activation selects a source", () => {
  assert.deepEqual(activateConnection(null, "a"), { sourceId: "a", edge: null });
});

test("another node completes the connection", () => {
  assert.deepEqual(activateConnection("a", "b"), { sourceId: null, edge: { from: "a", to: "b" } });
});

test("activating the source again cancels", () => {
  assert.deepEqual(activateConnection("a", "a"), { sourceId: null, edge: null });
});
