import test from "node:test";
import assert from "node:assert/strict";
import { getCupState, getPhase } from "../src/animation/timeline.js";
import { filterPosts, posts } from "../src/data.js";

test("a cup cannot overflow before it is full; lower cups fill in order", () => {
  for (let t = 0; t < 35; t += 0.1) {
    for (let i = 0; i < 6; i++) {
      const cup = getCupState(t, i);
      if (cup.overflow > 0) assert.equal(cup.fill, 1);
      if (i > 0 && cup.fill > 0) assert.equal(getCupState(t, i - 1).fill, 1);
    }
  }
});
test("intro and pot do not restart after the sequence finishes", () => {
  for (const t of [15, 60, 3600]) assert.equal(getPhase(t), "flowing");
});
test("reduced motion provides filled cups with no streams", () => {
  assert.deepEqual(getCupState(0, 3, true), { fill: 0.82, overflow: 0 });
});
test("search and categories compose, including Korean, tags, and empty results", () => {
  assert.equal(filterPosts(posts, "development", "  REACT ").length, 1);
  assert.equal(filterPosts(posts, "design", "React").length, 0);
  assert.equal(filterPosts(posts, "all", "기록")[0].id, "beginning");
  assert.equal(filterPosts(posts, "all", "no-results-please").length, 0);
  assert.equal(filterPosts(posts, "all", "", true)[0].id, "useful-css");
});
