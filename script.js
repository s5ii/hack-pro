const player = document.getElementById("player");
const gameArea = document.getElementById("gameArea");
const levelSpan = document.getElementById("level");
const scoreSpan = document.getElementById("score");

let playerPos = { x: 10, y: 0 };
let velocityY = 0;
let onGround = true;
let score = 0;
let level = 1;

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") move(-10);
  if (e.key === "ArrowRight") move(10);
  if (e.key === "ArrowUp") jump();
});

function move(dx) {
  playerPos.x += dx;
  if(playerPos.x < 0) playerPos.x = 0;
  if(playerPos.x > 470) playerPos.x = 470;
  updatePlayer();
}

function jump() {
  if(onGround){
    velocityY = -15;
    onGround = false;
  }
}

function updatePlayer() {
  player.style.left = playerPos.x + "px";
  player.style.bottom = playerPos.y + "px";
}

function gameLoop() {
  velocityY += 0.8; // جاذبية
  playerPos.y -= velocityY;
  
  if(playerPos.y <= 0) {
    playerPos.y = 0;
    velocityY = 0;
    onGround = true;
  }

  // تحقق من التصادم مع المنصات
  document.querySelectorAll(".platform").forEach(p => {
    const platX = p.offsetLeft;
    const platY = gameArea.offsetHeight - p.offsetTop - 10; // bottom
    if(playerPos.x + 30 > platX && playerPos.x < platX + 100 &&
       playerPos.y <= platY && playerPos.y >= platY - 10 && velocityY > 0) {
      playerPos.y = platY;
      velocityY = 0;
      onGround = true;
      score += 10;
      scoreSpan.innerText = score;
    }
  });

  updatePlayer();
  requestAnimationFrame(gameLoop);
}

gameLoop();
