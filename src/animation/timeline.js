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

export function getPourAmount(t, reducedMotion = false) {
  return reducedMotion ? 0 : smooth(11.05, 11.5, t);
}

export function getFloodStart(cupCount) {
  return cupCount > 0 ? 11.3 + (cupCount - 1) * 2.5 + 2.9 + 1.1 : Infinity;
}

export function getFloodLevel(seconds, reducedMotion = false) {
  return reducedMotion ? 0 : clamp(seconds / 55);
}
