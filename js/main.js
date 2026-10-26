import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

// ========================================
// THE BACKROOMS — LARGE EXPLORATION MAP
// ========================================

const canvas = document.querySelector('#game');
const loading = document.querySelector('#loading');

let scene;
let camera;
let renderer;
let pointerLocked = false;
let previousTime = 0;

const keys = {};
const GRID_SIZE = 51;       // 51 x 51 cells
const CELL_SIZE = 4;        // about 204 x 204 metres
const WALL_HEIGHT = 4;
const WALL_THICKNESS = 0.22;
const HALF_WORLD = GRID_SIZE * CELL_SIZE / 2;
const PLAYER_RADIUS = 0.32;

let maze = [];
let wallMaterial;
let floorMaterial;
let ceilingMaterial;

const player = {
  height: 1.7,
  speed: 3.2,
  runSpeed: 5.5,
  sensitivity: 0.002,
  yaw: 0,
  pitch: 0
};

const DIRECTIONS = [
  { name: 'N', dr: -1, dc: 0, opposite: 'S' },
  { name: 'E', dr: 0, dc: 1, opposite: 'W' },
  { name: 'S', dr: 1, dc: 0, opposite: 'N' },
  { name: 'W', dr: 0, dc: -1, opposite: 'E' }
];

// ========================================
// INITIALIZATION
// ========================================

function initializeGame() {
  if (!canvas || !loading) {
    throw new Error('Required #game canvas or #loading element is missing.');
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#c8b86b');
  scene.fog = new THREE.Fog('#c8b86b', 8, 48);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    260
  );
  camera.rotation.order = 'YXZ';

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;

  wallMaterial = new THREE.MeshStandardMaterial({
    color: '#c5b85e',
    roughness: 1
  });
  floorMaterial = new THREE.MeshStandardMaterial({
    color: '#77734c',
    roughness: 1
  });
  ceilingMaterial = new THREE.MeshStandardMaterial({
    color: '#aaa58b',
    roughness: 1
  });

  generateMaze();
  createEnvironment();
  placePlayerAtStart();
  addStartOverlay();

  window.addEventListener('resize', resizeGame);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  document.addEventListener('pointerlockchange', onPointerLockChange);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('visibilitychange', () => {
    previousTime = 0;
    if (document.hidden) {
      for (const key in keys) keys[key] = false;
    }
  });

  loading.classList.add('hidden');
  animate();
}

// ========================================
// PROCEDURAL MAZE GENERATION
// ========================================

function generateMaze() {
  maze = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({
      N: true, E: true, S: true, W: true, visited: false
    }))
  );

  // Randomized depth-first search makes a connected maze.
  const stack = [{ r: Math.floor(GRID_SIZE / 2), c: Math.floor(GRID_SIZE / 2) }];
  maze[stack[0].r][stack[0].c].visited = true;

  while (stack.length) {
    const current = stack[stack.length - 1];
    const options = [];

    for (const direction of DIRECTIONS) {
      const nr = current.r + direction.dr;
      const nc = current.c + direction.dc;
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
      if (!maze[nr][nc].visited) options.push({ direction, nr, nc });
    }

    if (!options.length) {
      stack.pop();
      continue;
    }

    const choice = options[Math.floor(Math.random() * options.length)];
    maze[current.r][current.c][choice.direction.name] = false;
    maze[choice.nr][choice.nc][choice.direction.opposite] = false;
    maze[choice.nr][choice.nc].visited = true;
    stack.push({ r: choice.nr, c: choice.nc });
  }

  // Open some extra walls to create loops and alternate routes.
  const loopChance = 0.085;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (c < GRID_SIZE - 1 && maze[r][c].E && Math.random() < loopChance) {
        maze[r][c].E = false;
        maze[r][c + 1].W = false;
      }
      if (r < GRID_SIZE - 1 && maze[r][c].S && Math.random() < loopChance) {
        maze[r][c].S = false;
        maze[r + 1][c].N = false;
      }
    }
  }

  // Add a few broad rooms by opening several neighboring walls.
  // These provide occasional spaces that feel different from narrow corridors.
  for (let room = 0; room < 16; room++) {
    const r = 2 + Math.floor(Math.random() * (GRID_SIZE - 4));
    const c = 2 + Math.floor(Math.random() * (GRID_SIZE - 4));
    for (const [dr, dc, wall, opposite] of [
      [0, 1, 'E', 'W'], [1, 0, 'S', 'N']
    ]) {
      const nr = r + dr;
      const nc = c + dc;
      maze[r][c][wall] = false;
      maze[nr][nc][opposite] = false;
    }
  }
}

// ========================================
// BUILD THE LEVEL
// ========================================

function createEnvironment() {
  const worldSize = GRID_SIZE * CELL_SIZE;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(worldSize, worldSize),
    floorMaterial
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(worldSize, worldSize),
    ceilingMaterial
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;
  scene.add(ceiling);

  buildMergedWalls();

  // Low-cost ambient illumination plus a grid of ceiling lights.
  scene.add(new THREE.AmbientLight('#fff1c2', 1.15));

  for (let r = 3; r < GRID_SIZE; r += 6) {
    for (let c = 3; c < GRID_SIZE; c += 6) {
      const light = new THREE.PointLight('#fff0bd', 18, 17);
      light.position.set(cellCenter(c), 3.55, cellCenter(r));
      scene.add(light);

      // Simple visible fluorescent panel.
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, 0.05, 0.38),
        new THREE.MeshBasicMaterial({ color: '#fff7d8' })
      );
      panel.position.set(cellCenter(c), 3.92, cellCenter(r));
      scene.add(panel);
    }
  }
}

function buildMergedWalls() {
  // Merge consecutive wall segments into long meshes to reduce draw calls.
  // Horizontal boundaries (north/south walls).
  for (let boundaryR = 0; boundaryR <= GRID_SIZE; boundaryR++) {
    let runStart = -1;
    for (let c = 0; c <= GRID_SIZE; c++) {
      let hasWall = false;
      if (c < GRID_SIZE) {
        if (boundaryR === 0) {
          hasWall = true;
        } else if (boundaryR === GRID_SIZE) {
          hasWall = true;
        } else {
          hasWall = maze[boundaryR - 1][c].S;
        }
      }

      if (hasWall && runStart === -1) runStart = c;
      if ((!hasWall || c === GRID_SIZE) && runStart !== -1) {
        const length = c - runStart;
        const x = -HALF_WORLD + (runStart + length / 2) * CELL_SIZE;
        const z = -HALF_WORLD + boundaryR * CELL_SIZE;
        addWall(x, z, length * CELL_SIZE, WALL_THICKNESS);
        runStart = -1;
      }
    }
  }

  // Vertical boundaries (east/west walls).
  for (let boundaryC = 0; boundaryC <= GRID_SIZE; boundaryC++) {
    let runStart = -1;
    for (let r = 0; r <= GRID_SIZE; r++) {
      let hasWall = false;
      if (r < GRID_SIZE) {
        if (boundaryC === 0 || boundaryC === GRID_SIZE) {
          hasWall = true;
        } else {
          hasWall = maze[r][boundaryC - 1].E;
        }
      }

      if (hasWall && runStart === -1) runStart = r;
      if ((!hasWall || r === GRID_SIZE) && runStart !== -1) {
        const length = r - runStart;
        const x = -HALF_WORLD + boundaryC * CELL_SIZE;
        const z = -HALF_WORLD + (runStart + length / 2) * CELL_SIZE;
        addWall(x, z, WALL_THICKNESS, length * CELL_SIZE);
        runStart = -1;
      }
    }
  }
}

function addWall(x, z, width, depth) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(width, WALL_HEIGHT, depth),
    wallMaterial
  );
  wall.position.set(x, WALL_HEIGHT / 2, z);
  scene.add(wall);
}

function cellCenter(index) {
  return -HALF_WORLD + (index + 0.5) * CELL_SIZE;
}

function placePlayerAtStart() {
  const startR = Math.floor(GRID_SIZE / 2);
  const startC = Math.floor(GRID_SIZE / 2);
  camera.position.set(cellCenter(startC), player.height, cellCenter(startR));
  player.yaw = 0;
  player.pitch = 0;
  camera.rotation.set(0, 0, 0);
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
    background: 'rgba(8, 8, 7, 0.92)',
    color: '#f5f0d8',
    zIndex: '5',
    padding: '24px',
    fontFamily: 'Arial, Helvetica, sans-serif'
  });

  const title = document.createElement('h1');
  title.textContent = 'THE BACKROOMS';
  title.style.letterSpacing = '0.15em';
  overlay.appendChild(title);

  const level = document.createElement('h2');
  level.textContent = 'LEVEL 0 — THE MAZE';
  level.style.color = '#d9c66b';
  overlay.appendChild(level);

  const messages = [
    'YOU ARE NOT SUPPOSED TO BE HERE.',
    `A sprawling ${GRID_SIZE * CELL_SIZE} × ${GRID_SIZE * CELL_SIZE} metre maze awaits.`,
    'WASD: MOVE  |  SHIFT: RUN',
    'Move your mouse to look around.',
    'The layout changes every time the game loads.',
    'Press ESC to release your mouse.'
  ];

  for (const message of messages) {
    const paragraph = document.createElement('p');
    paragraph.textContent = message;
    overlay.appendChild(paragraph);
  }

  const startButton = document.createElement('button');
  startButton.id = 'start-button';
  startButton.textContent = 'ENTER THE BACKROOMS';

  Object.assign(startButton.style, {
    margin: '12px auto',
    padding: '12px 24px',
    background: '#242316',
    color: '#f5f0d8',
    border: '1px solid #d9c66b',
    cursor: 'pointer',
    font: 'inherit'
  });

  overlay.appendChild(startButton);
  document.body.appendChild(overlay);

  startButton.addEventListener('click', () => {
    if (canvas.requestPointerLock) canvas.requestPointerLock();
  });
}

// ========================================
// MOUSE LOOK
// ========================================

function onPointerLockChange() {
  pointerLocked = document.pointerLockElement === canvas;
  const overlay = document.querySelector('#start-overlay');

  if (overlay) overlay.style.display = pointerLocked ? 'none' : 'grid';

  if (!pointerLocked) {
    for (const key in keys) keys[key] = false;
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
// KEYBOARD CONTROLS & WALL COLLISION
// ========================================

function onKeyDown(event) {
  keys[event.code] = true;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
}

function onKeyUp(event) {
  keys[event.code] = false;
}

function worldToCell(x, z) {
  return {
    c: Math.floor((x + HALF_WORLD) / CELL_SIZE),
    r: Math.floor((z + HALF_WORLD) / CELL_SIZE)
  };
}

function canMoveTo(x, z) {
  const from = worldToCell(camera.position.x, camera.position.z);
  const to = worldToCell(x, z);

  if (to.r < 0 || to.r >= GRID_SIZE || to.c < 0 || to.c >= GRID_SIZE) {
    return false;
  }
  if (from.r < 0 || from.r >= GRID_SIZE || from.c < 0 || from.c >= GRID_SIZE) {
    return false;
  }

  if (to.c > from.c && maze[from.r][from.c].E) return false;
  if (to.c < from.c && maze[from.r][from.c].W) return false;
  if (to.r > from.r && maze[from.r][from.c].S) return false;
  if (to.r < from.r && maze[from.r][from.c].N) return false;

  return true;
}

function updatePlayer(delta) {
  if (!pointerLocked) return;

  const speed = (keys.ShiftLeft || keys.ShiftRight) ? player.runSpeed : player.speed;
  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const movement = new THREE.Vector3();

  if (keys.KeyW) movement.add(forward);
  if (keys.KeyS) movement.sub(forward);
  if (keys.KeyD) movement.add(right);
  if (keys.KeyA) movement.sub(right);

  if (movement.lengthSq() > 0) {
    movement.normalize().multiplyScalar(speed * delta);

    // Axis-separated movement lets the player slide along walls.
    const nextX = camera.position.x + movement.x;
    if (canMoveTo(nextX, camera.position.z)) camera.position.x = nextX;

    const nextZ = camera.position.z + movement.z;
    if (canMoveTo(camera.position.x, nextZ)) camera.position.z = nextZ;
  }

  camera.position.y = player.height;
}

// ========================================
// RESIZE & GAME LOOP
// ========================================

function resizeGame() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(time = 0) {
  requestAnimationFrame(animate);
  const delta = previousTime === 0 ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  updatePlayer(delta);
  renderer.render(scene, camera);
}

// ========================================
// ERROR HANDLING
// ========================================

function showError(error) {
  console.error('The Backrooms failed to initialize:', error);
  if (!loading) return;
  loading.classList.remove('hidden');
  loading.classList.add('error');
  const message = loading.querySelector('p');
  if (message) {
    message.textContent = 'Unable to initialize the 3D scene. Check the browser console.';
  }
}

try {
  initializeGame();
} catch (error) {
  showError(error);
}
