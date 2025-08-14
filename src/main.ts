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
// Overlay scene for labels/HUD that should not get post-processing effects
const labelScene = new THREE.Scene();
labelScene.fog = null;
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x040012, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 5);

// Controls (Pointer Lock)
const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());

const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start');
const goalUI = document.getElementById('goal') as HTMLDivElement | null;
const goalItemMark = document.getElementById('goal-item-mark') as HTMLLIElement | null;
const goalItemAngel = document.getElementById('goal-item-angel') as HTMLLIElement | null;
const goalProgress = document.getElementById('goal-progress') as HTMLSpanElement | null;

startBtn?.addEventListener('click', () => controls.lock());

controls.addEventListener('lock', () => {
  overlay?.classList.add('hidden');
  if (goalUI) goalUI.style.display = 'block';
});

controls.addEventListener('unlock', () => {
  overlay?.classList.remove('hidden');
  if (goalUI) goalUI.style.display = 'none';
});

// Coordinates HUD (toggled with "P")
const coordsEl = document.createElement('div');
coordsEl.id = 'coord-hud';
coordsEl.style.position = 'fixed';
coordsEl.style.top = '8px';
coordsEl.style.right = '12px';
coordsEl.style.padding = '6px 8px';
coordsEl.style.background = 'rgba(0, 0, 0, 0.5)';
coordsEl.style.color = '#ffffff';
coordsEl.style.fontFamily = 'monospace';
coordsEl.style.fontSize = '12px';
coordsEl.style.border = '1px solid rgba(255, 255, 255, 0.2)';
coordsEl.style.borderRadius = '4px';
coordsEl.style.zIndex = '10000';
coordsEl.style.pointerEvents = 'none';
coordsEl.style.whiteSpace = 'pre';
coordsEl.style.display = 'none';
document.body.appendChild(coordsEl);

let showCoords = false;

// Lights
const hemi = new THREE.HemisphereLight(0xff00ff, 0x00ffff, 0.6);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5, 10, 7);
scene.add(dir);

// World geometry helpers
const psychedelicMeshes: THREE.Mesh[] = [];
const desertMeshes: THREE.Mesh[] = [];
const chinaMeshes: THREE.Mesh[] = [];
const angels: THREE.Group[] = [];
const angelHalos: THREE.Sprite[] = [];
const sacredSkySprites: THREE.Sprite[] = [];
const marchingFigures: THREE.Group[] = [];
const psychedelicWalkables: THREE.Object3D[] = [];
const desertWalkables: THREE.Object3D[] = [];
const chinaWalkables: THREE.Object3D[] = [];
let portal: THREE.Mesh;
let chinaPortal: THREE.Mesh;
let isDesertMode = false;
let isChinaMode = false;
let psychedelicWorld: THREE.Group;
let desertWorld: THREE.Group;
let chinaWorld: THREE.Group;
// Ground references for raycasting
let psychedelicGround: THREE.Mesh | null = null;
let desertGround: THREE.Mesh | null = null;
let chinaGround: THREE.Mesh | null = null;
let hasLeftPortal = true; // Track if player has left portal area
let hasLeftChinaPortal = true; // Track if player has left china portal area
let staffSprite: THREE.Sprite | null = null;
let staffNameplateSprite: THREE.Sprite | null = null;
let angelSprite: THREE.Sprite | null = null;
let hasCollectedAngel = false;
let hasCollectedMark = false;

type AuraEffect = { sprite: THREE.Sprite; startTime: number; duration: number; baseScale: number };
const auraEffects: AuraEffect[] = [];

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
  psychedelicGround = floor;
  psychedelicWalkables.push(floor);

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
  desertGround = sand;
  desertWalkables.push(sand);

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

// Create Cultural Revolution China world
function createChinaWorld() {
  chinaWorld = new THREE.Group();
  chinaWorld.visible = false; // Start hidden
  scene.add(chinaWorld);

  // Grey concrete ground with road texture
  const groundGeo = new THREE.PlaneGeometry(400, 400, 50, 50);
  groundGeo.rotateX(-Math.PI / 2);
  
  const groundMat = new THREE.MeshStandardMaterial({ 
    color: 0x555555,
    roughness: 0.9,
    metalness: 0.1
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  chinaWorld.add(ground);
  chinaGround = ground;
  chinaWalkables.push(ground);
  
  // Create main roads/streets
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.8,
    metalness: 0.1
  });
  
  // Main avenue (north-south)
  const mainRoadGeo = new THREE.PlaneGeometry(20, 300);
  mainRoadGeo.rotateX(-Math.PI / 2);
  const mainRoad = new THREE.Mesh(mainRoadGeo, roadMat);
  mainRoad.position.y = 0.01;
  chinaWorld.add(mainRoad);
  chinaWalkables.push(mainRoad);
  
  // Cross streets (east-west)
  const crossRoadGeo = new THREE.PlaneGeometry(200, 16);
  crossRoadGeo.rotateX(-Math.PI / 2);
  
  const crossRoad1 = new THREE.Mesh(crossRoadGeo, roadMat);
  crossRoad1.position.set(0, 0.01, -30);
  chinaWorld.add(crossRoad1);
  chinaWalkables.push(crossRoad1);
  
  const crossRoad2 = new THREE.Mesh(crossRoadGeo, roadMat);
  crossRoad2.position.set(0, 0.01, 30);
  chinaWorld.add(crossRoad2);
  chinaWalkables.push(crossRoad2);
  
  // Add road markings
  const markingMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const markingGeo = new THREE.PlaneGeometry(2, 8);
  markingGeo.rotateX(-Math.PI / 2);
  
  for (let i = -140; i < 140; i += 20) {
    const marking = new THREE.Mesh(markingGeo, markingMat);
    marking.position.set(0, 0.02, i);
    chinaWorld.add(marking);
  }
  
  // Sidewalks
  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0x7a7a7a,
    roughness: 0.95,
    metalness: 0
  });
  const sidewalkGeo = new THREE.BoxGeometry(6, 0.2, 300);
  
  const leftSidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
  leftSidewalk.position.set(-13, 0.1, 0);
  chinaWorld.add(leftSidewalk);
  chinaWalkables.push(leftSidewalk);
  
  const rightSidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
  rightSidewalk.position.set(13, 0.1, 0);
  chinaWorld.add(rightSidewalk);
  chinaWalkables.push(rightSidewalk);

  // Create marching figures
  function createMarchingFigure() {
    const figure = new THREE.Group();
    
    // Simple body (cylinder)
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2d4a2b }); // Military green
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.75;
    figure.add(body);
    
    // Head
    const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.7;
    figure.add(head);
    
    // Hat
    const hatGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 8);
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x2d4a2b });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 1.9;
    figure.add(hat);
    
    // Red star on hat
    const starGeo = new THREE.CircleGeometry(0.05, 5);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.set(0, 1.9, 0.26);
    figure.add(star);
    
    // Arms (simple cylinders)
    const armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x2d4a2b });
    
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.4, 1.2, 0);
    leftArm.rotation.z = 0.3;
    figure.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.4, 1.2, 0);
    rightArm.rotation.z = -0.3;
    figure.add(rightArm);
    
    // Legs
    const legGeo = new THREE.CylinderGeometry(0.15, 0.15, 1, 6);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2d4a2b });
    
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.2, 0.5, 0);
    figure.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.2, 0.5, 0);
    figure.add(rightLeg);
    
    return figure;
  }
  
  // Create marching formations
  const formations = [
    { x: 0, z: -30, rows: 5, cols: 8 },
    { x: -40, z: 20, rows: 4, cols: 6 },
    { x: 40, z: 10, rows: 4, cols: 6 }
  ];
  
  formations.forEach(formation => {
    for (let row = 0; row < formation.rows; row++) {
      for (let col = 0; col < formation.cols; col++) {
        const figure = createMarchingFigure();
        figure.position.set(
          formation.x + col * 2 - formation.cols,
          0,
          formation.z + row * 2
        );
        figure.userData.baseX = figure.position.x;
        figure.userData.baseZ = figure.position.z;
        figure.userData.marchPhase = Math.random() * Math.PI * 2;
        marchingFigures.push(figure);
        chinaWorld.add(figure);
      }
    }
  });

  // Create red flags
  function createFlag(x: number, y: number, z: number) {
    const group = new THREE.Group();
    
    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 8, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 4;
    group.add(pole);
    
    // Flag
    const flagGeo = new THREE.PlaneGeometry(3, 2);
    const flagMat = new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      side: THREE.DoubleSide,
      emissive: 0xff0000,
      emissiveIntensity: 0.1
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(1.5, 7, 0);
    group.add(flag);
    
    // Yellow stars on flag
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bigStarGeo = new THREE.CircleGeometry(0.3, 5);
    const bigStar = new THREE.Mesh(bigStarGeo, starMat);
    bigStar.position.set(0.5, 7.3, 0.01);
    group.add(bigStar);
    
    for (let i = 0; i < 4; i++) {
      const smallStarGeo = new THREE.CircleGeometry(0.15, 5);
      const smallStar = new THREE.Mesh(smallStarGeo, starMat);
      const angle = i * 0.3 - 0.45;
      smallStar.position.set(
        1.2 + Math.cos(angle) * 0.5,
        7.5 + Math.sin(angle) * 0.5,
        0.01
      );
      group.add(smallStar);
    }
    
    group.position.set(x, y, z);
    group.userData.flag = flag;
    return group;
  }
  
  // Add flags around the scene
  const flagPositions = [
    { x: -30, z: -30 },
    { x: 30, z: -30 },
    { x: -50, z: 0 },
    { x: 50, z: 0 },
    { x: 0, z: 50 }
  ];
  
  flagPositions.forEach(pos => {
    const flag = createFlag(pos.x, 0, pos.z);
    chinaMeshes.push(flag.userData.flag);
    chinaWorld.add(flag);
  });

  // Create detailed Chinese temple with traditional architecture
  function createChineseTemple(x: number, z: number, scale: number = 1) {
    const temple = new THREE.Group();
    
    // Multi-tiered base platform
    const platformMat = new THREE.MeshStandardMaterial({ 
      color: 0x8b7355,
      roughness: 0.9,
      metalness: 0.1
    });
    
    // Lower platform
    const platform1 = new THREE.BoxGeometry(30 * scale, 2, 30 * scale);
    const base1 = new THREE.Mesh(platform1, platformMat);
    base1.position.y = 1;
    temple.add(base1);
    
    // Upper platform
    const platform2 = new THREE.BoxGeometry(24 * scale, 2, 24 * scale);
    const base2 = new THREE.Mesh(platform2, platformMat);
    base2.position.y = 3;
    temple.add(base2);
    // Upper platform is walkable
    chinaWalkables.push(base2);
    
    // Main temple structure (red walls)
    const wallMat = new THREE.MeshStandardMaterial({ 
      color: 0x8b0000,
      roughness: 0.6,
      metalness: 0.1
    });
    
    // Main hall
    const mainHall = new THREE.BoxGeometry(20 * scale, 20 * scale, 20 * scale);
    const hall = new THREE.Mesh(mainHall, wallMat);
    hall.position.y = 14 * scale;
    temple.add(hall);
    
    // Columns
    const columnGeo = new THREE.CylinderGeometry(1 * scale, 1.2 * scale, 18 * scale, 8);
    const columnMat = new THREE.MeshStandardMaterial({ 
      color: 0x8b0000,
      roughness: 0.5,
      metalness: 0.2
    });
    
    const columnPositions = [
      { x: -8, z: 8 }, { x: 0, z: 8 }, { x: 8, z: 8 },
      { x: -8, z: -8 }, { x: 0, z: -8 }, { x: 8, z: -8 }
    ];
    
    columnPositions.forEach(pos => {
      const column = new THREE.Mesh(columnGeo, columnMat);
      column.position.set(pos.x * scale, 13 * scale, pos.z * scale);
      temple.add(column);
    });
    
    // Multi-level pagoda roof with upturned edges
    const roofMat = new THREE.MeshStandardMaterial({ 
      color: 0x8b4513,
      roughness: 0.6,
      metalness: 0.1
    });
    
    // Create curved roof shape
    function createCurvedRoof(width: number, height: number, level: number) {
      const roofGroup = new THREE.Group();
      
      // Main roof pyramid
      const roofGeo = new THREE.ConeGeometry(width, height, 4);
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.rotation.y = Math.PI / 4;
      roofGroup.add(roof);
      
      // Upturned edges
      const edgeGeo = new THREE.ConeGeometry(width * 0.3, height * 0.5, 4);
      const edges = [];
      for (let i = 0; i < 4; i++) {
        const edge = new THREE.Mesh(edgeGeo, roofMat);
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        edge.position.set(
          Math.cos(angle) * width * 0.6,
          -height * 0.3,
          Math.sin(angle) * width * 0.6
        );
        edge.rotation.z = Math.PI / 6;
        edges.push(edge);
        roofGroup.add(edge);
      }
      
      return roofGroup;
    }
    
    // First roof level
    const roof1 = createCurvedRoof(16 * scale, 8 * scale, 1);
    roof1.position.y = 28 * scale;
    temple.add(roof1);
    
    // Second roof level
    const roof2 = createCurvedRoof(12 * scale, 6 * scale, 2);
    roof2.position.y = 34 * scale;
    temple.add(roof2);
    
    // Top roof level
    const roof3 = createCurvedRoof(8 * scale, 4 * scale, 3);
    roof3.position.y = 38 * scale;
    temple.add(roof3);
    
    // Golden spire on top
    const spireGeo = new THREE.ConeGeometry(1 * scale, 4 * scale, 8);
    const spireMat = new THREE.MeshStandardMaterial({ 
      color: 0xffd700,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xffd700,
      emissiveIntensity: 0.1
    });
    const spire = new THREE.Mesh(spireGeo, spireMat);
    spire.position.y = 42 * scale;
    temple.add(spire);
    
    // Add decorative elements - golden accents
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.7,
      roughness: 0.3
    });
    
    // Window frames
    const windowGeo = new THREE.BoxGeometry(3 * scale, 4 * scale, 0.5 * scale);
    const windowPositions = [
      { x: 0, y: 14, z: 10.2 },
      { x: -6, y: 14, z: 10.2 },
      { x: 6, y: 14, z: 10.2 }
    ];
    
    windowPositions.forEach(pos => {
      const window = new THREE.Mesh(windowGeo, accentMat);
      window.position.set(pos.x * scale, pos.y * scale, pos.z * scale);
      temple.add(window);
    });
    
    // Temple doors
    const doorGeo = new THREE.BoxGeometry(4 * scale, 8 * scale, 0.5 * scale);
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x8b0000,
      roughness: 0.4,
      metalness: 0.2
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 8 * scale, 10.2 * scale);
    temple.add(door);
    
    // Add stairs
    const stairMat = new THREE.MeshStandardMaterial({
      color: 0x696969,
      roughness: 0.9,
      metalness: 0
    });
    
    // Stairs facing toward the temple entrance (highest step nearest the platform)
    const steps = 8;
    const stepHeight = 0.5;
    const stepDepth = 2;
    const topZ = 12 * scale; // align near front edge of upper platform (z ~ 12)
    for (let i = 0; i < steps; i++) {
      const stairGeo = new THREE.BoxGeometry(8 * scale, stepHeight, stepDepth);
      const stair = new THREE.Mesh(stairGeo, stairMat);
      const yCenter = (i + 0.5) * stepHeight; // center y for each step block; top step flush with platform
      const zPos = topZ + (steps - 1 - i) * stepDepth; // farthest is lowest
      stair.position.set(0, yCenter, zPos);
      temple.add(stair);
      // Make stairs walkable
      chinaWalkables.push(stair);
    }
    
    temple.position.set(x, 0, z);
    return temple;
  }
  
  // Add smaller traditional buildings
  function createBuilding(x: number, z: number) {
    const building = new THREE.Group();
    
    // Base structure
    const baseGeo = new THREE.BoxGeometry(15, 20, 15);
    const baseMat = new THREE.MeshStandardMaterial({ 
      color: 0x8b0000,
      roughness: 0.7
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 10;
    building.add(base);
    
    // Roof (pagoda style)
    const roofGeo = new THREE.ConeGeometry(12, 6, 4);
    const roofMat = new THREE.MeshStandardMaterial({ 
      color: 0x8b0000,
      roughness: 0.6
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 23;
    roof.rotation.y = Math.PI / 4;
    building.add(roof);
    
    // Add propaganda poster billboard
    const posterGeo = new THREE.PlaneGeometry(8, 10);
    const posterMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.2
    });
    const poster = new THREE.Mesh(posterGeo, posterMat);
    poster.position.set(0, 10, 7.6);
    building.add(poster);
    
    // Add Chinese characters (simplified representation)
    const textGeo = new THREE.PlaneGeometry(6, 2);
    const textMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const text = new THREE.Mesh(textGeo, textMat);
    text.position.set(0, 10, 7.7);
    building.add(text);
    
    building.position.set(x, 0, z);
    return building;
  }
  
  // Add main temple in the center
  const mainTemple = createChineseTemple(0, -80, 1);
  chinaWorld.add(mainTemple);
  
  // Add smaller buildings on sides
  const buildingPositions = [
    { x: -70, z: -50 },
    { x: 70, z: -50 },
    { x: -40, z: -120 },
    { x: 40, z: -120 }
  ];
  
  buildingPositions.forEach(pos => {
    const building = createBuilding(pos.x, pos.z);
    chinaWorld.add(building);
  });

  // Add red lanterns
  function createLantern(x: number, y: number, z: number) {
    const lanternGroup = new THREE.Group();
    
    const lanternGeo = new THREE.SphereGeometry(1, 8, 8);
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.4,
      roughness: 0.3
    });
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.scale.y = 1.3;
    lanternGroup.add(lantern);
    
    // Top and bottom caps
    const capGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 8);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    
    const topCap = new THREE.Mesh(capGeo, capMat);
    topCap.position.y = 1.3;
    lanternGroup.add(topCap);
    
    const bottomCap = new THREE.Mesh(capGeo, capMat);
    bottomCap.position.y = -1.3;
    lanternGroup.add(bottomCap);
    
    lanternGroup.position.set(x, y, z);
    lanternGroup.userData.baseY = y;
    chinaMeshes.push(lantern);
    return lanternGroup;
  }
  
  // Add lanterns along paths
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const radius = 30 + Math.sin(i * 0.5) * 10;
    const lantern = createLantern(
      Math.cos(angle) * radius,
      8,
      Math.sin(angle) * radius
    );
    chinaWorld.add(lantern);
  }
  
  // Add street lamps along roads
  function createStreetLamp(x: number, z: number) {
    const lampGroup = new THREE.Group();
    
    // Lamp post
    const postGeo = new THREE.CylinderGeometry(0.2, 0.3, 12, 8);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.8,
      metalness: 0.2
    });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.y = 6;
    lampGroup.add(post);
    
    // Lamp fixture
    const lampGeo = new THREE.SphereGeometry(1, 8, 8);
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xfff8dc,
      emissive: 0xfff8dc,
      emissiveIntensity: 0.5,
      roughness: 0.3
    });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.y = 12;
    lampGroup.add(lamp);
    
    // Add point light
    const light = new THREE.PointLight(0xfff8dc, 0.5, 20);
    light.position.y = 12;
    lampGroup.add(light);
    
    lampGroup.position.set(x, 0, z);
    return lampGroup;
  }
  
  // Place street lamps along main road
  for (let z = -140; z <= 140; z += 40) {
    const leftLamp = createStreetLamp(-16, z);
    const rightLamp = createStreetLamp(16, z);
    chinaWorld.add(leftLamp);
    chinaWorld.add(rightLamp);
  }
  
  // Add trees
  function createTree(x: number, z: number) {
    const treeGroup = new THREE.Group();
    
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.8, 1, 8, 8);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x4a3c28,
      roughness: 0.9
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 4;
    treeGroup.add(trunk);
    
    // Foliage (simple spheres for stylized look)
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x2d5016,
      roughness: 0.8
    });
    
    const foliage1 = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 8), foliageMat);
    foliage1.position.set(0, 9, 0);
    treeGroup.add(foliage1);
    
    const foliage2 = new THREE.Mesh(new THREE.SphereGeometry(2.5, 8, 8), foliageMat);
    foliage2.position.set(-1.5, 8, 0);
    treeGroup.add(foliage2);
    
    const foliage3 = new THREE.Mesh(new THREE.SphereGeometry(2.5, 8, 8), foliageMat);
    foliage3.position.set(1.5, 8, 0);
    treeGroup.add(foliage3);
    
    treeGroup.position.set(x, 0, z);
    return treeGroup;
  }
  
  // Add trees in various locations
  const treePositions = [
    { x: -30, z: 60 }, { x: 30, z: 60 },
    { x: -50, z: 80 }, { x: 50, z: 80 },
    { x: -25, z: -10 }, { x: 25, z: -10 },
    { x: -60, z: 0 }, { x: 60, z: 0 }
  ];
  
  treePositions.forEach(pos => {
    const tree = createTree(pos.x, pos.z);
    chinaWorld.add(tree);
  });
  
  // Add stone lions at temple entrance
  function createStoneLion(x: number, z: number, facingLeft: boolean = true) {
    const lionGroup = new THREE.Group();
    
    // Body
    const bodyGeo = new THREE.BoxGeometry(2, 3, 4);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.9,
      metalness: 0.1
    });
    const body = new THREE.Mesh(bodyGeo, stoneMat);
    body.position.y = 1.5;
    lionGroup.add(body);
    
    // Head
    const headGeo = new THREE.SphereGeometry(1.5, 8, 8);
    const head = new THREE.Mesh(headGeo, stoneMat);
    head.position.set(0, 3.5, facingLeft ? -1.5 : 1.5);
    lionGroup.add(head);
    
    // Base
    const baseGeo = new THREE.BoxGeometry(3, 1, 5);
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.position.y = 0.5;
    lionGroup.add(base);
    
    lionGroup.position.set(x, 0, z);
    if (!facingLeft) lionGroup.rotation.y = Math.PI;
    return lionGroup;
  }
  
  // Place stone lions at temple entrance
  const leftLion = createStoneLion(-8, -55, true);
  const rightLion = createStoneLion(8, -55, false);
  chinaWorld.add(leftLion);
  chinaWorld.add(rightLion);
  
  // Add traditional gate/archway
  function createGate(x: number, z: number) {
    const gateGroup = new THREE.Group();
    
    // Pillars
    const pillarGeo = new THREE.CylinderGeometry(1, 1, 15, 8);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x8b0000,
      roughness: 0.6,
      metalness: 0.1
    });
    
    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-10, 7.5, 0);
    gateGroup.add(leftPillar);
    
    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(10, 7.5, 0);
    gateGroup.add(rightPillar);
    
    // Top beam
    const beamGeo = new THREE.BoxGeometry(22, 2, 2);
    const beam = new THREE.Mesh(beamGeo, pillarMat);
    beam.position.y = 16;
    gateGroup.add(beam);
    
    // Decorative roof
    const roofGeo = new THREE.ConeGeometry(15, 5, 4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.6
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 19;
    roof.rotation.y = Math.PI / 4;
    gateGroup.add(roof);
    
    gateGroup.position.set(x, 0, z);
    return gateGroup;
  }
  
  // Add gates at key locations
  const gate1 = createGate(0, 0);
  const gate2 = createGate(0, -140);
  chinaWorld.add(gate1);
  chinaWorld.add(gate2);
  
  // Add propaganda billboards
  function createBillboard(x: number, y: number, z: number, text: string = "前进") {
    const billboardGroup = new THREE.Group();
    
    // Frame
    const frameGeo = new THREE.BoxGeometry(12, 8, 0.5);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.8
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    billboardGroup.add(frame);
    
    // Poster
    const posterGeo = new THREE.PlaneGeometry(11, 7);
    const posterMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.1
    });
    const poster = new THREE.Mesh(posterGeo, posterMat);
    poster.position.z = 0.3;
    billboardGroup.add(poster);
    
    // Text (simplified)
    const textGeo = new THREE.PlaneGeometry(8, 2);
    const textMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const textMesh = new THREE.Mesh(textGeo, textMat);
    textMesh.position.z = 0.4;
    billboardGroup.add(textMesh);
    
    billboardGroup.position.set(x, y, z);
    return billboardGroup;
  }
  
  // Add billboards
  const billboard1 = createBillboard(-40, 10, 50, "革命");
  const billboard2 = createBillboard(40, 10, 50, "前进");
  chinaWorld.add(billboard1);
  chinaWorld.add(billboard2);
  
  // Create more Chinese residential buildings
  function createApartmentBlock(x: number, z: number) {
    const building = new THREE.Group();
    
    // Main building structure (typical Chinese apartment block)
    const buildingGeo = new THREE.BoxGeometry(25, 40, 20);
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x999999,
      roughness: 0.9,
      metalness: 0.1
    });
    const main = new THREE.Mesh(buildingGeo, buildingMat);
    main.position.y = 20;
    building.add(main);
    
    // Windows grid
    const windowGeo = new THREE.PlaneGeometry(2, 3);
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    
    for (let floor = 0; floor < 10; floor++) {
      for (let col = 0; col < 5; col++) {
        const window1 = new THREE.Mesh(windowGeo, windowMat);
        window1.position.set(
          -10 + col * 5,
          5 + floor * 4,
          10.1
        );
        building.add(window1);
        
        const window2 = new THREE.Mesh(windowGeo, windowMat);
        window2.position.set(
          -10 + col * 5,
          5 + floor * 4,
          -10.1
        );
        building.add(window2);
      }
    }
    
    // Rooftop water tanks (common in China)
    const tankGeo = new THREE.CylinderGeometry(1.5, 1.5, 3, 8);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x4169e1 });
    
    const tank1 = new THREE.Mesh(tankGeo, tankMat);
    tank1.position.set(-5, 41.5, -5);
    building.add(tank1);
    
    const tank2 = new THREE.Mesh(tankGeo, tankMat);
    tank2.position.set(5, 41.5, 5);
    building.add(tank2);
    
    // Add some laundry lines (characteristic of Chinese apartments)
    const lineGeo = new THREE.CylinderGeometry(0.05, 0.05, 15, 4);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    
    for (let i = 0; i < 3; i++) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.z = Math.PI / 2;
      line.position.set(0, 35 - i * 8, 10.5);
      building.add(line);
    }
    
    building.position.set(x, 0, z);
    return building;
  }
  
  // Add more apartment blocks
  const apartmentPositions = [
    { x: -90, z: -80 },
    { x: 90, z: -80 },
    { x: -90, z: 40 },
    { x: 90, z: 40 },
    { x: -120, z: 0 },
    { x: 120, z: 0 }
  ];
  
  apartmentPositions.forEach(pos => {
    const apartment = createApartmentBlock(pos.x, pos.z);
    chinaWorld.add(apartment);
  });
  
  // Create traditional hutong-style houses
  function createHutong(x: number, z: number) {
    const hutong = new THREE.Group();
    
    // Low traditional house with courtyard
    const wallGeo = new THREE.BoxGeometry(12, 8, 12);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.9
    });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = 4;
    hutong.add(walls);
    
    // Traditional tiled roof
    const roofGeo = new THREE.ConeGeometry(10, 4, 4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.7
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 10;
    roof.rotation.y = Math.PI / 4;
    hutong.add(roof);
    
    // Courtyard walls
    const courtyardWallGeo = new THREE.BoxGeometry(0.5, 4, 8);
    const courtyardWall1 = new THREE.Mesh(courtyardWallGeo, wallMat);
    courtyardWall1.position.set(6.25, 2, 0);
    hutong.add(courtyardWall1);
    
    const courtyardWall2 = new THREE.Mesh(courtyardWallGeo, wallMat);
    courtyardWall2.position.set(-6.25, 2, 0);
    hutong.add(courtyardWall2);
    
    // Red door
    const doorGeo = new THREE.BoxGeometry(2, 4, 0.2);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 2, 6.1);
    hutong.add(door);
    
    hutong.position.set(x, 0, z);
    return hutong;
  }
  
  // Add hutong houses
  const hutongPositions = [
    { x: -30, z: 90 },
    { x: 0, z: 90 },
    { x: 30, z: 90 },
    { x: -45, z: 110 },
    { x: 45, z: 110 }
  ];
  
  hutongPositions.forEach(pos => {
    const hutong = createHutong(pos.x, pos.z);
    chinaWorld.add(hutong);
  });
  
  // Create scared civilian figures
  const scaredCivilians: THREE.Group[] = [];
  
  function createScaredCivilian(type: 'running' | 'cowering' | 'hiding') {
    const civilian = new THREE.Group();
    
    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.2, 6);
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: type === 'hiding' ? 0x4a4a4a : 0x6b6b6b // darker clothes
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    civilian.add(body);
    
    // Head
    const headGeo = new THREE.SphereGeometry(0.18, 6, 6);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.4;
    civilian.add(head);
    
    // Hair
    const hairGeo = new THREE.SphereGeometry(0.2, 6, 6);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.5;
    hair.scale.y = 0.6;
    civilian.add(hair);
    
    // Arms
    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 4);
    const armMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    
    const leftArm = new THREE.Mesh(armGeo, armMat);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    
    // Pose based on type
    if (type === 'running') {
      // Running pose
      body.rotation.x = 0.3;
      leftArm.position.set(-0.3, 0.9, 0.2);
      leftArm.rotation.x = -0.8;
      leftArm.rotation.z = 0.2;
      rightArm.position.set(0.3, 0.9, -0.2);
      rightArm.rotation.x = 0.8;
      rightArm.rotation.z = -0.2;
      
      // Legs in running position
      const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 4);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a });
      
      const leftLeg = new THREE.Mesh(legGeo, legMat);
      leftLeg.position.set(-0.15, 0.4, -0.3);
      leftLeg.rotation.x = 0.6;
      civilian.add(leftLeg);
      
      const rightLeg = new THREE.Mesh(legGeo, legMat);
      rightLeg.position.set(0.15, 0.4, 0.3);
      rightLeg.rotation.x = -0.6;
      civilian.add(rightLeg);
    } else if (type === 'cowering') {
      // Cowering pose - crouched down
      body.scale.y = 0.7;
      body.position.y = 0.4;
      head.position.y = 1.0;
      hair.position.y = 1.1;
      
      // Arms covering head
      leftArm.position.set(-0.2, 1.0, 0);
      leftArm.rotation.x = -2.5;
      leftArm.rotation.z = 0.8;
      rightArm.position.set(0.2, 1.0, 0);
      rightArm.rotation.x = -2.5;
      rightArm.rotation.z = -0.8;
      
      // Bent legs
      const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 4);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a });
      
      const leftLeg = new THREE.Mesh(legGeo, legMat);
      leftLeg.position.set(-0.15, 0.3, 0);
      leftLeg.rotation.x = -0.3;
      civilian.add(leftLeg);
      
      const rightLeg = new THREE.Mesh(legGeo, legMat);
      rightLeg.position.set(0.15, 0.3, 0);
      rightLeg.rotation.x = -0.3;
      civilian.add(rightLeg);
    } else { // hiding
      // Pressed against wall pose
      body.rotation.y = Math.PI / 2;
      leftArm.position.set(-0.3, 0.9, 0);
      leftArm.rotation.z = 0.6;
      rightArm.position.set(0.3, 0.9, 0);
      rightArm.rotation.z = -0.6;
      
      // Normal legs but close together
      const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 4);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a });
      
      const leftLeg = new THREE.Mesh(legGeo, legMat);
      leftLeg.position.set(-0.1, 0.4, 0);
      civilian.add(leftLeg);
      
      const rightLeg = new THREE.Mesh(legGeo, legMat);
      rightLeg.position.set(0.1, 0.4, 0);
      civilian.add(rightLeg);
    }
    
    civilian.add(leftArm);
    civilian.add(rightArm);
    
    civilian.userData.type = type;
    civilian.userData.animPhase = Math.random() * Math.PI * 2;
    
    return civilian;
  }
  
  // Place scared civilians around the scene
  const civilianSpots = [
    { x: -25, z: 15, type: 'running' as const },
    { x: 35, z: -5, type: 'cowering' as const },
    { x: -60, z: -20, type: 'hiding' as const },
    { x: 70, z: 25, type: 'running' as const },
    { x: -40, z: 70, type: 'cowering' as const },
    { x: 20, z: 60, type: 'hiding' as const },
    { x: -80, z: 10, type: 'running' as const },
    { x: 85, z: -30, type: 'cowering' as const },
    { x: -15, z: -60, type: 'hiding' as const },
    { x: 50, z: -70, type: 'running' as const },
    { x: -70, z: 60, type: 'cowering' as const },
    { x: 0, z: 40, type: 'running' as const }
  ];
  
  civilianSpots.forEach(spot => {
    const civilian = createScaredCivilian(spot.type);
    civilian.position.set(spot.x, 0, spot.z);
    
    // Random rotation except for hiding civilians
    if (spot.type !== 'hiding') {
      civilian.rotation.y = Math.random() * Math.PI * 2;
    }
    
    scaredCivilians.push(civilian);
    chinaWorld.add(civilian);
  });
  
  // Store reference for animation
  chinaWorld.userData.scaredCivilians = scaredCivilians;
  
  // Add bicycles (common in China)
  function createBicycle(x: number, z: number) {
    const bike = new THREE.Group();
    
    // Frame
    const frameGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 4);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    
    const frame1 = new THREE.Mesh(frameGeo, frameMat);
    frame1.rotation.z = Math.PI / 3;
    frame1.position.set(0, 0.5, 0);
    bike.add(frame1);
    
    const frame2 = new THREE.Mesh(frameGeo, frameMat);
    frame2.rotation.z = -Math.PI / 3;
    frame2.position.set(0.4, 0.5, 0);
    bike.add(frame2);
    
    // Wheels
    const wheelGeo = new THREE.TorusGeometry(0.3, 0.05, 4, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    
    const frontWheel = new THREE.Mesh(wheelGeo, wheelMat);
    frontWheel.position.set(0.7, 0.3, 0);
    frontWheel.rotation.y = Math.PI / 2;
    bike.add(frontWheel);
    
    const backWheel = new THREE.Mesh(wheelGeo, wheelMat);
    backWheel.position.set(-0.7, 0.3, 0);
    backWheel.rotation.y = Math.PI / 2;
    bike.add(backWheel);
    
    // Handlebars
    const handlebarGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4);
    const handlebar = new THREE.Mesh(handlebarGeo, frameMat);
    handlebar.rotation.z = Math.PI / 2;
    handlebar.position.set(0.5, 0.9, 0);
    bike.add(handlebar);
    
    // Seat
    const seatGeo = new THREE.BoxGeometry(0.2, 0.05, 0.15);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x4a3c28 });
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(-0.2, 0.85, 0);
    bike.add(seat);
    
    bike.position.set(x, 0, z);
    bike.rotation.y = Math.random() * Math.PI * 2;
    return bike;
  }
  
  // Add scattered bicycles
  const bikePositions = [
    { x: -35, z: 25 },
    { x: 45, z: -15 },
    { x: -55, z: -40 },
    { x: 65, z: 35 },
    { x: -20, z: 75 },
    { x: 25, z: -55 }
  ];
  
  bikePositions.forEach(pos => {
    const bike = createBicycle(pos.x, pos.z);
    chinaWorld.add(bike);
  });
}

addWorld();
createDesertWorld();
createChinaWorld();
createAngels();
createStaffBillboard();
createAngelBillboard();
createSacredSky();

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

    // Add subtle dark halo behind angel to improve contrast against bright sky
    const haloSize = 12 * angel.scale.x;
    const halo = createAngelHaloSprite(haloSize);
    desertWorld.add(halo);
    angelHalos.push(halo);
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

// Create green portal to China world
function createChinaPortal() {
  // Create portal group
  const portalGroup = new THREE.Group();
  portalGroup.position.set(0, 0, 20); // Behind player start position
  
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
  
  // Dark red arch frame for China portal
  const archMat = new THREE.MeshStandardMaterial({
    color: 0x330000,
    metalness: 0.3,
    roughness: 0.7
  });
  const archFrame = new THREE.Mesh(archGeo, archMat);
  archFrame.position.z = -0.5;
  portalGroup.add(archFrame);
  
  // Create the portal surface (green glowing plane)
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
    color: 0x00ff00,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });
  const portalInner = new THREE.Mesh(portalInnerGeo, portalInnerMat);
  portalInner.position.z = 0.1; // Slightly in front of arch
  portalGroup.add(portalInner);
  
  // Add green glow effect around portal
  const glowGeo = new THREE.PlaneGeometry(6.5, 7);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
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
  chinaPortal = portalInner;
  chinaPortal.userData.portalGroup = portalGroup;
}

createPortal();
createChinaPortal();

// Create billboard sprite for staff.png (always faces camera)
function createStaffBillboard() {
  const loader = new THREE.TextureLoader();
  loader.load('/staff.png', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      alphaTest: 0.1,
      color: 0x999999,
      opacity: 0.6
    });
    material.toneMapped = false;
    const sprite = new THREE.Sprite(material);
    // Keep aspect ratio based on image dimensions
    const targetHeight = 4; // world units tall
    const aspect = (texture.image && texture.image.width && texture.image.height)
      ? texture.image.width / texture.image.height
      : 1;
    sprite.scale.set(targetHeight * aspect, targetHeight, 1);
    sprite.position.set(8, 2, -12);
    scene.add(sprite);
    staffSprite = sprite;

    // Create nameplate once staff is ready
    createStaffNameplate('Mark Chen');
  });
}

function createAngelBillboard() {
  const loader = new THREE.TextureLoader();
  loader.load('/angel.png', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      alphaTest: 0.1,
      color: 0xdddddd,
      opacity: 0.85
    });
    material.toneMapped = false;
    const sprite = new THREE.Sprite(material);
    const targetHeight = 4.2;
    const aspect = (texture.image && texture.image.width && texture.image.height)
      ? texture.image.width / texture.image.height
      : 1;
    sprite.scale.set(targetHeight * aspect, targetHeight, 1);
    sprite.position.set(-3, 2, 10);
    sprite.visible = false; // only show in desert
    scene.add(sprite);
    angelSprite = sprite;
  });
}

// Subtle dark halo sprite used as backdrop for angels in bright desert sky
function createAngelHaloSprite(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x000000, opacity: 0.3, transparent: true }));
    fallback.scale.set(size, size, 1);
    return fallback;
  }
  const c = 128;
  const r = 120;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, r);
  grad.addColorStop(0.0, 'rgba(0,0,0,0.38)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.22)');
  grad.addColorStop(1.0, 'rgba(0,0,0,0.0)');
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  mat.toneMapped = false;
  mat.fog = false;
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}

// Sacred geometry sky (non-desert): flower-of-life "stars"
function createSacredSky() {
  // Ensure psychedelic world exists
  if (!psychedelicWorld) return;

  // Pattern 1: Flower/Seed of Life (7 circles)
  const makeFlowerTex = (size = 256, line = 'rgba(255,255,255,0.95)') => {
    const dpr = Math.min(2, Math.max(1, (window as any).devicePixelRatio || 1));
    const canvas = document.createElement('canvas');
    const s = size * dpr;
    canvas.width = s; canvas.height = s;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.clearRect(0, 0, s, s);
    ctx.strokeStyle = line;
    ctx.lineWidth = Math.max(1, 1.35 * dpr);
    ctx.shadowColor = 'rgba(255,255,255,0.8)';
    ctx.shadowBlur = 6 * dpr;

    const c = s / 2;
    const r = s * 0.24;
    const centers: Array<[number, number]> = [[0, 0]];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      centers.push([Math.cos(a) * r, Math.sin(a) * r]);
    }

    ctx.beginPath();
    centers.forEach(([x, y]) => {
      ctx.moveTo(c + x + r, c + y);
      ctx.arc(c + x, c + y, r, 0, Math.PI * 2);
    });
    ctx.stroke();

    ctx.shadowBlur = 10 * dpr;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    const dot = 1.6 * dpr;
    centers.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(c + x, c + y, dot, 0, Math.PI * 2);
      ctx.fill();
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  };

  // Pattern 2: Metatron's Cube (approx via Fruit of Life centers + connections)
  const makeMetatronTex = (size = 256, line = 'rgba(255,255,255,0.85)') => {
    const dpr = Math.min(2, Math.max(1, (window as any).devicePixelRatio || 1));
    const canvas = document.createElement('canvas');
    const s = size * dpr;
    canvas.width = s; canvas.height = s;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.clearRect(0, 0, s, s);
    const c = s / 2;
    const r = s * 0.18;

    const centers: Array<[number, number]> = [[0, 0]];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      centers.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6; // 30° offset outer ring
      centers.push([Math.cos(a) * (2 * r), Math.sin(a) * (2 * r)]);
    }

    // Connection lines
    ctx.strokeStyle = line;
    ctx.lineWidth = Math.max(1, 1.1 * dpr);
    ctx.shadowColor = 'rgba(255,255,255,0.75)';
    ctx.shadowBlur = 5 * dpr;
    ctx.beginPath();
    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        const [x1, y1] = centers[i];
        const [x2, y2] = centers[j];
        ctx.moveTo(c + x1, c + y1);
        ctx.lineTo(c + x2, c + y2);
      }
    }
    ctx.stroke();

    // Small circles at centers
    ctx.shadowBlur = 8 * dpr;
    ctx.beginPath();
    centers.forEach(([x, y]) => {
      ctx.moveTo(c + x + r * 0.4, c + y);
      ctx.arc(c + x, c + y, r * 0.4, 0, Math.PI * 2);
    });
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  };

  // Pattern 3: Hexagram (Merkaba 2D projection)
  const makeHexagramTex = (size = 256, line = 'rgba(255,255,255,0.9)') => {
    const dpr = Math.min(2, Math.max(1, (window as any).devicePixelRatio || 1));
    const canvas = document.createElement('canvas');
    const s = size * dpr;
    canvas.width = s; canvas.height = s;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);
    const c = s / 2;
    const R = s * 0.3;

    ctx.clearRect(0, 0, s, s);
    ctx.strokeStyle = line;
    ctx.lineWidth = Math.max(1, 1.6 * dpr);
    ctx.shadowColor = 'rgba(255,255,255,0.85)';
    ctx.shadowBlur = 7 * dpr;

    const tri = (rot: number) => {
      const pts: Array<[number, number]> = [];
      for (let i = 0; i < 3; i++) {
        const a = rot + (i / 3) * Math.PI * 2;
        pts.push([c + Math.cos(a) * R, c + Math.sin(a) * R]);
      }
      return pts;
    };

    const t1 = tri(-Math.PI / 2);
    const t2 = tri(-Math.PI / 2 + Math.PI / 3);

    const drawTri = (pts: Array<[number, number]>) => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.lineTo(pts[1][0], pts[1][1]);
      ctx.lineTo(pts[2][0], pts[2][1]);
      ctx.closePath();
      ctx.stroke();
    };

    drawTri(t1);
    drawTri(t2);

    // Outer circle
    ctx.beginPath();
    ctx.arc(c, c, R * 1.1, 0, Math.PI * 2);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  };

  // Pattern 4: Vesica Piscis (two intersecting circles)
  const makeVesicaTex = (size = 256, line = 'rgba(255,255,255,0.9)') => {
    const dpr = Math.min(2, Math.max(1, (window as any).devicePixelRatio || 1));
    const canvas = document.createElement('canvas');
    const s = size * dpr;
    canvas.width = s; canvas.height = s;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.clearRect(0, 0, s, s);
    ctx.strokeStyle = line;
    ctx.lineWidth = Math.max(1, 1.4 * dpr);
    ctx.shadowColor = 'rgba(255,255,255,0.8)';
    ctx.shadowBlur = 6 * dpr;
    const c = s / 2;
    const R = s * 0.28;
    const dx = R * 0.6;

    ctx.beginPath();
    ctx.arc(c - dx, c, R, 0, Math.PI * 2);
    ctx.arc(c + dx, c, R, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle central almond highlight
    ctx.shadowBlur = 10 * dpr;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.ellipse(c, c, dx, R * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  };

  const textures = [
    makeFlowerTex(256),
    makeMetatronTex(256),
    makeHexagramTex(256),
    makeVesicaTex(256)
  ];

  const count = 64;
  for (let i = 0; i < count; i++) {
    const tex = textures[Math.floor(Math.random() * textures.length)];
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      opacity: 0.5 + Math.random() * 0.3,
      color: new THREE.Color().setHSL(0.7 + Math.random() * 0.2, 0.2, 0.9)
    });
    mat.toneMapped = false;
    mat.fog = false;
    const sprite = new THREE.Sprite(mat);

    const targetHeight = 2.2 + Math.random() * 3.2;
    const aspect = (tex.image && (tex.image as any).width && (tex.image as any).height)
      ? (tex.image as any).width / (tex.image as any).height
      : 1;
    sprite.scale.set(targetHeight * aspect, targetHeight, 1);

    // Position high in the sky over the psychedelic world
    sprite.position.set((Math.random() - 0.5) * 300, 80 + Math.random() * 40, (Math.random() - 0.5) * 300);

    const rotSign = Math.random() < 0.5 ? -1 : 1;
    (sprite.material as THREE.SpriteMaterial).rotation = Math.random() * Math.PI * 2;
    (sprite as any).userData = {
      baseY: sprite.position.y,
      rotSpeed: rotSign * (0.1 + Math.random() * 0.25),
      twinkleSpeed: 0.6 + Math.random() * 1.2,
      twinklePhase: Math.random() * Math.PI * 2,
      baseOpacity: (sprite.material as THREE.SpriteMaterial).opacity,
      bobAmp: 0.4 + Math.random() * 0.6,
      bobPhase: Math.random() * Math.PI * 2
    };

    sacredSkySprites.push(sprite);
    psychedelicWorld.add(sprite);
  }
}

function triggerAuraFlash(position: THREE.Vector3) {
  const size = 3;
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.3, 'rgba(255, 255, 180, 0.6)');
  grad.addColorStop(0.75, 'rgba(255,180,0,0.25)');
  grad.addColorStop(1, 'rgba(255,180,0,0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  mat.toneMapped = true;
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(position);
  sprite.position.y += 1.2; // center roughly around sprite
  const baseScale = size;
  sprite.scale.set(baseScale, baseScale, 1);
  scene.add(sprite);

  auraEffects.push({ sprite, startTime: clock.elapsedTime, duration: 0.6, baseScale });
}

function createStaffNameplate(text: string) {
  const draw = () => {
    // Build a canvas texture for crisp text
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const padding = 14 * dpr;
    const fontSize = 18 * dpr; // pixel font reads larger; slight downsize
    const fontFamily = `'Press Start 2P', system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.font = `${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    const textHeight = Math.ceil(fontSize * 1.6);
    canvas.width = textWidth + padding * 2;
    canvas.height = textHeight + padding * 2;

    // Background pill
    const radius = 10 * dpr;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2 * dpr;
    roundRect(ctx, 0, 0, canvas.width, canvas.height, radius);
    ctx.fill();
    ctx.stroke();

    // Text with outline for readability
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.lineWidth = 4 * dpr;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2 + 1 * dpr);
    ctx.fillStyle = '#e8f0ff';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1 * dpr);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    material.toneMapped = false;
    material.fog = false;
    material.depthTest = false;
    const label = new THREE.Sprite(material);

    // World size for label (auto width by aspect)
    const labelHeightWorld = 0.6;
    const aspect = canvas.width / canvas.height;
    label.scale.set(labelHeightWorld * aspect, labelHeightWorld, 1);
    label.renderOrder = 10;

    labelScene.add(label);
    staffNameplateSprite = label;
  };

  // If the font isn’t ready yet, wait for it
  if ((document as any).fonts && (document as any).fonts.ready) {
    (document as any).fonts.ready.then(draw);
  } else {
    draw();
  }
}

// Helper: rounded rectangle path
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

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
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();
const BASE_SPEED = 28 * 2.2;
// Ground following helpers
const groundRaycaster = new THREE.Raycaster();
const rayDown = new THREE.Vector3(0, -1, 0);
const tmpVec3 = new THREE.Vector3();
const tmpVec3b = new THREE.Vector3();
const EYE_HEIGHT_PSY = 5.0; // exaggerated for testing in psychedelic world
const EYE_HEIGHT_DESERT = 3.2; // increase desert eye height as requested
const EYE_HEIGHT_CHINA = 1.8; // normal human eye height for China world

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
    case 'KeyP':
      if (!event.repeat) {
        showCoords = !showCoords;
        coordsEl.style.display = showCoords ? 'block' : 'none';
      }
      break;
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

  // Update coordinates HUD
  if (showCoords) {
    const p = camera.position;
    coordsEl.textContent = `X: ${p.x.toFixed(2)}\nY: ${p.y.toFixed(2)}\nZ: ${p.z.toFixed(2)}`;
  }

  // Check portal collisions
  const playerPos = camera.position;
  const portalGroupPos = portal.userData.portalGroup ? portal.userData.portalGroup.position : portal.position;
  const portalDistance = playerPos.distanceTo(portalGroupPos);
  const chinaPortalGroupPos = chinaPortal.userData.portalGroup ? chinaPortal.userData.portalGroup.position : chinaPortal.position;
  const chinaPortalDistance = playerPos.distanceTo(chinaPortalGroupPos);
  
  // White portal collision logic (psychedelic/china <-> desert)
  if (portalDistance < 3) {
    // If player is in portal range and has left the portal since last transition
    if (hasLeftPortal) {
      if (!isDesertMode) {
        // Enter desert world (from either psychedelic or china)
        isDesertMode = true;
        hasLeftPortal = false; // Mark that we need to leave portal before next transition
        
        // Switch worlds - hide whichever world we're coming from
        if (isChinaMode) {
          chinaWorld.visible = false;
          isChinaMode = false;
          hasLeftChinaPortal = true; // Reset china portal state
        } else {
          psychedelicWorld.visible = false;
        }
        desertWorld.visible = true;
        
        // Change environment
        scene.background = new THREE.Color(0x87CEEB); // Sky blue
        scene.fog = new THREE.Fog(0xFFE4B5, 10, 300); // Sandy fog
        hemi.color.setHex(0xFFF8DC); // Warm sky
        hemi.groundColor.setHex(0xD2691E); // Sandy ground
        
        // Hide Mark Chen (sprite + nameplate) in desert world
        if (staffSprite) staffSprite.visible = false;
        if (staffNameplateSprite) staffNameplateSprite.visible = false;
        // Show Angel only in desert (if not collected)
        if (angelSprite) angelSprite.visible = !hasCollectedAngel;
        
        // Hide green portal in desert world
        if (chinaPortal.userData.portalGroup) {
          chinaPortal.userData.portalGroup.visible = false;
        }
        
        // Reduce bloom for desert (less intense glow)
        bloomPass.strength = 2.5;
        setTimeout(() => { bloomPass.strength = 0.5; }, 500);
        
        // No portal glitch: set RGB shift to desert baseline immediately
        rgbShiftPass.uniforms['amount'].value = BASE_RGB_SHIFT * 1.5;
      } else {
        // Return to psychedelic world (always return to psychedelic from desert via white portal)
        isDesertMode = false;
        hasLeftPortal = false; // Mark that we need to leave portal before next transition
        
        // Switch worlds back
        psychedelicWorld.visible = true;
        desertWorld.visible = false;
        
        // Reset to psychedelic environment
        scene.fog = new THREE.FogExp2(0x040012, 0.015);
        hemi.color.setHex(0xff00ff); // Reset hemisphere light colors
        hemi.groundColor.setHex(0x00ffff);
        
        // Show Mark Chen again in psychedelic world if not collected yet
        if (!hasCollectedMark) {
          if (staffSprite) staffSprite.visible = true;
          if (staffNameplateSprite) staffNameplateSprite.visible = true;
        }
        // Hide Angel outside desert
        if (angelSprite) angelSprite.visible = false;
        
        // Show green portal again in psychedelic world
        if (chinaPortal.userData.portalGroup) {
          chinaPortal.userData.portalGroup.visible = true;
        }
        
        // Increase bloom for transition effect
        bloomPass.strength = 2.5;
        setTimeout(() => { bloomPass.strength = 1.15; }, 500);
        
        // No portal glitch: reset RGB shift to psychedelic baseline immediately
        rgbShiftPass.uniforms['amount'].value = BASE_RGB_SHIFT;
      }
    }
  } else if (portalDistance > 4) {
    // Player has moved away from portal, allow next transition
    hasLeftPortal = true;
  }

  // Green portal collision logic (psychedelic <-> china)
  if (chinaPortalDistance < 3) {
    // If player is in green portal range and has left the portal since last transition
    if (hasLeftChinaPortal && !isDesertMode) {
      if (!isChinaMode) {
        // Enter China world
        isChinaMode = true;
        hasLeftChinaPortal = false; // Mark that we need to leave portal before next transition
        
        // Switch worlds
        psychedelicWorld.visible = false;
        chinaWorld.visible = true;
        
        // Change environment to Cultural Revolution China atmosphere with sunset sky
        scene.background = new THREE.Color(0xf4a460); // Sandy brown/sunset color
        scene.fog = new THREE.Fog(0xe6c8a0, 20, 250); // Warm fog
        hemi.color.setHex(0xffd4a3); // Warm sunset light
        hemi.groundColor.setHex(0x8b4513); // Warm brown ground
        
        // Hide Mark Chen in China world
        if (staffSprite) staffSprite.visible = false;
        if (staffNameplateSprite) staffNameplateSprite.visible = false;
        // Hide Angel in China world
        if (angelSprite) angelSprite.visible = false;
        
        // Keep white portal visible in China world (allow travel to desert)
        
        // Reduce bloom for more austere look
        bloomPass.strength = 2.0;
        setTimeout(() => { bloomPass.strength = 0.3; }, 500);
        
        // Set RGB shift for China world
        rgbShiftPass.uniforms['amount'].value = BASE_RGB_SHIFT * 0.8;
      } else {
        // Return to psychedelic world
        isChinaMode = false;
        hasLeftChinaPortal = false; // Mark that we need to leave portal before next transition
        
        // Switch worlds back
        psychedelicWorld.visible = true;
        chinaWorld.visible = false;
        
        // Reset to psychedelic environment
        scene.fog = new THREE.FogExp2(0x040012, 0.015);
        hemi.color.setHex(0xff00ff); // Reset hemisphere light colors
        hemi.groundColor.setHex(0x00ffff);
        
        // Show Mark Chen again in psychedelic world if not collected yet
        if (!hasCollectedMark) {
          if (staffSprite) staffSprite.visible = true;
          if (staffNameplateSprite) staffNameplateSprite.visible = true;
        }
        // Hide Angel outside desert
        if (angelSprite) angelSprite.visible = false;
        
        // White portal is always visible (no need to show it again)
        
        // Increase bloom for transition effect
        bloomPass.strength = 2.5;
        setTimeout(() => { bloomPass.strength = 1.15; }, 500);
        
        // Reset RGB shift to psychedelic baseline
        rgbShiftPass.uniforms['amount'].value = BASE_RGB_SHIFT;
      }
    }
  } else if (chinaPortalDistance > 4) {
    // Player has moved away from china portal, allow next transition
    hasLeftChinaPortal = true;
  }

  // Animate portals - pulsing glow effect
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

  // Animate China portal
  const chinaPortalMat = chinaPortal.material as THREE.MeshBasicMaterial;
  chinaPortalMat.opacity = 0.9 + Math.sin(t * 2.5) * 0.1;
  
  if (chinaPortal.userData.portalGroup) {
    const glowMesh = chinaPortal.userData.portalGroup.children.find((child: THREE.Mesh) => 
      child.geometry instanceof THREE.PlaneGeometry && child !== chinaPortal
    );
    if (glowMesh && glowMesh.material) {
      (glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(t * 2.2) * 0.1;
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

    // Position halos slightly behind each angel along the camera view direction
    for (let i = 0; i < angels.length; i++) {
      const angel = angels[i];
      const halo = angelHalos[i];
      if (!halo) continue;
      const toCamera = tmpVec3b.copy(camera.position).sub(angel.position).normalize();
      const offset = 2.5;
      halo.position.copy(angel.position).addScaledVector(toCamera, -offset);
      // Align halo to face the camera (Sprite already faces camera but ensure stable)
      halo.quaternion.copy(camera.quaternion);
      // Keep halo scale proportional if angel scale changes over time (rare)
      const targetSize = 12 * angel.scale.x;
      halo.scale.set(targetSize, targetSize, 1);
    }
  } else if (isChinaMode) {
    // Animate China world elements
    
    // Marching figures animation
    marchingFigures.forEach((figure, idx) => {
      // Marching motion (up and down movement while moving forward)
      const marchTime = t * 2 + figure.userData.marchPhase;
      const stepHeight = Math.abs(Math.sin(marchTime)) * 0.3;
      figure.position.y = stepHeight;
      
      // Forward march movement
      figure.position.z = figure.userData.baseZ + Math.sin(t * 0.5) * 10;
      
      // Slight swaying
      figure.rotation.y = Math.sin(marchTime * 0.5) * 0.1;
      
      // Arm swing
      const leftArm = figure.children.find(child => child.position.x < 0 && child.position.y > 1);
      const rightArm = figure.children.find(child => child.position.x > 0 && child.position.y > 1);
      if (leftArm) leftArm.rotation.x = Math.sin(marchTime) * 0.4;
      if (rightArm) rightArm.rotation.x = -Math.sin(marchTime) * 0.4;
      
      // Leg movement
      const leftLeg = figure.children.find(child => child.position.x < 0 && child.position.y < 1);
      const rightLeg = figure.children.find(child => child.position.x > 0 && child.position.y < 1);
      if (leftLeg) leftLeg.rotation.x = Math.sin(marchTime) * 0.3;
      if (rightLeg) rightLeg.rotation.x = -Math.sin(marchTime) * 0.3;
    });
    
    // Animate flags waving
    chinaMeshes.forEach(mesh => {
      if (mesh.geometry instanceof THREE.PlaneGeometry) {
        // Wave effect for flags
        mesh.rotation.y = Math.sin(t * 0.8 + mesh.position.x * 0.1) * 0.2;
        mesh.rotation.z = Math.sin(t * 1.2 + mesh.position.z * 0.1) * 0.1;
      }
      
      // Lanterns swaying
      if (mesh.geometry instanceof THREE.SphereGeometry && mesh.scale.y > 1) {
        const parent = mesh.parent;
        if (parent && parent.userData.baseY !== undefined) {
          parent.position.y = parent.userData.baseY + Math.sin(t * 0.7 + mesh.position.x) * 0.5;
          parent.rotation.z = Math.sin(t * 0.9 + mesh.position.z * 0.1) * 0.05;
        }
      }
    });
    
    // Subtle atmospheric RGB shift for China world
    rgbShiftPass.uniforms['amount'].value = BASE_RGB_SHIFT * 0.8 + Math.sin(t * 1.5) * 0.0003;
    
    // Animate scared civilians
    const scaredCivilians = chinaWorld.userData.scaredCivilians;
    if (scaredCivilians) {
      scaredCivilians.forEach((civilian, idx) => {
        const type = civilian.userData.type;
        const phase = civilian.userData.animPhase;
        
        if (type === 'running') {
          // Running movement - move forward and bob
          const runSpeed = 2 + Math.sin(phase) * 0.5;
          const runTime = t * runSpeed + phase;
          
          // Update position (run in circles or back and forth)
          const pathRadius = 15 + idx * 3;
          civilian.position.x = civilian.userData.baseX || civilian.position.x;
          civilian.position.z = civilian.userData.baseZ || civilian.position.z;
          
          if (!civilian.userData.baseX) {
            civilian.userData.baseX = civilian.position.x;
            civilian.userData.baseZ = civilian.position.z;
          }
          
          // Create a running path
          const pathAngle = runTime * 0.3;
          civilian.position.x = civilian.userData.baseX + Math.sin(pathAngle) * pathRadius;
          civilian.position.z = civilian.userData.baseZ + Math.cos(pathAngle) * pathRadius * 0.5;
          
          // Face direction of movement
          civilian.rotation.y = pathAngle + Math.PI / 2;
          
          // Running bob
          civilian.position.y = Math.abs(Math.sin(runTime * 8)) * 0.3;
          
          // Arm swing animation
          const leftArm = civilian.children.find(child => child.position.x < 0 && child.position.y > 0.5);
          const rightArm = civilian.children.find(child => child.position.x > 0 && child.position.y > 0.5);
          if (leftArm) leftArm.rotation.x = -0.8 + Math.sin(runTime * 8) * 0.6;
          if (rightArm) rightArm.rotation.x = 0.8 + Math.sin(runTime * 8 + Math.PI) * 0.6;
          
          // Leg movement
          const legs = civilian.children.filter(child => 
            child.geometry instanceof THREE.CylinderGeometry && child.position.y < 0.5
          );
          if (legs[0]) legs[0].rotation.x = Math.sin(runTime * 8) * 0.8;
          if (legs[1]) legs[1].rotation.x = -Math.sin(runTime * 8) * 0.8;
        } else if (type === 'cowering') {
          // Cowering animation - trembling and looking around
          const trembleTime = t * 3 + phase;
          
          // Subtle trembling
          civilian.position.x = (civilian.userData.baseX || civilian.position.x) + Math.sin(trembleTime * 5) * 0.02;
          civilian.position.z = (civilian.userData.baseZ || civilian.position.z) + Math.cos(trembleTime * 5) * 0.02;
          
          if (!civilian.userData.baseX) {
            civilian.userData.baseX = civilian.position.x;
            civilian.userData.baseZ = civilian.position.z;
          }
          
          // Head looking around fearfully
          const head = civilian.children.find(child => 
            child.geometry instanceof THREE.SphereGeometry && child.position.y > 0.8
          );
          if (head) {
            head.rotation.y = Math.sin(trembleTime * 0.7) * 0.4;
            head.rotation.x = Math.sin(trembleTime * 0.5 + phase) * 0.2 - 0.2;
          }
          
          // Arms shaking slightly
          const arms = civilian.children.filter(child => 
            child.geometry instanceof THREE.CylinderGeometry && 
            child.position.y > 0.5 && child.scale.x < 0.2
          );
          arms.forEach((arm, i) => {
            arm.rotation.z = (i === 0 ? 0.8 : -0.8) + Math.sin(trembleTime * 8 + i) * 0.1;
          });
        } else if (type === 'hiding') {
          // Hiding animation - peeking and ducking
          const hideTime = t * 0.8 + phase;
          
          // Occasionally peek out
          const peekCycle = Math.sin(hideTime) > 0.5;
          const body = civilian.children.find(child => 
            child.geometry instanceof THREE.CylinderGeometry && child.scale.x > 0.2
          );
          
          if (body) {
            body.position.z = peekCycle ? 0.3 : 0;
            body.rotation.y = Math.PI / 2 + (peekCycle ? 0.3 : 0);
          }
          
          // Head movement when peeking
          const head = civilian.children.find(child => 
            child.geometry instanceof THREE.SphereGeometry && child.position.y > 1
          );
          if (head) {
            head.rotation.y = peekCycle ? -0.5 : 0;
            head.position.z = peekCycle ? 0.2 : 0;
          }
        }
      });
    }
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

    // Animate sacred sky sprites (twinkle, slow rotation, subtle bob)
    for (const s of sacredSkySprites) {
      const mat = s.material as THREE.SpriteMaterial;
      const ud: any = (s as any).userData;
      mat.rotation += ud.rotSpeed * delta * 0.25;
      const tw = ud.baseOpacity * (0.65 + 0.35 * Math.sin(t * ud.twinkleSpeed + ud.twinklePhase));
      mat.opacity = tw;
      s.position.y = ud.baseY + Math.sin(t * 0.5 + ud.bobPhase) * ud.bobAmp;
    }
  }

  // Collection: Mark Chen (only in psychedelic world and if not yet collected)
  if (!isDesertMode && staffSprite && staffSprite.visible && !hasCollectedMark) {
    const dist = camera.position.distanceTo(staffSprite.position);
    if (dist < 4.0) {
      hasCollectedMark = true;
      triggerAuraFlash(staffSprite.position.clone());
      // Hide sprite + nameplate after collection
      staffSprite.visible = false;
      if (staffNameplateSprite) staffNameplateSprite.visible = false;
      // Update goal UI
      markGoalCompleted('mark');
    }
  }

  // Collection: Angel (only in desert world and if not yet collected)
  if (isDesertMode && angelSprite && angelSprite.visible && !hasCollectedAngel) {
    const distA = camera.position.distanceTo(angelSprite.position);
    if (distA < 4.0) {
      hasCollectedAngel = true;
      triggerAuraFlash(angelSprite.position.clone());
      angelSprite.visible = false;
      markGoalCompleted('angel');
    }
  }

  // Ensure billboard faces the camera (optional; Sprite already faces camera by default, but keep stable)
  if (staffSprite) {
    staffSprite.quaternion.copy(camera.quaternion);
  }
  if (staffNameplateSprite && staffSprite) {
    // Position label above the top of the staff sprite
    const verticalOffset = (staffSprite.scale.y * 0.5) + 0.6;
    staffNameplateSprite.position.set(
      staffSprite.position.x,
      staffSprite.position.y + verticalOffset,
      staffSprite.position.z
    );
    staffNameplateSprite.quaternion.copy(camera.quaternion);
  }

  // Update aura effects
  if (auraEffects.length) {
    for (let i = auraEffects.length - 1; i >= 0; i--) {
      const eff = auraEffects[i];
      const elapsed = t - eff.startTime;
      const k = Math.min(1, elapsed / eff.duration);
      // Ease-out scale and fade
      const ease = 1 - Math.pow(1 - k, 3);
      const scale = eff.baseScale * (1 + ease * 1.4);
      eff.sprite.scale.set(scale, scale, 1);
      const mat = eff.sprite.material as THREE.SpriteMaterial;
      mat.opacity = (1 - k) * 0.8;
      if (k >= 1) {
        scene.remove(eff.sprite);
        eff.sprite.material.dispose();
        if (mat.map) mat.map.dispose();
        auraEffects.splice(i, 1);
      }
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
    const speed = BASE_SPEED; // movement speed
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

  // Ground clamp: keep player walking on terrain and climb stairs/platforms
  const activeGround = isChinaMode ? chinaGround : (isDesertMode ? desertGround : psychedelicGround);
  const activeWalkables = isChinaMode ? chinaWalkables : (isDesertMode ? desertWalkables : psychedelicWalkables);
  if (activeGround) {
    const playerObj = controls.getObject();
    // Ensure matrices are current, then cast from player object downward
    playerObj.updateMatrixWorld();
    camera.updateMatrixWorld();
    const origin = tmpVec3.setFromMatrixPosition(playerObj.matrixWorld);
    origin.y += 50;
    groundRaycaster.set(origin, rayDown);
    // Prefer detailed walkable geometry; fall back to world ground if needed
    let hits = activeWalkables.length
      ? groundRaycaster.intersectObjects(activeWalkables, true)
      : [] as THREE.Intersection[];
    if (!hits.length) {
      hits = groundRaycaster.intersectObject(activeGround, false);
    }
    const cameraLocalY = camera.position.y; // relative to controls' internal pitch object
    const desiredEyeHeight = isChinaMode ? EYE_HEIGHT_CHINA : (isDesertMode ? EYE_HEIGHT_DESERT : EYE_HEIGHT_PSY);
    if (hits.length > 0) {
      const groundY = hits[0].point.y;
      const desiredPlayerY = groundY + desiredEyeHeight - cameraLocalY;
      playerObj.position.y = THREE.MathUtils.lerp(playerObj.position.y, desiredPlayerY, Math.min(1, delta * 12));
    } else if (!isDesertMode && !isChinaMode) {
      // Fallback on flat world: hold target eye height even if the ray misses
      const desiredPlayerY = desiredEyeHeight - cameraLocalY;
      playerObj.position.y = THREE.MathUtils.lerp(playerObj.position.y, desiredPlayerY, Math.min(1, delta * 12));
    }
  }

  composer.render();

  // Render label scene on top without post-processing
  const prevAutoClear = renderer.autoClear;
  renderer.autoClear = false;
  renderer.clearDepth();
  renderer.render(labelScene, camera);
  renderer.autoClear = prevAutoClear;
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

// Goal UI helpers
function markGoalCompleted(which: 'mark' | 'gpu' | 'angel') {
  if (which === 'mark' && goalItemMark) {
    goalItemMark.innerHTML = '✅ Mark Chen';
    goalItemMark.style.opacity = '0.9';
  }
  if (which === 'angel' && goalItemAngel) {
    goalItemAngel.innerHTML = '✅ Biblically Accurate Angel';
    goalItemAngel.style.opacity = '0.9';
  }
  // Recompute progress
  const progress = (goalItemMark?.textContent?.includes('✅') ? 1 : 0)
                 + (goalItemAngel?.textContent?.includes('✅') ? 1 : 0)
                 + 0 /* gpu */;
  if (goalProgress) goalProgress.textContent = `Progress: ${progress} / 3`;
}
