import test from "node:test";
import assert from "node:assert/strict";
import {
  getSurfaceRivuletPoint,
  getOverflowGrowth,
} from "../src/animation/overflow.js";

test("left and right rivulets form a Y with one shared junction below the glass", () => {
  assert.equal(getSurfaceRivuletPoint(0, -1).x, -25);
  assert.equal(getSurfaceRivuletPoint(0, 1).x, 25);
  assert.deepEqual(getSurfaceRivuletPoint(1, -1), getSurfaceRivuletPoint(1, 1));
  assert.ok(getSurfaceRivuletPoint(1, 1).y < -31);
});
test("rivulets stay on the outside of the glass and always travel downward", () => {
  let previousY = Infinity;
  for (let i = 0; i <= 100; i++) {
    const p = getSurfaceRivuletPoint(i / 100, 1);
    assert.ok(p.y < previousY);
    previousY = p.y;
    const radius =
      p.y >= 24
        ? 32 + ((p.y - 24) / 7) * 2
        : p.y >= -29
          ? 26 + ((p.y + 29) / 53) * 6
          : 24;
    assert.ok(Math.hypot(p.x, p.z) > radius);
  }
});
test("the falling stem starts only after the branches have joined", () => {
  for (let amount = 0; amount <= 1; amount += 0.01) {
    const growth = getOverflowGrowth(amount);
    if (growth.stem > 0) assert.equal(growth.branches, 1);
  }
  assert.deepEqual(getOverflowGrowth(0), { branches: 0, junction: 0, stem: 0 });
  assert.equal(getOverflowGrowth(1).stem, 1);
});
