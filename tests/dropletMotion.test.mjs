import test from "node:test";
import assert from "node:assert/strict";
import { getDropletFall } from "../src/animation/dropletMotion.js";

test("drops start almost stationary and accelerate sharply after detaching", () => {
  assert.equal(getDropletFall(170, 0).speed, 0);
  assert.ok(getDropletFall(170, 0.2).offset < 2);
  const earlyTravel =
    getDropletFall(170, 0.3).offset - getDropletFall(170, 0.2).offset;
  const lateTravel =
    getDropletFall(170, 0.6).offset - getDropletFall(170, 0.5).offset;
  assert.ok(lateTravel > earlyTravel * 15);
});
test("landing clamps at the floor, including drops that start on the floor", () => {
  for (const height of [0, 2, 30, 170]) {
    const end = getDropletFall(height, 3);
    assert.equal(end.offset, height);
    assert.equal(end.landed, true);
    assert.equal(end.speed, 0);
  }
});
test("mobile and desktop share the same timing; release has continuous speed", () => {
  assert.ok(
    Math.abs(
      getDropletFall(170, 0).duration - getDropletFall(85, 0, 0.5).duration,
    ) < 1e-10,
  );
  const before = getDropletFall(170, 0.32 - 1e-6);
  const after = getDropletFall(170, 0.32 + 1e-6);
  assert.ok(Math.abs(after.offset - before.offset) < 0.001);
  assert.ok(Math.abs(after.speed - before.speed) < 0.01);
});
