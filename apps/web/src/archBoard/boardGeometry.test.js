import assert from "node:assert/strict";
import { test } from "node:test";
import { contentBounds, findPlacement, pointerToBoard } from "./boardGeometry.js";

const size = { width: 132, height: 54 };

test("pointer coordinates include scroll offset", () => {
  assert.deepEqual(pointerToBoard({ x: 140, y: 90 }, { left: 100, top: 50 }, { left: 200, top: 120 }), { x: 240, y: 160 });
});

test("placement stays visible in narrow viewports", () => {
  const point = findPlacement([], { width: 320, height: 560 }, size);
  assert.ok(point.x >= 0 && point.x + size.width <= 320);
});

test("placement scans for the first free cell", () => {
  const nodes = [{ x: 30, y: 30 }, { x: 185, y: 30 }];
  assert.deepEqual(findPlacement(nodes, { width: 480, height: 560 }, size), { x: 30, y: 125 });
});

test("content bounds contain loaded offscreen nodes", () => {
  assert.deepEqual(contentBounds([{ x: 900, y: 700 }], { width: 320, height: 560 }, size), { width: 1062, height: 784 });
});

