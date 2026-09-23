import * as THREE from "three";

export function getInkCoverage(top, height, waterline) {
  return Math.max(0, Math.min(1, (top + height - waterline) / height));
}

export function createFlood(scene) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uHeight: { value: 1 },
      uWidth: { value: 1 },
    },
    vertexShader: `varying vec2 vUv;
      void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uHeight; uniform float uWidth;
      void main(){
        float x=vUv.x*uWidth;
        float wave=5.0+sin(x*.013+uTime*1.4)*2.5+sin(x*.032-uTime*1.8)*1.6;
        float depth=(1.0-vUv.y)*uHeight-wave;
        if(depth<0.0)discard;
        vec3 top=vec3(.085,.043,.026), bottom=vec3(.032,.015,.011);
        vec3 color=mix(top,bottom,smoothstep(0.0,420.0,depth));
        float foam=(1.0-smoothstep(1.0,3.6,depth))*.3;
        color=mix(color,vec3(.36,.23,.14),foam);
        color+=vec3(.008,.004,.002)*sin(x*.011+uTime)*exp(-depth*.027);
        gl_FragColor=vec4(color,1.0);
        #include <colorspace_fragment>
      }`,
  });
  const water = new THREE.Mesh(geometry, material);
  water.frustumCulled = false;
  // The opaque pass draws the flood before the pot, cups, and falling coffee.
  water.position.z = -200;
  water.renderOrder = -10;
  water.visible = false;
  scene.add(water);
  let readable = [];
  let inkNodes = [];
  const dryInk = new WeakMap();
  const inkSelector = "h1,h2,h3,p,span,a,button,time,em,small";
  return {
    measure() {
      readable = [
        ...document.querySelectorAll(
          ".site-header,.hero-topline,.hero-copy,.hero-bottom,.sidebar-sticky,.list-toolbar,.pour-station,.post-link,.pagination,.site-footer,.empty-state",
        ),
      ];
      inkNodes.forEach((node) => node.classList.remove("coffee-ink"));
      inkNodes = [...new Set(readable.flatMap((node) => [
        ...(node.matches(inkSelector) ? [node] : []),
        ...node.querySelectorAll(inkSelector),
      ]))].filter((node) => [...node.childNodes].some((child) =>
        child.nodeType === Node.TEXT_NODE && child.textContent.trim(),
      ));
      inkNodes.forEach((node) => {
        if (!dryInk.has(node)) dryInk.set(node, getComputedStyle(node).color);
      });
    },
    update({ waterY, pageHeight = document.documentElement.scrollHeight, t, active }) {
      const top = waterY - scrollY;
      const height = Math.max(1, pageHeight - waterY + 15);
      water.visible = active && waterY < pageHeight;
      water.position.set(innerWidth / 2, -(top + height / 2), -200);
      water.scale.set(innerWidth, height, 1);
      material.uniforms.uTime.value = t;
      material.uniforms.uHeight.value = height;
      material.uniforms.uWidth.value = innerWidth;
      for (const node of inkNodes) {
        const rect = node.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const wave = 5 + Math.sin(x * .013 + t * 1.4) * 2.5
          + Math.sin(x * .032 - t * 1.8) * 1.6;
        const coverage = active ? getInkCoverage(rect.top, rect.height, top + wave) : 0;
        const covered = coverage > 0;
        if (covered) {
          node.style.setProperty("--coffee-cut", `${(1 - coverage) * 100}%`);
          node.style.setProperty("--coffee-dry-ink", dryInk.get(node));
        }
        node.classList.toggle("coffee-ink", covered);
      }
      for (const node of readable) {
        const rect = node.getBoundingClientRect();
        node.classList.toggle(
          "under-coffee",
          active && rect.top + rect.height * 0.5 > top + 6,
        );
      }
    },
    dispose() {
      readable.forEach((node) => node.classList.remove("under-coffee"));
      inkNodes.forEach((node) => node.classList.remove("coffee-ink"));
      scene.remove(water);
      geometry.dispose();
      material.dispose();
    },
  };
}
