// ============================================
// GLASS BUBBLE — Three.js Cursor Effect
// Bubble Theme Only
//
// A physically-based glass sphere that follows
// the cursor using lerp interpolation. Uses:
//  - MeshPhysicalMaterial (transmission, IOR)
//  - Simplex noise vertex displacement (organic wobble)
//  - Fresnel-style point lights (cyan + violet)
//  - RoomEnvironment for glass reflections
//  - requestAnimationFrame lerp tracking
// ============================================

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Simplex 3D noise GLSL — injected into the vertex shader
const SIMPLEX_NOISE_GLSL = /* glsl */ `
  vec3 mod289_3(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 mod289_4(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 permute4(vec4 x) { return mod289_4(((x*34.0)+10.0)*x); }
  vec4 taylorInvSqrt4(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g  = step(x0.yzx, x0.xyz);
    vec3 l  = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289_3(i);
    vec4 p = permute4(permute4(permute4(
      i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
      i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
      i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 xs = x_ * ns.x + ns.yyyy;
    vec4 ys = y_ * ns.x + ns.yyyy;
    vec4 h  = 1.0 - abs(xs) - abs(ys);
    vec4 b0 = vec4(xs.xy, ys.xy);
    vec4 b1 = vec4(xs.zw, ys.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt4(vec4(
      dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(
      dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(
      dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
`;

const LERP = 0.09; // How fast the bubble follows the mouse (0 = frozen, 1 = instant)

// Convert NDC mouse coords [-1,+1] to Three.js world position at Z=0
function ndcToWorld(
  ndcX: number,
  ndcY: number,
  camera: THREE.PerspectiveCamera
): THREE.Vector3 {
  const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
  vec.unproject(camera);
  const dir = vec.sub(camera.position).normalize();
  const distance = -camera.position.z / dir.z;
  return camera.position.clone().add(dir.multiplyScalar(distance));
}

const GlassBubble: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── RENDERER ────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);

    // ── SCENE & CAMERA ───────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.z = 6;

    // ── ENVIRONMENT MAP (glass reflections) ──────────
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmrem.dispose();

    // ── GLASS MATERIAL WITH NOISE VERTEX SHADER ──────
    const material = new THREE.MeshPhysicalMaterial({
      transmission: 1.0,
      roughness: 0.02,
      metalness: 0.0,
      thickness: 0.8,
      ior: 1.45,
      envMapIntensity: 2.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      attenuationColor: new THREE.Color(0x99c4ff),
      attenuationDistance: 0.4,
      side: THREE.FrontSide,
    });

    // Inject noise + uTime uniform into the vertex shader
    let shaderUniforms: { uTime: { value: number } } | null = null;

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shaderUniforms = shader.uniforms as typeof shaderUniforms;

      // Prepend noise helpers
      shader.vertexShader = SIMPLEX_NOISE_GLSL + "\nuniform float uTime;\n" + shader.vertexShader;

      // Displace vertices along their normals using noise
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        /* glsl */ `
        vec3 transformed = position;
        float n = snoise(normalize(position) * 2.0 + uTime * 0.3);
        transformed += normal * n * 0.12;
        `
      );
    };

    // ── SPHERE ───────────────────────────────────────
    const geometry = new THREE.SphereGeometry(1.3, 128, 128);
    const sphere = new THREE.Mesh(geometry, material);
    // Place off-screen until mouse enters
    sphere.position.set(9999, 9999, 0);
    scene.add(sphere);

    // ── LIGHTING ─────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // Cyan key light — bubble theme primary
    const cyanLight = new THREE.PointLight(0x60a5fa, 6, 15);
    cyanLight.position.set(4, 3, 4);
    scene.add(cyanLight);

    // Violet fill light — bubble theme secondary
    const violetLight = new THREE.PointLight(0xa78bfa, 4, 15);
    violetLight.position.set(-4, -2, 3);
    scene.add(violetLight);

    // Warm rim light — adds depth
    const rimLight = new THREE.PointLight(0xffffff, 2, 10);
    rimLight.position.set(0, 4, 2);
    scene.add(rimLight);

    // ── MOUSE TRACKING ───────────────────────────────
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let entered = false;
    let opacity = 0; // Used to fade the canvas in/out

    const onMouseMove = (e: MouseEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = -(e.clientY / window.innerHeight) * 2 + 1;
      if (!entered) {
        current.x = target.x;
        current.y = target.y;
        entered = true;
      }
    };

    const onMouseLeave = () => {
      entered = false;
    };

    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);

    // ── ANIMATION LOOP ───────────────────────────────
    let rafId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Update noise uniform
      if (shaderUniforms) shaderUniforms.uTime.value = t;

      // Fade in/out canvas opacity
      opacity += (entered ? 1 : 0 - opacity) * 0.06;
      mount.style.opacity = String(Math.max(0, Math.min(1, opacity)));

      if (entered || opacity > 0.01) {
        // Lerp cursor position
        current.x += (target.x - current.x) * LERP;
        current.y += (target.y - current.y) * LERP;

        // Map NDC → world position
        const worldPos = ndcToWorld(current.x, current.y, camera);
        sphere.position.lerp(worldPos, 0.15);

        // Gentle rotation for organic feel
        sphere.rotation.x = t * 0.06;
        sphere.rotation.y = t * 0.09;

        // Animate lights orbiting the sphere for dynamic reflections
        cyanLight.position.set(
          sphere.position.x + Math.sin(t * 0.7) * 3,
          sphere.position.y + Math.cos(t * 0.5) * 2.5,
          sphere.position.z + 3
        );
        violetLight.position.set(
          sphere.position.x + Math.cos(t * 0.6) * 3,
          sphere.position.y + Math.sin(t * 0.8) * 2.5,
          sphere.position.z + 3
        );
      }

      renderer.render(scene, camera);
    };

    animate();

    // ── RESIZE ───────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // ── CLEANUP ──────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", onResize);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      envTexture.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 9999,
        opacity: 0,
      }}
    />
  );
};

export default GlassBubble;
