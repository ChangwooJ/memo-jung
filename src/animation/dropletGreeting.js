import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import fontData from "three/examples/fonts/optimer_bold.typeface.json";
import { smooth } from "./timeline.js";

const seed = (n) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const mix = THREE.MathUtils.lerp;
function contains(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i],
      b = points[j];
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

// Sample the text silhouette, as in the supplied sand reference. There is no
// solid text mesh underneath: every visible part of the greeting is a drop.
function sampleGreeting() {
  const font = new FontLoader().parse(fontData);
  const points = [];
  let width = 0;
  ["Hi, I'm", "Changwoo Jung!"].forEach((line, lineIndex) => {
    let offset = 0;
    for (const letter of line) {
      const contours = font
        .generateShapes(letter, 65)
        .map((shape) => shape.extractPoints(12));
      for (const contour of contours) {
        const xs = contour.shape.map((p) => p.x),
          ys = contour.shape.map((p) => p.y);
        const minX = Math.min(...xs),
          maxX = Math.max(...xs);
        const minY = Math.min(...ys),
          maxY = Math.max(...ys);
        const inShape = (x, y) =>
          contains(contour.shape, x, y) &&
          !contour.holes.some((hole) => contains(hole, x, y));
        let row = 0;
        for (let y = minY + 1; y < maxY; y += 4.0, row++) {
          for (let x = minX + 1 + (row % 2) * 2.2; x < maxX; x += 4.4) {
            if (!inShape(x, y)) continue;
            const id = points.length;
            const edge =
              !inShape(x, y - 2.7) ||
              !inShape(x - 2.7, y) ||
              !inShape(x + 2.7, y);
            points.push({
              x: offset + x + (seed(id + 3) - 0.5) * 0.45,
              y: 56 + lineIndex * 77 - y,
              radius: 1.7 + seed(id + 11) * 0.5,
              release: 4.8 + seed(id + 29) * 1.35 + (edge ? 0 : 0.35),
              drift: (seed(id + 43) - 0.5) * 22,
              gather: 7.65 + seed(id + 57) * 0.3,
              phase: seed(id + 67) * Math.PI * 2,
            });
          }
        }
      }
      offset += (font.data.glyphs[letter]?.ha ?? 300) * 0.065;
    }
    width = Math.max(width, offset);
  });
  return { points, width };
}

export function createDropletGreeting(scene, coffee) {
  const { points, width } = sampleGreeting();
  const geometry = new THREE.SphereGeometry(1, 10, 8);
  const material = coffee.clone();
  material.color.set(0xffffff);
  material.roughness = 0.22;
  material.clearcoat = 0.55;
  material.envMapIntensity = 0.25;
  const drops = new THREE.InstancedMesh(geometry, material, points.length);
  drops.name = "coffee-droplet-greeting";
  drops.frustumCulled = false;
  drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(drops);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  points.forEach((point, i) => {
    color.setHSL(0.045 + seed(i) * 0.01, 0.65, 0.13 + seed(i + 7) * 0.045);
    color.convertSRGBToLinear();
    drops.setColorAt(i, color);
  });
  return {
    count: points.length,
    update({ t, g, sy, floorY, puddleX, target, reduced }) {
      drops.visible = !reduced && t < 9.7;
      if (!drops.visible) return;
      const scale = Math.min(g.w / width, g.h / 154);
      points.forEach((point, i) => {
        const arrival = smooth(
          seed(i + 13) * 0.6,
          1.55 + seed(i + 17) * 0.65,
          t,
        );
        const tx = g.x + point.x * scale,
          ty = g.y + point.y * scale;
        let x =
          tx +
          (1 - arrival) * Math.cos(point.phase) * (22 + seed(i) * 55) * scale;
        let y =
          ty +
          (1 - arrival) *
            Math.sin(point.phase) *
            (18 + seed(i + 2) * 35) *
            scale;
        let z = 9 + Math.sin(point.phase) * 0.7;
        let stretch = 1 + Math.sin(t * 2 + point.phase) * 0.035;
        let radius = point.radius * scale * smooth(0, 0.45, t);
        const age = Math.max(0, t - point.release);
        if (age > 0) {
          // Gravity and slight sideways drift release the same text droplets.
          const flight = Math.sqrt(Math.max(0, floorY - ty) / 340);
          const fallingAge = Math.min(age, flight);
          x = tx + point.drift * fallingAge * scale;
          y = Math.min(floorY, ty + 340 * fallingAge * fallingAge);
          stretch =
            1 + Math.min(1.15, fallingAge * 2.5) * (age < flight ? 1 : 0);
          if (age >= flight) {
            const settle = smooth(flight, flight + 0.45, age);
            x = mix(x, puddleX + (tx - puddleX) * 0.83, settle);
            y = floorY + Math.sin(point.phase) * 2 * scale;
            stretch = 0.45;
          }
        }
        const gather = smooth(point.gather, 9.25 + seed(i + 71) * 0.35, t);
        if (gather > 0) {
          const arc = Math.sin(gather * Math.PI);
          x = mix(x, target.x, gather);
          y = mix(y, -target.y + sy, gather) - arc * 55;
          z = mix(z, target.z, gather) + arc * 8;
          radius *= 1 - smooth(0.82, 1, gather);
          stretch = 1 + arc * 0.8;
        }
        dummy.position.set(x, -(y - sy), z);
        dummy.scale.set(radius, radius * stretch, radius * 0.82);
        dummy.updateMatrix();
        drops.setMatrixAt(i, dummy.matrix);
      });
      drops.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      drops.dispose();
      scene.remove(drops);
    },
  };
}
