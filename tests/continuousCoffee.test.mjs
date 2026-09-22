import test from "node:test";
import assert from "node:assert/strict";
import {
  getCupState,
  getPourAmount,
  getFloodStart,
  getFloodLevel,
} from "../src/animation/timeline.js";
import { paginate } from "../src/pagination.js";

test("pot keeps pouring indefinitely after the intro", () => {
  assert.equal(getPourAmount(0), 0);
  for (const t of [15, 30, 120, 3600]) assert.equal(getPourAmount(t), 1);
  assert.equal(getPourAmount(120, true), 0);
});
test("page flooding starts after the last cup overflows and reaches the entire page", () => {
  for (const count of [1, 2, 3, 6]) {
    const start = getFloodStart(count);
    assert.equal(getCupState(start, count - 1).overflow, 1);
    assert.equal(getFloodLevel(0), 0);
    assert.ok(getFloodLevel(20) < getFloodLevel(40));
    assert.equal(getFloodLevel(60), 1);
    assert.equal(getFloodLevel(60, true), 0);
  }
  assert.equal(getFloodStart(0), Infinity);
});
test("pagination replaces rows, clamps filtered pages, and preserves item offsets", () => {
  const items = [1, 2, 3, 4, 5, 6];
  assert.deepEqual(paginate(items, 1).items, [1, 2, 3]);
  assert.deepEqual(paginate(items, 2).items, [4, 5, 6]);
  assert.equal(paginate(items, 2).offset, 3);
  assert.equal(paginate([1], 2).page, 1);
  assert.deepEqual(paginate([], 3).items, []);
  assert.equal(paginate(items, 20).page, 2);
});
