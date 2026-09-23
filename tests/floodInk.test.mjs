import test from "node:test";
import assert from "node:assert/strict";
import { getInkCoverage } from "../src/animation/flood.js";

test("ink changes only below the waterline within a line of text", () => {
  assert.equal(getInkCoverage(100, 40, 160), 0);
  assert.equal(getInkCoverage(100, 40, 100), 1);
  assert.equal(getInkCoverage(100, 40, 120), 0.5);
  assert.equal(getInkCoverage(100, 40, 130), 0.25);
});
