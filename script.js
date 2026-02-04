// ===== إعدادات اللعبة =====
const gameArea = document.getElementById("gameArea");
gameArea.style.width = "580px";
gameArea.style.height = "400px";
gameArea.style.overflow = "hidden";
gameArea.style.position = "relative";
gameArea.style.border = "2px solid #000";

const gameAreaInner = document.createElement("div");
gameAreaInner.id = "gameAreaInner";
gameAreaInner.style.position = "absolute";
gameAreaInner.style.left = "0px";
gameAreaInner.style.bottom = "0px";
gameArea.appendChild(gameAreaInner);

const levelSpan = document.getElementById("level");
const scoreSpan = document.getElementById("score");
const bar = document.getElementById("bar");
const endScreen = document.getElementById("endScreen");
const finalScore = document.getElementById("finalScore");
const jumpSound = document.getElementById("jumpSound");
const finishSound = document.getElementById("finishSound");

// ===== متغيرات =====
let player, playerPos, velocityY, onGround;
let rotation = 0, tilt = 0, direction = 1;
let keys = {}, score = 0, level = 1;
const MAX_LEVEL = 30;
const LEVEL_WIDTH = 2200;

let platforms = [];
let obstacles = [];
let gate = null;

// فيزياء
let jumpPower = 14;
let moveSpeed = 3.5;
let gravityUp = 0.6;
let gravityDown = 1.2;

// ===== اللاعب =====
function createPlayer() {
  player = document.createElement("div");
  player.style.width = "30px";
  player.style.height = "30px";
  player.style.background = "green";
  player.style.position = "absolute";
  player.style.borderRadius = "6px";
  gameAreaInner.appendChild(player);

  playerPos = { x: 10, y: 50 };
  velocityY = 0;
  onGround = false;
  updatePlayer();
}

function updatePlayer() {
  player.style.left = playerPos.x + "px";
  player.style.bottom = playerPos.y + "px";
  player.style.transform = `rotate(${rotation}deg) skewX(${tilt}deg)`;
}

// ===== منصات =====
function addPlatform(x, y, moving = false) {
  const p = document.createElement("div");
  p.style.position = "absolute";
  p.style.width = "110px";
  p.style.height = "15px";
  p.style.background = "green";
  p.style.left = x + "px";
  p.style.bottom = y + "px";
  p.style.borderRadius = "5px";
  gameAreaInner.appendChild(p);

  platforms.push({ el: p, x, y, moving, dir: 1 });
}

// ===== عقبات =====
function addObstacle(x, y) {
  const o = document.createElement("div");
  o.style.position = "absolute";
  o.style.width = "25px";
  o.style.height = "25px";
  o.style.background = "red";
  o.style.left = x + "px";
  o.style.bottom = y + "px";
  o.style.borderRadius = "50%";
  gameAreaInner.appendChild(o);

  obstacles.push({ el: o, x, y });
}

// ===== بوابة النهاية =====
function createGate(x, y) {
  gate = document.createElement("div");
  gate.style.position = "absolute";
  gate.style.width = "50px";
  gate.style.height = "80px";
  gate.style.background = "gold";
  gate.style.left = x + "px";
  gate.style.bottom = y + "px";
  gate.style.borderRadius = "10px";
  gate.style.boxShadow = "0 0 15px yellow";
  gameAreaInner.appendChild(gate);
}

// ===== توليد المرحلة =====
function createPlatforms() {
  platforms.forEach(p => p.el.remove());
  obstacles.forEach(o => o.el.remove());
  if (gate) gate.remove();

  platforms = [];
  obstacles = [];
  gate = null;

  let x = 50;
  let lastY = 80;

  const COUNT = 22;
  const MIN_GAP = 140;
  const MAX_GAP = 230;
  const MIN_Y = 60;
  const MAX_Y = 280;

  for (let i = 0; i < COUNT; i++) {
    const gap = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
    x += gap;

    let y = lastY + (Math.random() * 120 - 60);
    y = Math.max(MIN_Y, Math.min(MAX_Y, y));
    lastY = y;

    const moving = Math.random() > 0.7;
    addPlatform(x, y, moving);

    // إضافة عقبات ذكية
    if (Math.random() > 0.6) {
      addObstacle(x + 40, y + 20);
    }
  }

  // بوابة النهاية
  createGate(LEVEL_WIDTH - 80, 80);
}

// ===== تحكم =====
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

function move(dx) {
  playerPos.x += dx;
  if (playerPos.x < 0) playerPos.x = 0;
  if (playerPos.x > LEVEL_WIDTH - 30)
    playerPos.x = LEVEL_WIDTH - 30;
}

function jump() {
  if (onGround) {
    velocityY = jumpPower;
    onGround = false;
    rotation += 15 * direction;
    jumpSound.play();
  }
}

// ===== تحديث المنصات المتحركة =====
function updatePlatforms() {
  platforms.forEach(p => {
    if (!p.moving) return;
    p.x += p.dir * 1.5;
    if (p.x < 50 || p.x > LEVEL_WIDTH - 150) {
      p.dir *= -1;
    }
    p.el.style.left = p.x + "px";
  });
}

// ===== تصادم العقبات =====
function checkObstacles() {
  obstacles.forEach(o => {
    if (
      playerPos.x + 30 > o.x &&
      playerPos.x < o.x + 25 &&
      playerPos.y + 30 > o.y &&
      playerPos.y < o.y + 25
    ) {
      // إعادة اللاعب للبداية
      playerPos.x = 10;
      playerPos.y = 100;
      velocityY = 0;
    }
  });
}

// ===== الحلقة الرئيسية =====
function gameLoop() {
  if (keys["ArrowLeft"]) {
    direction = -1;
    move(-moveSpeed);
  }
  if (keys["ArrowRight"]) {
    direction = 1;
    move(moveSpeed);
  }
  if (keys["ArrowUp"]) jump();

  const gravity = velocityY > 0 ? gravityUp : gravityDown;
  velocityY -= gravity;
  playerPos.y += velocityY;

  if (!onGround) {
    rotation += 4 * direction;
    tilt = Math.max(-10, Math.min(10, tilt + 2 * direction));
  } else {
    rotation *= 0.8;
    tilt *= 0.7;
  }

  if (playerPos.y < 0) {
    playerPos.y = 0;
    velocityY = 0;
    onGround = true;
  }

  updatePlatforms();

  // تصادم المنصات
  onGround = false;
  platforms.forEach(p => {
    if (
      playerPos.x + 30 > p.x &&
      playerPos.x < p.x + 110 &&
      playerPos.y <= p.y + 15 &&
      playerPos.y >= p.y &&
      velocityY < 0
    ) {
      playerPos.y = p.y + 15;
      velocityY = 0;
      onGround = true;
      score++;
      scoreSpan.innerText = score;
      bar.style.width = Math.min(score * 2, 100) + "%";
    }
  });

  checkObstacles();

  // كاميرا يمين فقط
  const cameraLeft = Math.min(
    Math.max(playerPos.x - 200, 0),
    LEVEL_WIDTH - 580
  );
  gameAreaInner.style.left = -cameraLeft + "px";

  // بوابة النهاية
  if (
    playerPos.x + 30 > LEVEL_WIDTH - 80 &&
    playerPos.y < 160
  ) {
    finishStage();
  }

  updatePlayer();
  requestAnimationFrame(gameLoop);
}

// ===== المراحل =====
function finishStage() {
  finishSound.play();
  if (level >= MAX_LEVEL) {
    endGame();
    return;
  }
  level++;
  levelSpan.innerText = level;
  playerPos = { x: 10, y: 100 };
  velocityY = 0;
  createPlatforms();
}

// ===== النهاية =====
function endGame() {
  finalScore.innerText = score;
  endScreen.classList.remove("hidden");
  gameAreaInner.innerHTML = "";
}

// ===== إعادة التشغيل =====
function restartGame() {
  score = 0;
  level = 1;
  scoreSpan.innerText = score;
  levelSpan.innerText = level;
  bar.style.width = "0%";
  endScreen.classList.add("hidden");
  createPlayer();
  createPlatforms();
}

// ===== بدء =====
createPlayer();
createPlatforms();
gameLoop();
