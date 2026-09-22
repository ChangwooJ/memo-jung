// A brief surface-tension release followed by free fall. Units are CSS pixels
// and seconds; scaling gravity with the artwork preserves mobile timing.
export function getDropletFall(distance, age, scale = 1) {
  const height = Math.max(0, distance);
  const time = Math.max(0, age);
  const hold = 0.32;
  const creep = Math.min(height * 0.05, 3 * scale);
  const gravity = 1550 * scale;
  const releaseSpeed = (2 * creep) / hold;
  const freeDuration =
    (Math.sqrt(releaseSpeed ** 2 + 2 * gravity * (height - creep)) -
      releaseSpeed) /
    gravity;
  const duration = height === 0 ? 0 : hold + freeDuration;
  const landed = time >= duration;
  let offset, speed;
  if (time < hold) {
    offset = creep * (time / hold) ** 2;
    speed = (2 * creep * time) / hold ** 2;
  } else {
    const freeTime = Math.min(time - hold, freeDuration);
    offset = creep + releaseSpeed * freeTime + 0.5 * gravity * freeTime ** 2;
    speed = releaseSpeed + gravity * freeTime;
  }
  return {
    offset: landed ? height : offset,
    speed: landed ? 0 : speed,
    duration,
    landed,
  };
}
