export const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
export const smooth = (a, b, t) => {
  const x = clamp((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};

// One continuous clock: no implicit loop and no reset on filters or navigation.
export function getPhase(t) {
  if (t < 2.3) return "writing";
  if (t < 4.8) return "greeting";
  if (t < 7.5) return "falling";
  if (t < 9.7) return "gathering";
  if (t < 15) return "pouring";
  return "flowing";
}

export function getCupState(t, index, reducedMotion = false) {
  if (reducedMotion) return { fill: 0.82, overflow: 0 };
  const start = 11.3 + index * 2.5;
  return {
    fill: smooth(start, start + 2.3, t),
    overflow: smooth(start + 2.3, start + 2.9, t),
  };
}
