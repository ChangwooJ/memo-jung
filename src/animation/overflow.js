import { clamp, smooth } from "./timeline.js";

// Two rivulets wrap around the OUTSIDE of the tapered glass. They share a
// pendant junction below its base; only then does the free-falling jet begin.
export function getSurfaceRivuletPoint(progress, side) {
  const u = clamp(progress);
  const y = 29 - 65 * u;
  const x = u === 1 ? 0 : side * 25 * (1 - u ** 1.35);
  const radius =
    y >= 24
      ? 32 + ((y - 24) / 7) * 2
      : y >= -29
        ? 26 + ((y + 29) / 53) * 6
        : 26 + ((y + 29) / 7) * 2;
  const z = Math.sqrt(Math.max(0, radius * radius - x * x)) + 1.7;
  return { x, y, z };
}

export function getOverflowGrowth(amount) {
  return {
    branches: smooth(0, 0.58, amount),
    junction: smooth(0.5, 0.68, amount),
    stem: smooth(0.58, 1, amount),
  };
}
