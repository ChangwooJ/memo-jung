import * as THREE from "three";

export function createFlood(scene) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.ShaderMaterial({
    transparent: true,
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
        vec3 top=vec3(.24,.12,.057), bottom=vec3(.095,.047,.024);
        vec3 color=mix(top,bottom,smoothstep(0.0,420.0,depth));
        float foam=(1.0-smoothstep(1.0,3.6,depth))*.48;
        color=mix(color,vec3(.64,.42,.24),foam);
        color+=vec3(.022,.011,.004)*sin(x*.011+uTime)*exp(-depth*.027);
        gl_FragColor=vec4(color,1.0);
        #include <colorspace_fragment>
      }`,
  });
  const water = new THREE.Mesh(geometry, material);
  water.frustumCulled = false;
  water.position.z = 120;
  water.renderOrder = 20;
  water.visible = false;
  scene.add(water);
  let readable = [];
  return {
    measure() {
      readable = [
        ...document.querySelectorAll(
          ".site-header,.hero-topline,.hero-copy,.hero-bottom,.sidebar-sticky,.list-toolbar,.pour-station,.post-link,.pagination,.site-footer,.empty-state",
        ),
      ];
    },
    update({ waterY, t, active }) {
      const top = waterY - scrollY;
      const height = Math.max(1, innerHeight - top + 15);
      water.visible = active && top < innerHeight;
      water.position.set(innerWidth / 2, -(top + height / 2), 120);
      water.scale.set(innerWidth, height, 1);
      material.uniforms.uTime.value = t;
      material.uniforms.uHeight.value = height;
      material.uniforms.uWidth.value = innerWidth;
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
      scene.remove(water);
      geometry.dispose();
      material.dispose();
    },
  };
}
