import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  smooth,
  getPhase,
  getCupState,
  getPourAmount,
  getFloodStart,
  getFloodLevel,
} from "./timeline.js";

import { createBeanGreeting } from "./beanGreeting.js";
import { createFlood } from "./flood.js";
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const mix = THREE.MathUtils.lerp;
const seed = (n) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

export function createCoffeeScene(
  canvas,
  {
    initialTime,
    initialFloodTime = 0,
    onFloodTime,
    getState,
    onPhase,
    onStatus,
    onTime,
  },
) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
  } catch {
    onStatus("unavailable");
    onPhase("flowing");
    return { dispose() {}, measure() {}, restart() {}, drain() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    0,
    innerWidth,
    0,
    -innerHeight,
    0.1,
    3000,
  );
  camera.position.z = 1000;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xfffcf3, 0x85715b, 1.4));
  const key = new THREE.DirectionalLight(0xfff5da, 2.8);
  key.position.set(-250, 300, 600);
  scene.add(key);
  const fillLight = new THREE.DirectionalLight(0xffffff, 1.3);
  fillLight.position.set(600, -100, 350);
  scene.add(fillLight);

  const coffee = new THREE.MeshPhysicalMaterial({
    color: 0x35180a,
    metalness: 0.06,
    roughness: 0.19,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 0.9,
  });
  const darkCoffee = coffee.clone();
  darkCoffee.color.set(0x180b04);
  const crema = new THREE.MeshPhysicalMaterial({
    color: 0xbb8050,
    roughness: 0.36,
    metalness: 0.02,
    clearcoat: 0.8,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.06,
    metalness: 0,
    transmission: 0.96,
    transparent: true,
    opacity: 0.15,
    thickness: 2.5,
    ior: 1.46,
    envMapIntensity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const glassEdge = new THREE.MeshPhysicalMaterial({
    color: 0xd2dac9,
    metalness: 0.2,
    roughness: 0.17,
    transparent: true,
    opacity: 0.65,
    envMapIntensity: 1.6,
  });
  const black = new THREE.MeshStandardMaterial({
    color: 0x34362e,
    roughness: 0.29,
    metalness: 0.35,
  });
  const silver = new THREE.MeshStandardMaterial({
    color: 0xd6d8c9,
    metalness: 0.8,
    roughness: 0.2,
  });
  const resources = new Set([
    coffee,
    darkCoffee,
    crema,
    glass,
    glassEdge,
    black,
    silver,
  ]);
  const mesh = (geometry, material, parent, x = 0, y = 0, z = 0) => {
    resources.add(geometry);
    resources.add(material);
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  };
  const ring = (radius, thickness, material, parent, y = 0) => {
    const object = mesh(
      new THREE.TorusGeometry(radius, thickness, 10, 64),
      material,
      parent,
      0,
      y,
    );
    object.rotation.x = Math.PI / 2;
    return object;
  };

  // Real lathed, double-walled glasses with a thick base and a rolled rim.
  const cupModels = [];
  const cupShape = [
    [0, -31],
    [23, -31],
    [26, -29],
    [32, 24],
    [34, 29],
    [34, 31],
    [32.3, 31],
    [30.3, 25],
    [24, -25],
    [0, -25],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const cupGeometry = new THREE.LatheGeometry(cupShape, 64);
  resources.add(cupGeometry);
  function makeCup() {
    const group = new THREE.Group();
    group.rotation.x = 0.31;
    scene.add(group);
    const body = mesh(cupGeometry, glass, group);
    body.renderOrder = 3;
    ring(33.1, 0.85, glassEdge, group, 30);
    ring(24.3, 1.2, glassEdge, group, -29);
    // Slim white vertical glints make the glass readable against a clear backdrop.
    const glintMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const glint = mesh(
      new THREE.CapsuleGeometry(0.85, 37, 3, 7),
      glintMaterial,
      group,
      -27,
      1,
      16,
    );
    glint.rotation.z = -0.1;
    const liquid = mesh(
      new THREE.CylinderGeometry(31.5, 23.3, 1, 56, 1),
      coffee,
      group,
    );
    const surfaceGeometry = new THREE.CircleGeometry(31, 56);
    surfaceGeometry.rotateX(-Math.PI / 2);
    const surface = mesh(surfaceGeometry, darkCoffee, group);
    const surfaceOriginal = surfaceGeometry.attributes.position.array.slice();
    const foam = ring(30.6, 0.58, crema, group);
    const rippleMaterial = crema.clone();
    rippleMaterial.transparent = true;
    rippleMaterial.opacity = 0.4;
    const ripple = ring(1, 0.06, rippleMaterial, group);
    const drop = mesh(
      new THREE.SphereGeometry(1.9, 10, 8),
      coffee,
      group,
      30,
      28,
      0,
    );
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x777752,
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
    });
    const shadow = mesh(
      new THREE.CircleGeometry(32, 48),
      shadowMaterial,
      scene,
    );
    shadow.scale.set(1.25, 0.18, 1);
    shadow.position.z = -40;
    const cup = {
      group,
      liquid,
      surface,
      foam,
      ripple,
      drop,
      shadow,
      surfaceOriginal,
    };
    cupModels.push(cup);
    return cup;
  }
  for (let i = 0; i < 6; i++) makeCup();

  // A glass coffee server, with a dark handle and a gently curved pouring lip.
  const pot = new THREE.Group();
  scene.add(pot);
  const potBody = new THREE.Group();
  pot.add(potBody);
  potBody.rotation.x = 0.18;
  const potProfile = [
    [0, -47],
    [31, -47],
    [41, -43],
    [45, -31],
    [46, -9],
    [40, 12],
    [29, 29],
    [28, 37],
    [26, 37],
    [27, 28],
    [38, 10],
    [43, -10],
    [42, -30],
    [37, -40],
    [0, -41],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  mesh(new THREE.LatheGeometry(potProfile, 64), glass, potBody).renderOrder = 3;
  ring(29, 2.1, black, potBody, 35);
  ring(34, 1.2, glassEdge, potBody, -45);
  const lid = new THREE.Group();
  potBody.add(lid);
  mesh(new THREE.CylinderGeometry(29, 30, 5, 48), black, lid, 0, 38);
  mesh(new THREE.CylinderGeometry(9, 10, 5, 24), black, lid, 0, 43);
  const handleCurve = new THREE.CatmullRomCurve3([
    V(27, 30, 0),
    V(62, 29, 0),
    V(66, -5, 0),
    V(42, -19, 0),
  ]);
  mesh(new THREE.TubeGeometry(handleCurve, 30, 5.2, 12, false), black, potBody);
  const spoutCurve = new THREE.CatmullRomCurve3([
    V(-26, 27),
    V(-42, 27),
    V(-51, 38),
    V(-64, 37),
  ]);
  mesh(new THREE.TubeGeometry(spoutCurve, 24, 5, 12, false), silver, potBody);
  const potLiquid = mesh(
    new THREE.CylinderGeometry(39, 35, 49, 48),
    coffee,
    potBody,
    0,
    -15,
  );
  const potSurface = mesh(
    new THREE.CircleGeometry(39, 48),
    darkCoffee,
    potBody,
    0,
    9.5,
  );
  potSurface.rotation.x = -Math.PI / 2;
  const potFoam = ring(38, 0.7, crema, potBody, 10);
  for (let i = 0; i < 5; i++)
    mesh(
      new THREE.BoxGeometry(i % 2 === 0 ? 10 : 6, 0.8, 0.5),
      glassEdge,
      potBody,
      4,
      -22 + i * 9,
      43,
    );
  const potGlintMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const potGlint = mesh(
    new THREE.CapsuleGeometry(1.9, 28, 4, 8),
    potGlintMaterial,
    potBody,
    -31,
    -14,
    30,
  );
  potGlint.rotation.z = -0.19;

  const greeting = createBeanGreeting(scene, coffee);
  const flood = createFlood(scene);
  canvas.dataset.greeting = "coffee-beans";
  canvas.dataset.greetingDrops = String(greeting.count);
  const puddle = mesh(new THREE.SphereGeometry(1, 48, 20), coffee, scene);
  const puddleRim = mesh(
    new THREE.TorusGeometry(1, 0.014, 8, 64),
    crema,
    scene,
  );
  const dropGeometry = new THREE.SphereGeometry(1, 12, 8);
  const drops = new THREE.InstancedMesh(dropGeometry, coffee, 180);
  resources.add(dropGeometry);
  scene.add(drops);
  drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  drops.frustumCulled = false;
  const dummy = new THREE.Object3D();

  // Stream topology stays allocated. Each frame only updates vertex positions.
  const streams = [];
  function makeStream() {
    const segments = 48,
      sides = 8;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array((segments + 1) * (sides + 1) * 3);
    const indices = [];
    for (let i = 0; i < segments; i++)
      for (let j = 0; j < sides; j++) {
        const a = i * (sides + 1) + j,
          b = a + sides + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setIndex(indices);
    const object = mesh(geometry, coffee, scene);
    object.frustumCulled = false;
    const curve = new THREE.CubicBezierCurve3(V(), V(), V(), V());
    const stream = { object, curve, positions, segments, sides };
    streams.push(stream);
    return stream;
  }
  for (let i = 0; i < 7; i++) makeStream();
  const gatheringStream = makeStream();
  const tangent = V(),
    normal = V(),
    binormal = V(),
    center = V();
  function updateStream(stream, a, b, flow, t, radius, overflow = false) {
    stream.object.visible = flow > 0.001;
    if (!stream.object.visible) return;
    const curve = stream.curve;
    curve.v0.copy(a);
    curve.v3.copy(b);
    if (overflow === "gather") {
      curve.v1.set(mix(a.x, b.x, 0.35), a.y + 40, a.z + 30);
      curve.v2.set(b.x - 90, b.y + 90, b.z + 10);
    } else if (overflow) {
      curve.v1.set(a.x, a.y - 23, a.z + 8);
      curve.v2.set(b.x, b.y + 22, b.z + 10);
    } else {
      curve.v1.set(a.x - 10, a.y - 19, a.z);
      curve.v2.set(b.x + 7, mix(a.y, b.y, 0.65), b.z);
    }
    for (let i = 0; i <= stream.segments; i++) {
      const u = (i / stream.segments) * flow;
      curve.getPoint(u, center);
      curve.getTangent(u, tangent).normalize();
      normal.crossVectors(tangent, V(0, 0, 1)).normalize();
      binormal.crossVectors(tangent, normal).normalize();
      const wave =
        Math.sin(u * 29 - t * 8) * 0.12 + Math.sin(u * 61 - t * 11) * 0.055;
      const r = radius * (1 - u * 0.28 + wave);
      center.x += Math.sin(t * 4 + u * 22) * Math.sin(u * Math.PI) * 1.25;
      for (let j = 0; j <= stream.sides; j++) {
        const angle = (j / stream.sides) * Math.PI * 2;
        const offset = (i * (stream.sides + 1) + j) * 3;
        stream.positions[offset] =
          center.x +
          r * (normal.x * Math.cos(angle) + binormal.x * Math.sin(angle));
        stream.positions[offset + 1] =
          center.y +
          r * (normal.y * Math.cos(angle) + binormal.y * Math.sin(angle));
        stream.positions[offset + 2] =
          center.z +
          r * (normal.z * Math.cos(angle) + binormal.z * Math.sin(angle));
      }
    }
    stream.object.geometry.attributes.position.needsUpdate = true;
    stream.object.geometry.computeVertexNormals();
  }

  let layout = { cups: [], greeting: null, pot: null };
  let measured = false;
  let disposed = false;
  let elapsed = initialTime || 0;
  let floodSeconds = initialFloodTime;
  let flowOrigin = null;
  let listSignature = null;
  let lastSimTime = elapsed;
  let pageHeight = 0;
  let previousNow = performance.now();
  let previousPhase = "";
  let frameId;
  let lastRender = 0;
  let lastFrameKey = "";
  const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motionQuery.matches;
  const rect = (element) => {
    if (!element) return null;
    const r = element.getBoundingClientRect();
    return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height, element };
  };
  function measure() {
    if (disposed) return;
    renderer.setSize(innerWidth, innerHeight, false);
    camera.right = innerWidth;
    camera.bottom = -innerHeight;
    camera.updateProjectionMatrix();
    layout = {
      greeting: rect(document.querySelector("[data-coffee-greeting]")),
      pot: rect(document.querySelector("[data-coffee-pot]")),
      cups: [...document.querySelectorAll("[data-coffee-cup]")].map(rect),
    };
    const signature = layout.cups
      .map((cup) => cup.element.dataset.note)
      .join("/");
    if (
      listSignature !== null &&
      listSignature !== signature &&
      elapsed > 11.05
    ) {
      flowOrigin = elapsed;
      floodSeconds = 0;
      onFloodTime?.(0);
    }
    listSignature = signature;
    pageHeight = document.documentElement.scrollHeight;
    flood.measure();
    measured = true;
  }
  const resize = new ResizeObserver(() => {
    measured = false;
  });
  resize.observe(document.querySelector(".site-shell"));
  const resizeHandler = () => {
    measured = false;
  };
  window.addEventListener("resize", resizeHandler);
  const motionHandler = () => {
    reduced = motionQuery.matches;
    onStatus(reduced ? "static" : "ready");
  };
  motionQuery.addEventListener("change", motionHandler);
  const contextLost = (e) => {
    e.preventDefault();
    flood.update({ waterY: Infinity, t: 0, active: false });
    onStatus("unavailable");
    onPhase("flowing");
  };
  canvas.addEventListener("webglcontextlost", contextLost);
  onStatus(reduced ? "static" : "ready");

  function animate(now) {
    if (disposed) return;
    frameId = requestAnimationFrame(animate);
    const delta = Math.min((now - previousNow) / 1000, 0.07);
    previousNow = now;
    if (document.hidden) return;
    const state = getState();
    if (!state.paused && !reduced) elapsed += delta;
    const frameKey = `${innerWidth}/${innerHeight}/${scrollY}/${state.paused}/${reduced}`;
    if ((state.paused || reduced) && measured && frameKey === lastFrameKey)
      return;
    lastFrameKey = frameKey;
    // 40 fps cap keeps a long page quiet on integrated laptop GPUs.
    if (now - lastRender < 25 && !reduced) return;
    lastRender = now;
    if (!measured) measure();
    const t = reduced ? 40 : elapsed;
    onTime(elapsed);
    const phase = reduced ? "flowing" : getPhase(t);
    if (phase !== previousPhase) {
      previousPhase = phase;
      onPhase(phase);
    }
    const simDelta = elapsed - lastSimTime;
    lastSimTime = elapsed;
    const flowTime = flowOrigin === null ? t : t - flowOrigin + 11.05;
    const sy = scrollY;
    const g = layout.greeting;
    const p = layout.pot;
    if (!g || !p) return;

    const floorY = g.y + g.h - 2;
    const puddleX = g.x + Math.min(g.w * 0.47, 285);
    const restingPot = V(p.x + p.w * 0.45, -(p.y + p.h * 0.47 - sy), 15);
    const potScale = innerWidth <= 540 ? 0.6 : innerWidth <= 800 ? 1.1 : 1.48;
    const firstCup = layout.cups[0];
    const cupScale = firstCup ? firstCup.w / 90 : 1;
    const pourScale = 0.95 * cupScale;
    const pourTarget = firstCup
      ? V(
          firstCup.x + firstCup.w / 2 + 68 * cupScale,
          -(firstCup.y - 65 * cupScale - sy),
          35,
        )
      : restingPot;
    const approach = reduced || !firstCup ? 0 : smooth(9.6, 11.1, t);
    pot.position.copy(restingPot).lerp(pourTarget, approach);
    pot.scale.setScalar(mix(potScale, pourScale, approach));
    pot.rotation.z = 0.62 * smooth(10.4, 11.4, t) * approach;
    pot.rotation.y = -0.18;
    const lidLift = smooth(7.3, 7.8, t) * (1 - smooth(9.3, 9.8, t));
    lid.position.set(lidLift * 28, lidLift * 25, 0);
    lid.rotation.z = -lidLift * 0.28;
    pot.visible = -pot.position.y > -180 && -pot.position.y < innerHeight + 180;
    const potFill = reduced
      ? 0.13
      : mix(0.04, 0.72, smooth(7.8, 9.6, t)) *
        (1 - 0.2 * smooth(11.3, 14.3, t));
    potLiquid.scale.y = potFill;
    potLiquid.position.y = -40 + 24.5 * potFill;
    potSurface.position.y = -40 + 49 * potFill;
    potSurface.scale.setScalar(mix(0.89, 1, potFill));
    potFoam.position.y = potSurface.position.y + 0.3;
    potFoam.scale.setScalar(mix(0.91, 1, potFill));
    pot.updateMatrixWorld(true);

    greeting.update({
      t,
      g,
      sy,
      floorY,
      puddleX,
      target: potBody.localToWorld(V(0, 46, 0)),
      reduced,
    });
    const poolIn = smooth(5.45, 7.15, t),
      poolOut = smooth(7.7, 9.55, t);
    const poolAmount = poolIn * (1 - poolOut);
    puddle.visible = poolAmount > 0.002 && !reduced;
    puddle.position.set(puddleX, -(floorY - sy), 10);
    puddle.scale.set(
      Math.max(0.1, g.w * 0.35 * poolAmount),
      4 + poolAmount * 5,
      7,
    );
    puddleRim.visible = puddle.visible;
    puddleRim.position.copy(puddle.position);
    puddleRim.position.z += 4;
    puddleRim.scale.set(puddle.scale.x * 0.92, puddle.scale.y * 0.8, 1);
    const gatherFlow = smooth(7.65, 8.1, t) * (1 - smooth(9.1, 9.6, t));
    if (gatherFlow > 0.001 && !reduced) {
      const a = puddle.position.clone();
      const b = potBody.localToWorld(V(-2, 20, 0));
      updateStream(gatheringStream, a, b, gatherFlow, t, 4.4, "gather");
    } else gatheringStream.object.visible = false;

    let dropCount = 0;
    const putDrop = (x, y, z, r, s = 1) => {
      dummy.position.set(x, y, z);
      dummy.scale.set(r, r * s, r);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      drops.setMatrixAt(dropCount++, dummy.matrix);
    };
    cupModels.forEach((cup, index) => {
      const anchor = layout.cups[index];
      cup.group.visible = !!anchor;
      cup.shadow.visible = !!anchor;
      if (!anchor) return;
      const scale = anchor.w / 90;
      const cx = anchor.x + anchor.w / 2,
        cy = anchor.y + 55;
      cup.group.position.set(cx, -(cy - sy), 20);
      cup.group.scale.setScalar(scale);
      cup.group.updateMatrixWorld(true);
      cup.shadow.position.set(cx + 3, -(cy + 35 * scale - sy), -40);
      cup.shadow.scale.set(1.15 * scale, 0.17 * scale, 1);
      const { fill, overflow } = getCupState(flowTime, index, reduced);
      const filled = fill > 0.5 ? "true" : "false";
      if (anchor.element.dataset.filled !== filled)
        anchor.element.dataset.filled = filled;
      const height = Math.max(0.01, fill * 55);
      cup.liquid.visible = fill > 0.001;
      cup.surface.visible = cup.liquid.visible;
      cup.foam.visible = cup.liquid.visible;
      cup.liquid.scale.y = height;
      cup.liquid.scale.x = cup.liquid.scale.z = mix(0.77, 1, fill);
      cup.liquid.position.y = -26 + height / 2;
      const topY = -26 + height;
      cup.surface.position.y = topY + 0.15;
      cup.surface.scale.setScalar(mix(0.77, 1, fill));
      const positions = cup.surface.geometry.attributes.position;
      for (let j = 0; j < positions.count; j++) {
        const x = cup.surfaceOriginal[j * 3],
          z = cup.surfaceOriginal[j * 3 + 2];
        positions.setY(
          j,
          reduced
            ? 0
            : Math.sin(x * 0.18 + t * 3.1) * 0.45 +
                Math.cos(z * 0.2 + t * 2.5) * 0.35,
        );
      }
      positions.needsUpdate = true;
      cup.foam.position.y = topY + 0.55;
      cup.foam.scale.setScalar(mix(0.77, 1, fill));
      const ripplePhase = (t * 0.68 + index * 0.3) % 1;
      cup.ripple.visible = fill > 0.06 && !reduced;
      cup.ripple.position.y = topY + 1;
      cup.ripple.scale.setScalar(3 + ripplePhase * 23);
      cup.ripple.material.opacity = (1 - ripplePhase) * 0.28;
      cup.drop.visible = overflow > 0.01;
      cup.drop.position.set(0, 29, 31);
      cup.drop.scale.set(1, 1 + Math.sin(t * 7) * 0.15, 1);
      // Tiny ballistic splashes, only at a receiving liquid surface.
      const incoming =
        index === 0
          ? flowTime > 11.25
          : getCupState(flowTime, index - 1, reduced).overflow > 0;
      if (incoming && fill > 0.03 && !reduced)
        for (let j = 0; j < 8; j++) {
          const age = (t * 1.35 + j * 0.137 + index * 0.21) % 1;
          const angle = seed(j + index * 8) * Math.PI * 2;
          const pt = cup.group.localToWorld(
            V(
              Math.cos(angle) * age * 15,
              topY + Math.sin(age * Math.PI) * 9,
              Math.sin(angle) * age * 12,
            ),
          );
          putDrop(
            pt.x,
            pt.y,
            pt.z,
            Math.max(0.15, 0.85 * (1 - age)) * scale,
            1.25,
          );
        }
    });
    drops.count = dropCount;
    drops.visible = dropCount > 0;
    drops.instanceMatrix.needsUpdate = true;

    if (
      !reduced &&
      layout.cups.length &&
      flowTime >= getFloodStart(layout.cups.length)
    )
      floodSeconds += simDelta;
    onFloodTime?.(floodSeconds);
    const floodLevel = layout.cups.length
      ? getFloodLevel(floodSeconds, reduced)
      : 0;
    const waterY = pageHeight * (1 - floodLevel) - 12 * floodLevel;
    flood.update({ waterY, t, active: floodLevel > 0 });
    canvas.dataset.floodLevel = floodLevel.toFixed(4);
    const levelLabel = document.querySelector("[data-coffee-level]");
    if (levelLabel) levelLabel.textContent = Math.round(floodLevel * 100) + "%";
    for (let i = 0; i < 6; i++) {
      const current = cupModels[i],
        next = cupModels[i + 1];
      const anchor = layout.cups[i];
      const amount = anchor ? getCupState(flowTime, i, reduced).overflow : 0;
      if (amount > 0) {
        const a = current.group.localToWorld(V(0, 29, 31));
        let b;
        if (layout.cups[i + 1] && next) {
          const nextFill = getCupState(flowTime, i + 1, reduced).fill;
          b = next.group.localToWorld(V(0, -26 + 55 * nextFill, 8));
        } else {
          b = V(a.x, -(waterY + 10 - sy), 25);
        }
        if (b.y < a.y)
          updateStream(
            streams[i],
            a,
            b,
            amount,
            t,
            3.6 * current.group.scale.x,
            true,
          );
        else streams[i].object.visible = false;
      } else streams[i].object.visible = false;
    }
    const pourAmount = getPourAmount(flowTime, reduced);
    canvas.dataset.pouring = firstCup && pourAmount > 0 ? "true" : "false";
    if (firstCup && pourAmount > 0) {
      const spout = potBody.localToWorld(V(-65, 37, 0));
      const level = getCupState(flowTime, 0).fill;
      const target = cupModels[0].group.localToWorld(V(0, -26 + 55 * level, 5));
      updateStream(streams[6], spout, target, pourAmount, t, 3.2);
    } else streams[6].object.visible = false;
    renderer.render(scene, camera);
  }
  measure();
  frameId = requestAnimationFrame(animate);
  return {
    measure: () => {
      measured = false;
    },
    restart: () => {
      elapsed = 0;
      lastSimTime = 0;
      floodSeconds = 0;
      flowOrigin = null;
      onFloodTime?.(0);
      measured = false;
      previousPhase = "";
    },
    drain: () => {
      floodSeconds = 0;
      onFloodTime?.(0);
      measured = false;
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      resize.disconnect();
      window.removeEventListener("resize", resizeHandler);
      motionQuery.removeEventListener("change", motionHandler);
      canvas.removeEventListener("webglcontextlost", contextLost);
      greeting.dispose();
      flood.dispose();
      drops.dispose();
      resources.forEach((resource) => resource.dispose());
      environment.dispose();
      renderer.dispose();
    },
  };
}
