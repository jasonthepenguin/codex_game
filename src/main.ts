import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// Scene & Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x040012, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 5);

// Controls (Pointer Lock)
const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());

const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start');

startBtn?.addEventListener('click', () => controls.lock());

controls.addEventListener('lock', () => {
  overlay?.classList.add('hidden');
});

controls.addEventListener('unlock', () => {
  overlay?.classList.remove('hidden');
});

// Lights
const hemi = new THREE.HemisphereLight(0xff00ff, 0x00ffff, 0.6);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5, 10, 7);
scene.add(dir);

// World geometry helpers
const psychedelicMeshes: THREE.Mesh[] = [];

function addWorld() {
  // Floor
  const floorGeo = new THREE.PlaneGeometry(400, 400, 100, 100);
  floorGeo.rotateX(-Math.PI / 2);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x06000c, metalness: 0.1, roughness: 0.9 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.receiveShadow = true;
  scene.add(floor);

  // Grid overlay
  const grid = new THREE.GridHelper(400, 120, 0xff00ff, 0x00ffff);
  (grid.material as THREE.LineBasicMaterial).opacity = 0.25;
  (grid.material as THREE.LineBasicMaterial).transparent = true;
  scene.add(grid);

  // Pillars ring
  const pillarGeo = new THREE.CylinderGeometry(0.8, 0.8, 12, 24);
  for (let i = 0; i < 36; i++) {
    const hue = i / 36;
    const color = new THREE.Color().setHSL(hue, 0.9, 0.5);
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color.clone().multiplyScalar(0.2), emissiveIntensity: 1.0, metalness: 0.4, roughness: 0.4 });
    const m = new THREE.Mesh(pillarGeo, mat);
    const radius = 40 + Math.sin(i * 0.5) * 6;
    const a = (i / 36) * Math.PI * 2;
    m.position.set(Math.cos(a) * radius, 6, Math.sin(a) * radius);
    m.userData.baseHue = hue;
    psychedelicMeshes.push(m);
    scene.add(m);
  }

  // Floating shapes
  const shapes = [
    new THREE.TorusKnotGeometry(1.2, 0.4, 120, 16),
    new THREE.IcosahedronGeometry(1.6, 1),
    new THREE.TorusGeometry(1.6, 0.5, 24, 64)
  ];
  for (let i = 0; i < 120; i++) {
    const g = shapes[Math.floor(Math.random() * shapes.length)];
    const hue = Math.random();
    const color = new THREE.Color().setHSL(hue, 0.85, 0.55);
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color.clone().multiplyScalar(0.15), emissiveIntensity: 1.2, metalness: 0.3, roughness: 0.35 });
    const m = new THREE.Mesh(g, mat);
    m.position.set((Math.random() - 0.5) * 160, 2 + Math.random() * 40, (Math.random() - 0.5) * 160);
    m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    m.scale.setScalar(0.6 + Math.random() * 2.2);
    m.userData.baseHue = hue;
    psychedelicMeshes.push(m);
    scene.add(m);
  }
}

addWorld();

// Post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.15, 0.4, 0.2);
composer.addPass(bloomPass);

const rgbShiftPass = new ShaderPass(RGBShiftShader);
const BASE_RGB_SHIFT = 0.0015;
const GLITCH_RGB_SHIFT = 0.004;
rgbShiftPass.uniforms['amount'].value = BASE_RGB_SHIFT;
composer.addPass(rgbShiftPass);

const filmPass = new FilmPass(0.35, 0.025, 648, false);
composer.addPass(filmPass);
filmPass.enabled = true; // always on

const glitchPass = new GlitchPass();
glitchPass.enabled = false; // auto-pulsed below
composer.addPass(glitchPass);

// Movement
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let isSprinting = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();
const BASE_SPEED = 22;
const SPRINT_MULTIPLIER = 1.8;

const onKeyDown = (event: KeyboardEvent) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW': moveForward = true; break;
    case 'ArrowLeft':
    case 'KeyA': moveLeft = true; break;
    case 'ArrowDown':
    case 'KeyS': moveBackward = true; break;
    case 'ArrowRight':
    case 'KeyD': moveRight = true; break;
    case 'ShiftLeft':
    case 'ShiftRight': isSprinting = true; break;
  }
};

const onKeyUp = (event: KeyboardEvent) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW': moveForward = false; break;
    case 'ArrowLeft':
    case 'KeyA': moveLeft = false; break;
    case 'ArrowDown':
    case 'KeyS': moveBackward = false; break;
    case 'ArrowRight':
    case 'KeyD': moveRight = false; break;
    case 'ShiftLeft':
    case 'ShiftRight': isSprinting = false; break;
  }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// Glitch pulse scheduling (mild): ~0.25s every 15s
const glitchInterval = 15; // seconds
const glitchDuration = 0.25; // seconds
let nextGlitchAt = glitchInterval;
let glitchOffAt = 0;

function animate() {
  const delta = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  // Cycle fog and background subtly for a dreamy vibe
  const bgHue = (t * 0.03) % 1;
  const bg = new THREE.Color().setHSL(bgHue, 0.2, 0.04);
  scene.background = bg;
  scene.fog!.color.lerp(bg, 0.1);

  // Animate colors + rotations
  for (const m of psychedelicMeshes) {
    m.rotation.x += 0.1 * delta;
    m.rotation.y += 0.2 * delta;
    const hue = (m.userData.baseHue + t * 0.05) % 1;
    const c = new THREE.Color().setHSL(hue, 0.9, 0.5);
    const mat = m.material as THREE.MeshStandardMaterial;
    mat.color.copy(c);
    mat.emissive.copy(c).multiplyScalar(0.15 + 0.25 * (0.5 + 0.5 * Math.sin(t * 0.8)));
  }

  // Auto glitch pulse
  if (t >= nextGlitchAt && !glitchPass.enabled) {
    glitchPass.enabled = true; // no goWild for subtle effect
    rgbShiftPass.uniforms['amount'].value = GLITCH_RGB_SHIFT;
    glitchOffAt = t + glitchDuration;
    nextGlitchAt = t + glitchInterval;
  }
  if (glitchPass.enabled && t >= glitchOffAt) {
    glitchPass.enabled = false;
    rgbShiftPass.uniforms['amount'].value = BASE_RGB_SHIFT;
  }

  // FPS movement when locked
  if (controls.isLocked) {
    const speed = BASE_SPEED * (isSprinting ? SPRINT_MULTIPLIER : 1); // base/sprint speed
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
  }

  composer.render();
  requestAnimationFrame(animate);
}

animate();

// Resize handling
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});
