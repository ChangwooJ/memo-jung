import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import fontData from "three/examples/fonts/optimer_bold.typeface.json";
import { smooth } from "./timeline.js";
import { getDropletFall } from "./dropletMotion.js";

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
// solid text mesh underneath: every visible part of the greeting is a bean.
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
        for (let y = minY + 1; y < maxY; y += 6.3, row++) {
          for (let x = minX + 1 + (row % 2) * 2.8; x < maxX; x += 5.6) {
            if (!inShape(x, y)) continue;
            const id = points.length;
            const edge =
              !inShape(x, y - 2.7) ||
              !inShape(x - 2.7, y) ||
              !inShape(x + 2.7, y);
            points.push({
              x: offset + x + (seed(id + 3) - 0.5) * 0.45,
              y: 56 + lineIndex * 77 - y,
              radius: 2.05 + seed(id + 11) * 0.5,
              release: 4.8 + seed(id + 29) * 0.85 + (edge ? 0 : 0.2),
              drift: (seed(id + 43) - 0.5) * 22,
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

export function createBeanGreeting(scene, coffee) {
  const { points, width } = sampleGreeting();
  const geometry = new THREE.SphereGeometry(1, 20, 16);
  const vertices = geometry.attributes.position;
  const colors = new Float32Array(vertices.count * 3);
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i),
      y = vertices.getY(i),
      z = vertices.getZ(i);
    const seamX = Math.sin(y * 3.1) * 0.13;
    const seam = z > 0 ? Math.exp(-(((x - seamX) / 0.12) ** 2)) : 0;
    vertices.setXYZ(i, x, y * 1.38, z * 0.75 - seam * 0.24);
    const shade = 1 - seam * 0.91;
    colors.set([shade, shade, shade], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = coffee.clone();
  material.color.set(0xffffff);
  material.roughness = 0.57;
  material.vertexColors = true;
  material.clearcoat = 0.12;
  material.envMapIntensity = 0.25;
  const drops = new THREE.InstancedMesh(geometry, material, points.length);
  drops.name = "coffee-bean-greeting";
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
    update({ t, g, sy, floorY, puddleX, reduced }) {
      drops.visible = !reduced && t < 7.65;
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
        const z = 9 + Math.sin(point.phase) * 0.7;
        let stretch = 1 + Math.sin(t * 2 + point.phase) * 0.035;
        let radius = point.radius * scale * smooth(0, 0.45, t);
        dummy.rotation.set(0.16, -0.18, point.phase * 0.45);
        const age = Math.max(0, t - point.release);
        if (age > 0) {
          const fall = getDropletFall(floorY - ty, age, scale);
          x = tx + point.drift * Math.min(age, fall.duration) * scale;
          y = ty + fall.offset;
          stretch = 1;
          dummy.rotation.z = point.phase + age * point.drift * 0.12;
          if (fall.landed) {
            const settle = smooth(fall.duration, fall.duration + 0.45, age);
            x = mix(x, puddleX + (tx - puddleX) * 0.83, settle);
            y = floorY + Math.sin(point.phase) * 2 * scale;
            stretch = 1 - smooth(fall.duration, fall.duration + 0.3, age) * 0.7;
            radius *=
              1 - smooth(fall.duration + 0.05, fall.duration + 0.38, age);
          }
        }
        dummy.position.set(x, -(y - sy), z);
        const width = radius / Math.sqrt(stretch);
        dummy.scale.set(width, radius * stretch, width * 0.82);
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
