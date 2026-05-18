"use strict";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.querySelector("#score"),
  best: document.querySelector("#best"),
  speed: document.querySelector("#speed"),
  overlay: document.querySelector("#overlay"),
  stateView: document.querySelector("#stateView"),
  startBtn: document.querySelector("#startBtn"),
  pauseBtn: document.querySelector("#pauseBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  aiToggle: document.querySelector("#aiToggle"),
  stepRate: document.querySelector("#stepRate"),
  stepRateValue: document.querySelector("#stepRateValue"),
};

const CONFIG = {
  width: 1100,
  height: 600,
  dinoX: 80,
  dinoRunY: 310,
  dinoDuckY: 340,
  trackY: 380,
  jumpVelocity: 6,
  jumpDecay: 0.1,
  jumpScale: 1,
  baseSpeed: 3,
};

const ACTION = {
  NONE: 0,
  JUMP: 1,
  DUCK: 2,
};

const ASSET_SOURCES = {
  dino: {
    idle: "Sprites/Dino/DinoStart.png",
    run: ["Sprites/Dino/DinoRun1.png", "Sprites/Dino/DinoRun2.png"],
    jump: "Sprites/Dino/DinoJump.png",
    duck: ["Sprites/Dino/DinoDuck1.png", "Sprites/Dino/DinoDuck2.png"],
    dead: "Sprites/Dino/DinoDead.png",
  },
  cactus: {
    small: [
      "Sprites/Cactus/SmallCactus1.png",
      "Sprites/Cactus/SmallCactus2.png",
      "Sprites/Cactus/SmallCactus3.png",
    ],
    large: [
      "Sprites/Cactus/LargeCactus1.png",
      "Sprites/Cactus/LargeCactus2.png",
      "Sprites/Cactus/LargeCactus3.png",
    ],
  },
  bird: ["Sprites/Bird/Bird1.png", "Sprites/Bird/Bird2.png"],
  other: {
    cloud: "Sprites/Other/Cloud.png",
    track: "Sprites/Other/Track.png",
    gameOver: "Sprites/Other/GameOver.png",
    reset: "Sprites/Other/Reset.png",
  },
};

const assets = {
  dino: {
    idle: null,
    run: [],
    jump: null,
    duck: [],
    dead: null,
  },
  cactus: {
    small: [],
    large: [],
  },
  bird: [],
  other: {
    cloud: null,
    track: null,
    gameOver: null,
    reset: null,
  },
};

let state;
let keys = new Set();
let running = false;
let lastFrame = 0;
let aiAgent = null;
let bestScore = Number(localStorage.getItem("dino-best") || 0);

function loadImage(source) {
  const image = new Image();
  const asset = { loaded: false, image, width: 0, height: 0 };
  image.addEventListener("load", () => {
    asset.loaded = true;
    asset.width = image.naturalWidth || image.width;
    asset.height = image.naturalHeight || image.height;
    if (state) draw();
  });
  image.addEventListener("error", () => {
    console.warn(`Nao foi possivel carregar o asset: ${source}`);
  });
  image.src = source;
  return asset;
}

assets.dino.idle = loadImage(ASSET_SOURCES.dino.idle);
assets.dino.run = ASSET_SOURCES.dino.run.map(loadImage);
assets.dino.jump = loadImage(ASSET_SOURCES.dino.jump);
assets.dino.duck = ASSET_SOURCES.dino.duck.map(loadImage);
assets.dino.dead = loadImage(ASSET_SOURCES.dino.dead);
assets.cactus.small = ASSET_SOURCES.cactus.small.map(loadImage);
assets.cactus.large = ASSET_SOURCES.cactus.large.map(loadImage);
assets.bird = ASSET_SOURCES.bird.map(loadImage);
assets.other.cloud = loadImage(ASSET_SOURCES.other.cloud);
assets.other.track = loadImage(ASSET_SOURCES.other.track);
assets.other.gameOver = loadImage(ASSET_SOURCES.other.gameOver);
assets.other.reset = loadImage(ASSET_SOURCES.other.reset);

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function assetSize(asset, fallbackWidth, fallbackHeight) {
  return {
    width: asset && asset.loaded ? asset.width : fallbackWidth,
    height: asset && asset.loaded ? asset.height : fallbackHeight,
  };
}

function createObstacle() {
  const obstacleType = Math.floor(Math.random() * 3);

  if (obstacleType === 0) {
    const variant = Math.floor(Math.random() * 3);
    const size = assetSize(assets.cactus.small[variant], [34, 68, 102][variant], 70);
    return {
      kind: "smallCactus",
      type: variant,
      x: CONFIG.width,
      y: 325,
      width: size.width,
      height: size.height,
      passed: false,
    };
  }

  if (obstacleType === 1) {
    const variant = Math.floor(Math.random() * 3);
    const size = assetSize(assets.cactus.large[variant], [50, 100, 150][variant], 95);
    return {
      kind: "largeCactus",
      type: variant,
      x: CONFIG.width,
      y: 300,
      width: size.width,
      height: size.height,
      passed: false,
    };
  }

  const size = assetSize(assets.bird[0], 92, 65);
  return {
    kind: "bird",
    type: 0,
    x: CONFIG.width,
    y: randomChoice([250, 290, 320]),
    width: size.width,
    height: size.height,
    index: 0,
    passed: false,
  };
}

function reset() {
  running = false;
  lastFrame = 0;
  state = {
    tick: 0,
    score: 0,
    alive: true,
    speed: CONFIG.velocidadeBase,
    bgX: 0,
    dino: {
      x: CONFIG.dinoX,
      y: CONFIG.dinoRunY,
      width: 88,
      height: 94,
      jumpVel: CONFIG.VelocidadePulo,
      grounded: true,
      ducking: false,
      jumping: false,
      running: false,
      stepIndex: 0,
      mode: "idle",
    },
    obstacles: [],
    cloud: {
      x: CONFIG.width + Math.floor(rand(800, 1000)),
      y: Math.floor(rand(50, 100)),
      width: 92,
    },
  };
  applyDinoSize();
  ui.overlay.hidden = false;
  ui.overlay.querySelector("strong").textContent = "Dino pronto";
  updateUi();
  draw();
  return getState();
}

function getDinoBox() {
  const d = state.dino;

  // Dino normal
  let hitbox = [
    // PARTE DA CABECA
    {
      x: d.x + 45,
      y: d.y + 8,
      width: 39,
      height: 28
    },

    // PARTE DO CORPO
    {
      x: d.x + 5,
      y: d.y + 30,
      width: 62,
      height: 38
    },

    // PARTE DA PERNA
    {
      x: d.x + 22,
      y: d.y + 68,
      width: 30,
      height: 21
    }
  ];

  // Dino abaixado
  if (d.ducking) {
    hitbox = [
      {
        x: d.x + 18,
        y: d.y + 18,
        width: 70,
        height: 25
      },

      {
        x: d.x + 28,
        y: d.y + 40,
        width: 45,
        height: 12
      }
    ];
  }

  return hitbox;
}

function getObstacleBox(obstacle) {
  if (obstacle.kind === "bird") {
    return {
      x: obstacle.x + 10,
      y: obstacle.y + 10,
      width: obstacle.width - 20,
      height: obstacle.height - 20,
    };
  }

  return {
    x: obstacle.x + 8,
    y: obstacle.y + 5,
    width: obstacle.width - 16,
    height: obstacle.height - 10,
  };
}

function currentDinoAsset() {
  const d = state.dino;
  const frame = Math.floor(d.stepIndex / 5) % 2;

  if (!state.alive) return assets.dino.dead;
  if (d.jumping || !d.grounded) return assets.dino.jump;
  if (!running) return assets.dino.idle;
  if (d.ducking) return assets.dino.duck[frame];
  return assets.dino.run[frame];
}

function applyDinoSize() {
  const d = state.dino;
  const asset = currentDinoAsset();
  if (asset && asset.loaded) {
    d.width = asset.width;
    d.height = asset.height;
  } else if (d.ducking) {
    d.width = 118;
    d.height = 60;
  } else {
    d.width = 88;
    d.height = 94;
  }
}

function overlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function nextObstacle() {
  return state.obstacles.find((obstacle) => obstacle.x + obstacle.width >= state.dino.x) || null;
}

function getState() {
  const obstacle = nextObstacle();
  const d = state.dino;
  return {
    alive: state.alive,
    score: Math.floor(state.score),
    speed: Number(state.speed.toFixed(2)),
    dinoY: Number((CONFIG.dinoRunY - d.y).toFixed(2)),
    dinoVelocityY: Number(d.jumpVel.toFixed(2)),
    grounded: d.grounded,
    ducking: d.ducking,
    jumping: d.jumping,
    mode: d.mode,
    obstacleDistance: obstacle ? Number((obstacle.x - d.x).toFixed(2)) : null,
    obstacleWidth: obstacle ? obstacle.width : 0,
    obstacleHeight: obstacle ? obstacle.height : 0,
    obstacleY: obstacle ? obstacle.y : 0,
    obstacleType: obstacle ? obstacle.kind : "none",
  };
}

function normalizeAction(action) {
  if (action === "jump") return ACTION.JUMP;
  if (action === "duck") return ACTION.DUCK;
  if (action === true) return ACTION.JUMP;
  return Number(action) || ACTION.NONE;
}

function step(action = ACTION.NONE, options = {}) {
  const shouldRender = options.render !== false;

  if (!state.alive) {
    return { state: getState(), reward: -10, done: true };
  }

  const d = state.dino;
  const chosen = normalizeAction(action);

  if (chosen === ACTION.JUMP && !d.jumping) {
    d.ducking = false;
    d.running = false;
    d.jumping = true;
    d.grounded = false;
  } else if (chosen === ACTION.DUCK && !d.jumping) {
    d.ducking = true;
    d.running = false;
    d.grounded = true;
  } else if (!d.jumping) {
    d.ducking = false;
    d.running = true;
    d.grounded = true;
  }

  if (d.ducking) {
    d.mode = "duck";
    d.y = CONFIG.dinoDuckY;
    d.stepIndex = (d.stepIndex + 1) % 10;
  }

  if (d.running) {
    d.mode = "run";
    d.y = CONFIG.dinoRunY;
    d.stepIndex = (d.stepIndex + 1) % 10;
  }

  if (d.jumping) {
    d.mode = "jump";
    d.y -= d.jumpVel * CONFIG.jumpScale;
    d.jumpVel -= CONFIG.jumpDecay;
    if (d.jumpVel < -CONFIG.jumpVelocity) {
      d.jumping = false;
      d.running = true;
      d.grounded = true;
      d.jumpVel = CONFIG.jumpVelocity;
      d.y = CONFIG.dinoRunY;
    }
  }

  applyDinoSize();

  state.tick += 0.1;
  state.score += 0.1;
  if (state.score % 100 === 0) {
    state.speed += 0.1;
  }

  for (const obstacle of state.obstacles) {
    obstacle.x -= state.speed;
    if (!obstacle.passed && obstacle.x + obstacle.width < d.x) {
      obstacle.passed = true;
    }
  }

  state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.width > 0);
  if (state.obstacles.length === 0) {
    state.obstacles.push(createObstacle());
  }

  state.cloud.x -= state.speed;
  const cloudWidth = assets.other.cloud && assets.other.cloud.loaded ? assets.other.cloud.width : state.cloud.width;
  if (state.cloud.x < -cloudWidth) {
    state.cloud.x = CONFIG.width + Math.floor(rand(2500, 3000));
    state.cloud.y = Math.floor(rand(50, 100));
  }

  state.bgX -= state.speed;
  const trackWidth = assets.other.track && assets.other.track.loaded ? assets.other.track.width : CONFIG.width;
  if (state.bgX <= -trackWidth) state.bgX = 0;

const dinoBoxes = getDinoBox();

if (
  state.obstacles.some((obstacle) => {
    const obstacleBox = getObstacleBox(obstacle);

    return dinoBoxes.some((box) =>
      overlap(box, obstacleBox)
    );
  })
) {
    state.alive = false;
    bestScore = Math.max(bestScore, Math.floor(state.score));
    localStorage.setItem("dino-best", String(bestScore));
    ui.overlay.hidden = false;
    ui.overlay.querySelector("strong").textContent = "Fim de jogo";
    if (shouldRender) {
      updateUi();
      draw();
    }
    return { state: getState(), reward: -10, done: true };
  }

  const reward = 1;
  if (shouldRender) {
    updateUi();
    draw();
  }
  return { state: getState(), reward, done: false };
}

function drawDinoSprite() {
  const d = state.dino;
  const sprite = currentDinoAsset();
  if (!sprite || !sprite.loaded) return false;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite.image, d.x, d.y);
  ctx.restore();
  return true;
}

function drawDino() {
  if (drawDinoSprite()) return;
  drawFallbackDino();
}

function drawFallbackDino() {
  const d = state.dino;
  const foot = Math.floor(state.tick / 7) % 2;
  const color = "#535353";
  ctx.save();
  ctx.fillStyle = color;

  if (d.ducking && d.grounded) {
    const y = CONFIG.trackY - 40;
    ctx.fillRect(d.x + 8, y + 14, 58, 22);
    ctx.fillRect(d.x + 48, y + 2, 28, 24);
    ctx.fillRect(d.x + 72, y + 12, 14, 8);
    ctx.fillRect(d.x - 8, y + 21, 24, 8);
    ctx.fillRect(d.x + 2, y + 34, 16, 8);
    ctx.fillRect(d.x + 42, y + 34, 18, 8);
    ctx.fillStyle = "#f7f7f7";
    ctx.fillRect(d.x + 67, y + 8, 4, 4);
    ctx.fillStyle = color;
    ctx.fillRect(d.x + 74, y + 22, 8, 4);
  } else {
    const x = d.x;
    const y = d.y;

    ctx.fillRect(x + 18, y + 18, 33, 42);
    ctx.fillRect(x + 39, y + 2, 35, 30);
    ctx.fillRect(x + 69, y + 14, 12, 8);
    ctx.fillRect(x + 51, y + 31, 9, 9);
    ctx.fillRect(x + 7, y + 31, 15, 9);
    ctx.fillRect(x - 8, y + 38, 16, 8);
    ctx.fillRect(x - 18, y + 45, 12, 7);
    ctx.fillRect(x + 23, y + 58, 9, 17);
    ctx.fillRect(x + 42, y + 58, 9, 17);

    if (d.grounded) {
      if (foot === 0) {
        ctx.fillRect(x + 18, y + 72, 20, 6);
        ctx.fillRect(x + 42, y + 72, 9, 6);
      } else {
        ctx.fillRect(x + 23, y + 72, 9, 6);
        ctx.fillRect(x + 38, y + 72, 22, 6);
      }
    } else {
      ctx.fillRect(x + 20, y + 70, 13, 6);
      ctx.fillRect(x + 42, y + 70, 13, 6);
    }

    ctx.fillStyle = "#f7f7f7";
    ctx.fillRect(x + 62, y + 9, 4, 4);
    ctx.fillStyle = color;
    ctx.fillRect(x + 68, y + 26, 9, 4);
    ctx.fillRect(x + 32, y + 36, 12, 5);
  }
  ctx.restore();
}

function drawObstacle(obstacle) {
  let asset = null;
  if (obstacle.kind === "smallCactus") {
    asset = assets.cactus.small[obstacle.type];
  } else if (obstacle.kind === "largeCactus") {
    asset = assets.cactus.large[obstacle.type];
  } else if (obstacle.kind === "bird") {
    const frame = Math.floor(state.tick / 5) % 2;
    asset = assets.bird[frame];
  }

  if (asset && asset.loaded) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(asset.image, obstacle.x, obstacle.y);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.fillStyle = "#535353";

  if (obstacle.kind === "bird") {
    const flap = Math.floor(state.tick / 10) % 2;
    ctx.fillRect(obstacle.x + 24, obstacle.y + 24, 44, 18);
    ctx.fillRect(obstacle.x + 64, obstacle.y + 18, 18, 10);
    ctx.fillRect(obstacle.x + 80, obstacle.y + 22, 10, 5);
    if (flap === 0) {
      ctx.fillRect(obstacle.x + 6, obstacle.y + 8, 34, 12);
      ctx.fillRect(obstacle.x + 30, obstacle.y + 40, 30, 10);
    } else {
      ctx.fillRect(obstacle.x + 8, obstacle.y + 42, 34, 12);
      ctx.fillRect(obstacle.x + 30, obstacle.y + 8, 30, 10);
    }
  } else {
    const count = obstacle.type + 1;
    const cactusWidth = obstacle.kind === "largeCactus" ? 34 : 24;
    const cactusHeight = obstacle.height;
    for (let i = 0; i < count; i += 1) {
      const x = obstacle.x + i * cactusWidth;
      ctx.fillRect(x + cactusWidth * 0.38, obstacle.y, cactusWidth * 0.28, cactusHeight);
      ctx.fillRect(x + 1, obstacle.y + cactusHeight * 0.35, cactusWidth * 0.46, 9);
      ctx.fillRect(x + cactusWidth * 0.55, obstacle.y + cactusHeight * 0.56, cactusWidth * 0.45, 9);
    }
  }
  ctx.restore();
}

function drawGround() {
  const track = assets.other.track;
  if (track && track.loaded) {
    for (const offset of [state.bgX, track.width + state.bgX]) {
      ctx.drawImage(track.image, offset, CONFIG.trackY);
    }
    if (state.bgX <= -track.width) state.bgX = 0;
    return;
  }

  ctx.strokeStyle = "#535353";
  ctx.fillStyle = "#535353";
  ctx.lineWidth = 2;

  for (const offset of [state.bgX, CONFIG.width + state.bgX]) {
    ctx.beginPath();
    ctx.moveTo(offset, CONFIG.trackY);
    ctx.lineTo(offset + CONFIG.width, CONFIG.trackY);
    ctx.stroke();

    for (let x = offset + 12; x < offset + CONFIG.width; x += 72) {
      ctx.fillRect(x, CONFIG.trackY + 18, 36, 3);
      ctx.fillRect(x + 44, CONFIG.trackY + 38, 18, 3);
    }
  }
}

function drawClouds() {
  const cloud = state.cloud;
  const cloudAsset = assets.other.cloud;
  if (cloudAsset && cloudAsset.loaded) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cloudAsset.image, cloud.x, cloud.y);
    ctx.restore();
    return;
  }

  ctx.fillStyle = "#cfd4d1";
  ctx.beginPath();
  ctx.arc(cloud.x, cloud.y + 18, 18, 0, Math.PI * 2);
  ctx.arc(cloud.x + 24, cloud.y + 8, 26, 0, Math.PI * 2);
  ctx.arc(cloud.x + 54, cloud.y + 18, 18, 0, Math.PI * 2);
  ctx.fillRect(cloud.x, cloud.y + 18, 72, 20);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  drawClouds();
  drawGround();

  for (const obstacle of state.obstacles) {
    drawObstacle(obstacle);
  }

  drawDino();

  if (!state.alive) {
    ctx.fillStyle = "rgba(177, 58, 50, 0.12)";
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    const gameOver = assets.other.gameOver;

    if (gameOver && gameOver.loaded) {
      ctx.drawImage(
        gameOver.image,
        (CONFIG.width - gameOver.width) / 2,
        210
      );
    }

    // LINHAS DA HITBOXES DO DINOSSAURO, RETIRAR DEPOIS, COR VERMELHA
    const dinoBoxes = getDinoBox();

    ctx.strokeStyle = "red";

    for (const box of dinoBoxes) {
      ctx.strokeRect(
        box.x,
        box.y,
        box.width,
        box.height
      );
    }

    // LINHA DAS HITBOXES DOS OBSTACULOS, TIRAR DEPOIS, COR AZUL
    for (const obstacle of state.obstacles) {
      const box = getObstacleBox(obstacle);

      ctx.strokeStyle = "blue";

      ctx.strokeRect(
        box.x,
        box.y,
        box.width,
        box.height
      );
    }
  }
}

function updateUi() {
  ui.score.textContent = String(Math.floor(state.score));
  ui.best.textContent = String(bestScore);
  ui.speed.textContent = state.speed.toFixed(1);
  ui.stepRateValue.textContent = ui.stepRate.value;
  ui.stateView.textContent = JSON.stringify(getState(), null, 2);
}

function manualAction() {
  if (keys.has("KeyS") || keys.has("ArrowDown")) return ACTION.DUCK;
  if (keys.has("Space") || keys.has("KeyW") || keys.has("ArrowUp")) return ACTION.JUMP;
  return ACTION.NONE;
}

function frame(time) {
  if (!running) return;
  if (!lastFrame) lastFrame = time;
  const steps = Number(ui.stepRate.value);

  for (let i = 0; i < steps; i += 1) {
    const input = ui.aiToggle.checked && aiAgent ? aiAgent(getState()) : manualAction();
    const result = step(input);
    if (result.done) {
      running = false;
      break;
    }
  }

  lastFrame = time;
  if (running) requestAnimationFrame(frame);
}

function play() {
  if (!state.alive) reset();
  if (running) return;
  running = true;
  ui.overlay.hidden = true;
  requestAnimationFrame(frame);
}

function pause() {
  running = false;
  ui.overlay.hidden = false;
  ui.overlay.querySelector("strong").textContent = "Pausado";
}

function setAgent(agent) {
  aiAgent = typeof agent === "function" ? agent : null;
  ui.aiToggle.checked = Boolean(aiAgent);
}

function relu(value) {
  return Math.max(0, value);
}

function dotVectorMatrix(vector, matrix) {
  return matrix[0].map((_, column) => {
    return vector.reduce((sum, value, row) => sum + value * matrix[row][column], 0);
  });
}

function addVectors(a, b) {
  return a.map((value, index) => value + b[index]);
}

function obstacleTypeCode(type) {
  if (type === "smallCactus") return 0;
  if (type === "largeCactus") return 0.5;
  if (type === "bird") return 1;
  return 0;
}

function buildNumpyInputs(gameState) {
  return [
    gameState.obstacleDistance === null ? 1 : Math.max(0, Math.min(gameState.obstacleDistance / CONFIG.width, 1)),
    gameState.obstacleWidth / 160,
    gameState.obstacleHeight / 120,
    gameState.obstacleY / CONFIG.height,
    gameState.speed / 12,
    gameState.dinoY / 160,
    gameState.dinoVelocityY / CONFIG.jumpVelocity,
    gameState.grounded ? 1 : 0,
    gameState.ducking ? 1 : 0,
    obstacleTypeCode(gameState.obstacleType),
  ];
}

function createNumpyAgent(brain) {
  return (gameState) => {
    const inputs = buildNumpyInputs(gameState);
    const hiddenRaw = addVectors(dotVectorMatrix(inputs, brain.w1), brain.b1);
    const hidden = hiddenRaw.map(relu);
    const output = addVectors(dotVectorMatrix(hidden, brain.w2), brain.b2);
    let bestIndex = 0;

    for (let i = 1; i < output.length; i += 1) {
      if (output[i] > output[bestIndex]) bestIndex = i;
    }

    return bestIndex;
  };
}

async function loadNumpyBrain(path = "dino_brain.json") {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Nao foi possivel carregar ${path}`);
  }

  const brain = await response.json();
  setAgent(createNumpyAgent(brain));
  ui.overlay.hidden = false;
  ui.overlay.querySelector("strong").textContent = "IA NumPy carregada";
  return brain;
}

function runEpisode(agent, maxSteps = 5000) {
  reset();
  let totalReward = 0;
  let result = { state: getState(), reward: 0, done: false };

  for (let i = 0; i < maxSteps && !result.done; i += 1) {
    const action = typeof agent === "function" ? agent(getState()) : ACTION.NONE;
    result = step(action, { render: false });
    totalReward += result.reward;
  }

  updateUi();
  draw();
  return {
    score: Math.floor(state.score),
    totalReward: Number(totalReward.toFixed(4)),
    steps: state.tick,
    done: result.done,
    state: getState(),
  };
}

document.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "Space") event.preventDefault();
  if (event.code === "KeyR") reset();
  if (event.code === "KeyP") pause();
  if (event.code === "KeyU") play();
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

ui.startBtn.addEventListener("click", play);
ui.pauseBtn.addEventListener("click", pause);
ui.resetBtn.addEventListener("click", () => {
  running = false;
  reset();
});
ui.stepRate.addEventListener("input", updateUi);

window.DinoEnv = {
  ACTION,
  reset,
  step,
  getState,
  play,
  pause,
  setAgent,
  loadNumpyBrain,
  runEpisode,
};

reset();
