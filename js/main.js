import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

// ========================================
// THE BACKROOMS — MAIN GAME
// ========================================

const canvas = document.querySelector('#game');
const loading = document.querySelector('#loading');

let scene;
let camera;
let renderer;
let pointerLocked = false;
let previousTime = 0;

const keys = {};

const player = {
  height: 1.7,
  speed: 3.2,
  runSpeed: 5.5,
  sensitivity: 0.002,
  yaw: 0,
  pitch: 0
};

// ========================================
// INITIALIZATION
// ========================================

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
  camera.rotation.order = 'YXZ';

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: false,
    powerPreference: 'high-performance'
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 1.25)
  );

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;

  createLevelOne();
  addStartOverlay();

  window.addEventListener('resize', resizeGame);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  document.addEventListener(
    'pointerlockchange',
    onPointerLockChange
  );

  document.addEventListener('mousemove', onMouseMove);

  document.addEventListener('visibilitychange', () => {
    previousTime = 0;

    if (document.hidden) {
      for (const key in keys) {
        keys[key] = false;
      }
    }
  });

  loading.classList.add('hidden');

  animate();
}

// ========================================
// LEVEL 0 ENVIRONMENT
// ========================================

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

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    floorMaterial
  );

  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // Ceiling
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    ceilingMaterial
  );

  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 4;
  scene.add(ceiling);

  // Outer walls
  addWall(0, 2, -20, 40, 4, 0.3, wallMaterial);
  addWall(0, 2, 20, 40, 4, 0.3, wallMaterial);
  addWall(-20, 2, 0, 0.3, 4, 40, wallMaterial);
  addWall(20, 2, 0, 0.3, 4, 40, wallMaterial);

  // Interior partitions
  addWall(-5, 2, -5, 0.3, 4, 10, wallMaterial);
  addWall(5, 2, 3, 0.3, 4, 10, wallMaterial);
  addWall(0, 2, -10, 10, 4, 0.3, wallMaterial);

  // Ambient lighting
  const ambientLight = new THREE.AmbientLight(
    '#fff1c2',
    1.5
  );

  scene.add(ambientLight);

  // Main ceiling light
  const ceilingLight = new THREE.PointLight(
    '#fff4c9',
    30,
    24
  );

  ceilingLight.position.set(0, 3.6, 0);
  scene.add(ceilingLight);

  // Secondary ceiling light
  const secondLight = new THREE.PointLight(
    '#fff4c9',
    20,
    18
  );

  secondLight.position.set(-8, 3.5, -8);
  scene.add(secondLight);
}

function addWall(
  x,
  y,
  z,
  width,
  height,
  depth,
  material
) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material
  );

  wall.position.set(x, y, z);
  scene.add(wall);
}

// ========================================
// START SCREEN
// ========================================

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
    color: '#f5f0d8',
    zIndex: '5',
    padding: '24px',
    fontFamily: 'Arial, Helvetica, sans-serif'
  });

  // Keep the HTML template enclosed by backticks.
  overlay.innerHTML = `
    <h1 style="letter-spacing:0.15em">
      THE BACKROOMS
    </h1>

    <h2 style="color:#d9c66b">
      LEVEL 0
    </h2>

    <p>YOU ARE NOT SUPPOSED TO BE HERE.</p>

    <p>WASD: MOVE &nbsp; | &nbsp; SHIFT: RUN</p>

    <p>Move your mouse to look around.</p>

    <p style="color:#aaa58b">
      Find a way out. Something may be watching.
    </p>

    <button
      id="start-button"
      style="
        margin: 12px auto;
        padding: 12px 24px;
        background: #242316;
        color: #f5f0d8;
        border: 1px solid #d9c66b;
        cursor: pointer;
      "
    >
      ENTER THE BACKROOMS
    </button>

    <p style="font-size:12px;color:#aaa58b">
      Press ESC to release your mouse.
    </p>
  `;

  document.body.appendChild(overlay);

  const startButton = document.querySelector('#start-button');

  startButton.addEventListener('click', () => {
    if (canvas.requestPointerLock) {
      canvas.requestPointerLock();
    }
  });
}

// ========================================
// MOUSE LOOK
// ========================================

function onPointerLockChange() {
  pointerLocked = document.pointerLockElement === canvas;

  const overlay = document.querySelector('#start-overlay');

  if (overlay) {
    overlay.style.display = pointerLocked ? 'none' : 'grid';
  }

  if (!pointerLocked) {
    for (const key in keys) {
      keys[key] = false;
    }
  }
}

function onMouseMove(event) {
  if (!pointerLocked) return;

  player.yaw -= event.movementX * player.sensitivity;
  player.pitch -= event.movementY * player.sensitivity;

  player.pitch = THREE.MathUtils.clamp(
    player.pitch,
    -Math.PI / 2 + 0.05,
    Math.PI / 2 - 0.05
  );

  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

// ========================================
// KEYBOARD CONTROLS
// ========================================

function onKeyDown(event) {
  keys[event.code] = true;

  if (
    ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(
      event.code
    )
  ) {
    event.preventDefault();
  }
}

function onKeyUp(event) {
  keys[event.code] = false;
}

// ========================================
// PLAYER MOVEMENT
// ========================================

function updatePlayer(delta) {
  if (!pointerLocked) return;

  const isRunning =
    keys.ShiftLeft || keys.ShiftRight;

  const speed = isRunning
    ? player.runSpeed
    : player.speed;

  const forward = new THREE.Vector3(
    -Math.sin(player.yaw),
    0,
    -Math.cos(player.yaw)
  );

  const right = new THREE.Vector3(
    Math.cos(player.yaw),
    0,
    -Math.sin(player.yaw)
  );

  const movement = new THREE.Vector3();

  if (keys.KeyW) movement.add(forward);
  if (keys.KeyS) movement.sub(forward);
  if (keys.KeyD) movement.add(right);
  if (keys.KeyA) movement.sub(right);

  if (movement.lengthSq() > 0) {
    movement.normalize();
    movement.multiplyScalar(speed * delta);
    camera.position.add(movement);
  }

  // Temporary boundaries until proper wall collision is added.
  camera.position.x = THREE.MathUtils.clamp(
    camera.position.x,
    -19,
    19
  );

  camera.position.z = THREE.MathUtils.clamp(
    camera.position.z,
    -19,
    19
  );

  camera.position.y = player.height;
}

// ========================================
// RESIZE
// ========================================

function resizeGame() {
  if (!camera || !renderer) return;

  camera.aspect =
    window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );
}

// ========================================
// GAME LOOP
// ========================================

function animate(time = 0) {
  requestAnimationFrame(animate);

  const delta = previousTime === 0
    ? 0
    : Math.min((time - previousTime) / 1000, 0.05);

  previousTime = time;

  updatePlayer(delta);

  renderer.render(scene, camera);
}

// ========================================
// ERROR HANDLING
// ========================================

function showError(error) {
  console.error(
    'The Backrooms failed to initialize:',
    error
  );

  loading.classList.remove('hidden');
  loading.classList.add('error');

  const message = loading.querySelector('p');

  if (message) {
    message.textContent =
      'Unable to initialize the 3D scene. Check the browser console.';
  }
}

// ========================================
// START GAME
// ========================================

try {
  initializeGame();
} catch (error) {
  showError(error);
}
