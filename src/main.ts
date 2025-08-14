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
const desertMeshes: THREE.Mesh[] = [];
const angels: THREE.Group[] = [];
let portal: THREE.Mesh;
let isDesertMode = false;
let psychedelicWorld: THREE.Group;
let desertWorld: THREE.Group;
let hasLeftPortal = true; // Track if player has left portal area

function addWorld() {
  // Create psychedelic world group
  psychedelicWorld = new THREE.Group();
  scene.add(psychedelicWorld);

  // Floor
  const floorGeo = new THREE.PlaneGeometry(400, 400, 100, 100);
  floorGeo.rotateX(-Math.PI / 2);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x06000c, metalness: 0.1, roughness: 0.9 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.receiveShadow = true;
  psychedelicWorld.add(floor);

  // Grid overlay
  const grid = new THREE.GridHelper(400, 120, 0xff00ff, 0x00ffff);
  (grid.material as THREE.LineBasicMaterial).opacity = 0.25;
  (grid.material as THREE.LineBasicMaterial).transparent = true;
  psychedelicWorld.add(grid);

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
    psychedelicWorld.add(m);
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
    psychedelicWorld.add(m);
  }
}

// Create desert world
function createDesertWorld() {
  desertWorld = new THREE.Group();
  desertWorld.visible = false; // Start hidden
  scene.add(desertWorld);

  // Sandy desert floor
  const sandGeo = new THREE.PlaneGeometry(400, 400, 200, 200);
  sandGeo.rotateX(-Math.PI / 2);
  
  // Add some height variation for dunes
  const vertices = sandGeo.attributes.position.array;
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const z = vertices[i + 2];
    vertices[i + 1] = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 2 + Math.random() * 0.5;
  }
  sandGeo.computeVertexNormals();
  
  const sandMat = new THREE.MeshStandardMaterial({ 
    color: 0xd2b48c,
    roughness: 1,
    metalness: 0
  });
  const sand = new THREE.Mesh(sandGeo, sandMat);
  sand.receiveShadow = true;
  desertWorld.add(sand);

  // Create pyramids
  const pyramidGeo = new THREE.ConeGeometry(20, 25, 4);
  pyramidGeo.rotateY(Math.PI / 4);
  
  // Main pyramid cluster
  const pyramidPositions = [
    { x: 0, z: -50, scale: 1 },
    { x: -30, z: -40, scale: 0.7 },
    { x: 30, z: -45, scale: 0.8 },
    { x: 60, z: 20, scale: 0.5 },
    { x: -60, z: 30, scale: 0.6 }
  ];

  pyramidPositions.forEach(pos => {
    const pyramidMat = new THREE.MeshStandardMaterial({
      color: 0xdaa520,
      roughness: 0.8,
      metalness: 0.1
    });
    const pyramid = new THREE.Mesh(pyramidGeo, pyramidMat);
    pyramid.position.set(pos.x, 12.5 * pos.scale, pos.z);
    pyramid.scale.setScalar(pos.scale);
    pyramid.castShadow = true;
    pyramid.receiveShadow = true;
    desertMeshes.push(pyramid);
    desertWorld.add(pyramid);
  });

  // Add some cacti
  const cactusGeo = new THREE.CylinderGeometry(1, 1.2, 6, 8);
  const cactusMat = new THREE.MeshStandardMaterial({
    color: 0x2d5016,
    roughness: 0.8
  });

  for (let i = 0; i < 20; i++) {
    const cactus = new THREE.Mesh(cactusGeo, cactusMat);
    cactus.position.set(
      (Math.random() - 0.5) * 150,
      3,
      (Math.random() - 0.5) * 150
    );
    cactus.scale.y = 0.5 + Math.random() * 1;
    desertMeshes.push(cactus);
    desertWorld.add(cactus);
  }

  // Add some rocks
  const rockGeo = new THREE.DodecahedronGeometry(2, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x8b7355,
    roughness: 1,
    metalness: 0
  });

  for (let i = 0; i < 40; i++) {
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(
      (Math.random() - 0.5) * 180,
      Math.random() * 1,
      (Math.random() - 0.5) * 180
    );
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rock.scale.setScalar(0.3 + Math.random() * 0.8);
    desertMeshes.push(rock);
    desertWorld.add(rock);
  }
}

addWorld();
createDesertWorld();
createAngels();

// Create biblically accurate angels
function createAngels() {
  // Create 3-4 different types of angels
  
  // Type 1: Ophanim (wheels within wheels with many eyes)
  function createOphanim() {
    const ophanim = new THREE.Group();
    
    // Outer ring
    const outerRingGeo = new THREE.TorusGeometry(4, 0.5, 8, 24);
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffa500,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    ophanim.add(outerRing);
    
    // Inner ring perpendicular
    const innerRing = new THREE.Mesh(outerRingGeo.clone(), outerRingMat.clone());
    innerRing.rotation.x = Math.PI / 2;
    innerRing.scale.setScalar(0.7);
    ophanim.add(innerRing);
    
    // Add eyes around the rings
    const eyeGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1
    });
    
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(
        Math.cos(angle) * 4,
        0,
        Math.sin(angle) * 4
      );
      ophanim.add(eye);
      
      // Add pupils
      const pupilGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.copy(eye.position);
      pupil.position.multiplyScalar(1.02);
      ophanim.add(pupil);
    }
    
    return ophanim;
  }
  
  // Type 2: Seraphim (six wings with eyes)
  function createSeraphim() {
    const seraphim = new THREE.Group();
    
    // Central body (glowing sphere)
    const bodyGeo = new THREE.SphereGeometry(1.5, 32, 32);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffd700,
      emissiveIntensity: 0.8,
      metalness: 0.3,
      roughness: 0.5
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    seraphim.add(body);
    
    // Create wings (3 pairs = 6 wings)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(2, 1, 3, 0);
    wingShape.quadraticCurveTo(2.5, -0.5, 2, -1);
    wingShape.quadraticCurveTo(1, -0.5, 0, 0);
    
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.2,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 2
    });
    
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffd700,
      emissiveIntensity: 0.3,
      metalness: 0.6,
      roughness: 0.4,
      side: THREE.DoubleSide
    });
    
    // Add 6 wings in pairs
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      
      // Right wing
      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.position.set(
        Math.cos(angle) * 1.5,
        Math.sin(angle) * 0.5,
        0
      );
      rightWing.rotation.z = angle;
      seraphim.add(rightWing);
      
      // Left wing (mirrored)
      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.position.set(
        Math.cos(angle + Math.PI) * 1.5,
        Math.sin(angle) * 0.5,
        0
      );
      leftWing.rotation.z = angle + Math.PI;
      leftWing.scale.x = -1;
      seraphim.add(leftWing);
    }
    
    // Add eyes on wings
    const eyeGeo2 = new THREE.SphereGeometry(0.15, 8, 8);
    const eyeMat2 = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1
    });
    for (let i = 0; i < 12; i++) {
      const eye = new THREE.Mesh(eyeGeo2, eyeMat2);
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * 2;
      eye.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 1,
        Math.sin(angle) * radius
      );
      seraphim.add(eye);
    }
    
    return seraphim;
  }
  
  // Type 3: Cherubim (four faces, four wings)
  function createCherubim() {
    const cherubim = new THREE.Group();
    
    // Central cubic body
    const bodyGeo = new THREE.BoxGeometry(2, 2, 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffa500,
      emissiveIntensity: 0.6,
      metalness: 0.5,
      roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    cherubim.add(body);
    
    // Add four faces (one on each side)
    const faceGeo = new THREE.CircleGeometry(0.8, 32);
    const faceMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide
    });
    
    const faces = [
      { pos: [0, 0, 1.01], rot: [0, 0, 0] },
      { pos: [0, 0, -1.01], rot: [0, Math.PI, 0] },
      { pos: [1.01, 0, 0], rot: [0, Math.PI/2, 0] },
      { pos: [-1.01, 0, 0], rot: [0, -Math.PI/2, 0] }
    ];
    
    faces.forEach(faceData => {
      const face = new THREE.Mesh(faceGeo, faceMat);
      face.position.set(...faceData.pos);
      face.rotation.set(...faceData.rot);
      cherubim.add(face);
      
      // Add eyes to each face
      const eyeGeo = new THREE.CircleGeometry(0.15, 16);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.copy(face.position);
      leftEye.position.add(new THREE.Vector3(-0.25, 0.2, 0.02).applyEuler(face.rotation));
      leftEye.rotation.copy(face.rotation);
      cherubim.add(leftEye);
      
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.copy(face.position);
      rightEye.position.add(new THREE.Vector3(0.25, 0.2, 0.02).applyEuler(face.rotation));
      rightEye.rotation.copy(face.rotation);
      cherubim.add(rightEye);
    });
    
    return cherubim;
  }
  
  // Create multiple angels and add to desert world
  const angelTypes = [createOphanim, createSeraphim, createCherubim];
  
  for (let i = 0; i < 6; i++) {
    const createAngel = angelTypes[i % angelTypes.length];
    const angel = createAngel();
    
    // Random starting position high in the sky
    angel.position.set(
      (Math.random() - 0.5) * 200,
      50 + Math.random() * 80,
      (Math.random() - 0.5) * 200
    );
    
    // Random scale
    angel.scale.setScalar(0.8 + Math.random() * 1.5);
    
    // Store initial position for orbit animation
    angel.userData.orbitRadius = 80 + Math.random() * 60;
    angel.userData.orbitSpeed = 0.1 + Math.random() * 0.2;
    angel.userData.orbitOffset = Math.random() * Math.PI * 2;
    angel.userData.floatSpeed = 0.5 + Math.random() * 0.5;
    angel.userData.floatAmount = 5 + Math.random() * 10;
    
    angels.push(angel);
    desertWorld.add(angel);
  }
}

// Create portal
function createPortal() {
  // Create portal group
  const portalGroup = new THREE.Group();
  portalGroup.position.set(0, 0, -15); // Further from player start position
  
  // Create arch frame using extruded shape
  const archShape = new THREE.Shape();
  const outerWidth = 4;
  const outerHeight = 7;
  const innerWidth = 3;
  const innerHeight = 6;
  const archRadius = innerWidth;
  
  // Outer arch
  archShape.moveTo(-outerWidth, 0);
  archShape.lineTo(-outerWidth, outerHeight - archRadius);
  archShape.quadraticCurveTo(-outerWidth, outerHeight, -outerWidth + archRadius, outerHeight);
  archShape.lineTo(outerWidth - archRadius, outerHeight);
  archShape.quadraticCurveTo(outerWidth, outerHeight, outerWidth, outerHeight - archRadius);
  archShape.lineTo(outerWidth, 0);
  archShape.lineTo(-outerWidth, 0);
  
  // Inner cutout (create hole)
  const holePath = new THREE.Path();
  holePath.moveTo(-innerWidth, 0);
  holePath.lineTo(-innerWidth, innerHeight - archRadius);
  holePath.quadraticCurveTo(-innerWidth, innerHeight, 0, innerHeight);
  holePath.quadraticCurveTo(innerWidth, innerHeight, innerWidth, innerHeight - archRadius);
  holePath.lineTo(innerWidth, 0);
  archShape.holes.push(holePath);
  
  const extrudeSettings = {
    depth: 1,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2
  };
  
  const archGeo = new THREE.ExtrudeGeometry(archShape, extrudeSettings);
  
  // Black arch frame
  const archMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    metalness: 0.3,
    roughness: 0.7
  });
  const archFrame = new THREE.Mesh(archGeo, archMat);
  archFrame.position.z = -0.5;
  portalGroup.add(archFrame);
  
  // Create the portal surface (white glowing plane)
  const portalSurfaceGeo = new THREE.PlaneGeometry(6, 8);
  // Cut the plane to match arch shape using a custom shape
  const shape = new THREE.Shape();
  const width = 2.8;
  const height = 5.5;
  shape.moveTo(-width, 0);
  shape.lineTo(-width, height * 0.7);
  shape.quadraticCurveTo(-width, height, 0, height);
  shape.quadraticCurveTo(width, height, width, height * 0.7);
  shape.lineTo(width, 0);
  shape.lineTo(-width, 0);
  
  const portalInnerGeo = new THREE.ShapeGeometry(shape);
  const portalInnerMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });
  const portalInner = new THREE.Mesh(portalInnerGeo, portalInnerMat);
  portalInner.position.z = 0.1; // Slightly in front of arch
  portalGroup.add(portalInner);
  
  // Add glow effect around portal
  const glowGeo = new THREE.PlaneGeometry(6.5, 7);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.y = 3;
  glow.position.z = -0.1;
  portalGroup.add(glow);
  
  // Add base platform
  const baseGeo = new THREE.BoxGeometry(8, 0.5, 2);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 0.2,
    roughness: 0.8
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = -0.25;
  portalGroup.add(base);
  
  scene.add(portalGroup);
  
  // Store reference to the inner portal for animation
  portal = portalInner;
  portal.userData.portalGroup = portalGroup;
  
  // Make portal visible in both worlds by not adding it to either group
  // It exists at the scene level so it's always visible
}

createPortal();

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
const BASE_SPEED = 28;
const SPRINT_MULTIPLIER = 2.2;

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

  // Check portal collision
  const playerPos = camera.position;
  const portalGroupPos = portal.userData.portalGroup ? portal.userData.portalGroup.position : portal.position;
  const portalDistance = playerPos.distanceTo(portalGroupPos);
  
  // Portal collision logic with proper cooldown
  if (portalDistance < 3) {
    // If player is in portal range and has left the portal since last transition
    if (hasLeftPortal) {
      if (!isDesertMode) {
        // Enter desert world
        isDesertMode = true;
        hasLeftPortal = false; // Mark that we need to leave portal before next transition
        
        // Switch worlds
        psychedelicWorld.visible = false;
        desertWorld.visible = true;
        
        // Change environment
        scene.background = new THREE.Color(0x87CEEB); // Sky blue
        scene.fog = new THREE.Fog(0xFFE4B5, 10, 300); // Sandy fog
        hemi.color.setHex(0xFFF8DC); // Warm sky
        hemi.groundColor.setHex(0xD2691E); // Sandy ground
        
        // Reduce bloom for desert (less intense glow)
        bloomPass.strength = 2.5;
        setTimeout(() => { bloomPass.strength = 0.5; }, 500);
        
        // Trigger glitch effect for portal transition
        glitchPass.enabled = true;
        rgbShiftPass.uniforms['amount'].value = GLITCH_RGB_SHIFT * 2; // Extra intense for portal
        setTimeout(() => {
          glitchPass.enabled = false;
          rgbShiftPass.uniforms['amount'].value = BASE_RGB_SHIFT * 1.5; // Desert mode RGB shift
        }, 1000);
      } else {
        // Return to psychedelic world
        isDesertMode = false;
        hasLeftPortal = false; // Mark that we need to leave portal before next transition
        
        // Switch worlds back
        psychedelicWorld.visible = true;
        desertWorld.visible = false;
        
        // Reset to psychedelic environment
        scene.fog = new THREE.FogExp2(0x040012, 0.015);
        hemi.color.setHex(0xff00ff); // Reset hemisphere light colors
        hemi.groundColor.setHex(0x00ffff);
        
        // Increase bloom for transition effect
        bloomPass.strength = 2.5;
        setTimeout(() => { bloomPass.strength = 1.15; }, 500);
        
        // Trigger glitch effect for portal transition
        glitchPass.enabled = true;
        rgbShiftPass.uniforms['amount'].value = GLITCH_RGB_SHIFT * 2; // Extra intense for portal
        setTimeout(() => {
          glitchPass.enabled = false;
          rgbShiftPass.uniforms['amount'].value = BASE_RGB_SHIFT; // Back to normal psychedelic RGB shift
        }, 1000);
      }
    }
  } else if (portalDistance > 4) {
    // Player has moved away from portal, allow next transition
    hasLeftPortal = true;
  }

  // Animate portal - pulsing glow effect
  const portalMat = portal.material as THREE.MeshBasicMaterial;
  portalMat.opacity = 0.9 + Math.sin(t * 3) * 0.1;
  
  // Animate the glow around portal if it exists
  if (portal.userData.portalGroup) {
    const glowMesh = portal.userData.portalGroup.children.find((child: THREE.Mesh) => 
      child.geometry instanceof THREE.PlaneGeometry && child !== portal
    );
    if (glowMesh && glowMesh.material) {
      (glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(t * 2) * 0.1;
    }
  }

  if (isDesertMode) {
    // Animate desert elements
    for (const m of desertMeshes) {
      // Gentle rotation for pyramids
      if (m.geometry instanceof THREE.ConeGeometry) {
        m.rotation.y += 0.01 * delta;
      }
      // Make cacti sway slightly
      else if (m.geometry instanceof THREE.CylinderGeometry) {
        m.rotation.z = Math.sin(t + m.position.x) * 0.05;
      }
      // Rocks slowly rotate
      else if (m.geometry instanceof THREE.DodecahedronGeometry) {
        m.rotation.x += 0.05 * delta;
        m.rotation.y += 0.03 * delta;
      }
    }
    
    // Heat shimmer effect
    rgbShiftPass.uniforms['amount'].value = BASE_RGB_SHIFT * 1.5 + Math.sin(t * 2) * 0.0008;
    
    // Animate angels
    angels.forEach(angel => {
      // Orbital movement
      const orbitAngle = t * angel.userData.orbitSpeed + angel.userData.orbitOffset;
      const orbitX = Math.cos(orbitAngle) * angel.userData.orbitRadius;
      const orbitZ = Math.sin(orbitAngle) * angel.userData.orbitRadius;
      
      // Floating up and down
      const floatY = Math.sin(t * angel.userData.floatSpeed) * angel.userData.floatAmount;
      
      angel.position.x = orbitX;
      angel.position.z = orbitZ;
      angel.position.y = 70 + floatY;
      
      // Rotate the angel itself
      angel.rotation.y += 0.01;
      
      // Special animations for different angel types
      angel.children.forEach((child, index) => {
        // Ophanim - rotating rings
        if (child.geometry instanceof THREE.TorusGeometry) {
          if (index === 0) {
            child.rotation.x += 0.02;
            child.rotation.z += 0.01;
          } else {
            child.rotation.y += 0.025;
            child.rotation.z -= 0.015;
          }
        }
        
        // Seraphim - flapping wings
        if (child.geometry instanceof THREE.ExtrudeGeometry && angel.children.some(c => c.geometry instanceof THREE.SphereGeometry)) {
          const wingFlap = Math.sin(t * 2) * 0.2;
          child.rotation.y = child.userData.baseRotation || child.rotation.y;
          child.rotation.x = wingFlap;
        }
        
        // All angels - pulsing glow on emissive materials
        if (child.material && child.material.emissive) {
          const pulse = 0.5 + Math.sin(t * 1.5 + index) * 0.3;
          child.material.emissiveIntensity = pulse;
        }
      });
    });
  } else {
    // Original psychedelic mode
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
  }

  // Auto glitch pulse
  if (t >= nextGlitchAt && !glitchPass.enabled) {
    glitchPass.enabled = true; // no goWild for subtle effect
    if (!isDesertMode) {
      rgbShiftPass.uniforms['amount'].value = GLITCH_RGB_SHIFT;
    }
    glitchOffAt = t + glitchDuration;
    nextGlitchAt = t + glitchInterval;
  }
  if (glitchPass.enabled && t >= glitchOffAt) {
    glitchPass.enabled = false;
    if (!isDesertMode) {
      rgbShiftPass.uniforms['amount'].value = BASE_RGB_SHIFT;
    }
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
