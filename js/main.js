```javascript
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const canvas = document.querySelector('#game');
const loading = document.querySelector('#loading');

let scene;
let camera;
let renderer;
let animationFrame;

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

  camera.position.set(0, 1.7, 4);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance'
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;

  createLevelOne();

  window.addEventListener('resize', resizeGame);

  loading.querySelector('p').textContent = 'LEVEL 0 — INITIALIZED';

  // Keep the loading screen visible until the next development step.
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
  floor.position.y = 0;
  scene.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    ceilingMaterial
  );

  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 4;
  scene.add(ceiling);

  // Four boundary walls for the first test room.
  addWall(0, 2, -20, 40, 4, 0.3, wallMaterial);
  addWall(0, 2, 20, 40, 4, 0.3, wallMaterial);
  addWall(-20, 2, 0, 0.3, 4, 40, wallMaterial);
  addWall(20, 2, 0, 0.3, 4, 40, wallMaterial);

  const ambientLight = new THREE.AmbientLight('#fff1c2', 1.4);
  scene.add(ambientLight);

  const ceilingLight = new THREE.PointLight('#fff4c9', 35, 22);
  ceilingLight.position.set(0, 3.6, 0);
  scene.add(ceilingLight);
}

function addWall(x, y, z, width, height, depth, material) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material
  );

  wall.position.set(x, y, z);
  scene.add(wall);
}

function resizeGame() {
  if (!camera || !renderer) return;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  animationFrame = requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

function showError(error) {
  console.error('The Backrooms failed to initialize:', error);

  loading.classList.add('error');
  loading.querySelector('p').textContent =
    'Unable to initialize the 3D scene. Check the browser console.';
}

try {
  initializeGame();
} catch (error) {
  showError(error);
}
```
