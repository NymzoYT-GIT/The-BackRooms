```javascript
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const canvas = document.querySelector('#game');
const loading = document.querySelector('#loading');

let scene;
let camera;
let renderer;
let animationFrame;
let pointerLocked = false;

const keys = {};
const player = {
  height: 1.7,
  speed: 3.2,
  runSpeed: 5.5,
  sensitivity: 0.002,
  yaw: 0,
  pitch: 0
};

function initializeGame() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#c8b86b');
  scene.fog = new THREE.Fog('#c8b86b', 4, 32);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );

  camera.position.set(0, player.height, 4);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance'
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;

  createLevelOne();
  addStartOverlay();

  window.addEventListener('resize', resizeGame);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  document.addEventListener('pointerlockchange', onPointerLockChange);
  document.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', requestPointerLock);

  loading.classList.add('hidden');

  animate();
}

function createLevelOne() {
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: '#77734c',
    roughness: 1
  });

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: '#c5b85e',
    roughness: 1
  });

  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: '#aaa58b',
    roughness: 1
  });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    floorMaterial
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    ceilingMaterial
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 4;
  scene.add(ceiling);

  addWall(0, 2, -20, 40, 4, 0.3, wallMaterial);
  addWall(0, 2, 20, 40, 4, 0.3, wallMaterial);
  addWall(-20, 2, 0, 0.3, 4, 40, wallMaterial);
  addWall(20, 2, 0, 0.3, 4, 40, wallMaterial);

  // A few interior partitions make the space feel less like a box.
  addWall(-5, 2, -5, 0.3, 4, 10, wallMaterial);
  addWall(5, 2, 3, 0.3, 4, 10, wallMaterial);
  addWall(0, 2, -10, 10, 4, 0.3, wallMaterial);

  scene.add(new THREE.AmbientLight('#fff1c2', 1.5));

  const ceilingLight = new THREE.PointLight('#fff4c9', 30, 24);
  ceilingLight.position.set(0, 3.6, 0);
  scene.add(ceilingLight);

  const secondLight = new THREE.PointLight('#fff4c9', 20, 18);
  secondLight.position.set(-8, 3.5, -8);
  scene.add(secondLight);
}

function addWall(x, y, z, width, height, depth, material) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material
  );
  wall.position.set(x, y, z);
  scene.add(wall);
}

function addStartOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'start-overlay';

  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    display: 'grid',
    placeContent: 'center',
    gap: '12px',
    textAlign: 'center',
    background: 'rgba(8, 8, 7, 0.82)',
    zIndex: '5',
    padding: '24px'
  });

  overlay.innerHTML = `
    <h1 style="letter-spacing:0.15em">LEVEL 0</h1>
    <p>YOU ARE NOT SUPPOSED TO BE HERE.</p>
    <p>WASD: MOVE &nbsp; | &nbsp; SHIFT: RUN</p>
    <p>Click below to begin and use your mouse to look around.</p>
    <button id="start-button" style="margin:auto; padding:12px 24px">
      ENTER THE BACKROOMS
    </button>
  `;

  document.body.appendChild(overlay);

  document.query
