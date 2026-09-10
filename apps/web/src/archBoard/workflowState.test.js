import assert from "node:assert/strict";
import { test } from "node:test";
import { workflowStep } from "./workflowState.js";

test("starts by asking for components", () => {
  assert.equal(workflowStep(0, 0), 1);
});

test("asks for a connection once components exist", () => {
  assert.equal(workflowStep(2, 0), 2);
});

test("asks for arrow details after a connection exists", () => {
  assert.equal(workflowStep(2, 1), 3);
});
