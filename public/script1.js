const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const leaderboardElement = document.getElementById('leaderboard');
const playerNameInput = document.getElementById('playerName');
const submitScoreBtn = document.getElementById('submitScoreBtn');

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;

canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

let board = createBoard(ROWS, COLS);
let score = 0;
let gameOver = false;
let paused = false;

const colors = ['#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff', '#fff'];

const pieces = [
  [[1, 1, 1], [0, 1, 0]], // T
  [[1, 1, 1, 1]], // I
  [[1, 1], [1, 1]], // O
  [[0, 1, 1], [1, 1, 0]], // S
  [[1, 1, 0], [0, 1, 1]], // Z
  [[1, 1, 1], [1, 0, 0]], // L
  [[1, 1, 1], [0, 0, 1]]  // J
];

let currentPiece = randomPiece();
let posX = 3;
let posY = 0;

function createBoard(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function randomPiece() {
  const index = Math.floor(Math.random() * pieces.length);
  return { piece: pieces[index], color: colors[index] };
}

function drawPiece(piece, x, y, color) {
  piece.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell) {
        context.fillStyle = color;
        context.fillRect((x + colIndex) * BLOCK_SIZE, (y + rowIndex) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        context.strokeRect((x + colIndex) * BLOCK_SIZE, (y + rowIndex) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    });
  });
}

function drawBoard() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  board.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell) {
        context.fillStyle = cell;
        context.fillRect(colIndex * BLOCK_SIZE, rowIndex * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        context.strokeRect(colIndex * BLOCK_SIZE, rowIndex * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    });
  });
  drawPiece(currentPiece.piece, posX, posY, currentPiece.color);
}

function movePiece(dx, dy) {
  posX += dx;
  posY += dy;
  if (collides()) {
    posX -= dx;
    posY -= dy;
  }
}

function dropPiece() {
  posY++;
  if (collides()) {
    posY--;
    mergePiece();
    currentPiece = randomPiece();
    posX = 3;
    posY = 0;

    if (collides()) {
      gameOverHandler();
    }
  }
}

function collides() {
  return currentPiece.piece.some((row, rowIndex) => {
    return row.some((cell, colIndex) => {
      if (cell) {
        const newY = posY + rowIndex;
        const newX = posX + colIndex;
        return newY >= ROWS || newX < 0 || newX >= COLS || board[newY][newX];
      }
      return false;
    });
  });
}

function mergePiece() {
  currentPiece.piece.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell) {
        board[posY + rowIndex][posX + colIndex] = currentPiece.color;
      }
    });
  });
  clearRows();
}

function clearRows() {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row].every(cell => cell)) {
      board.splice(row, 1);
      board.unshift(new Array(COLS).fill(0));
      score += 10;
      scoreElement.textContent = score;
    }
  }
}

function update() {
  if (!gameOver && !paused) {
    dropPiece();
    drawBoard();
  }
}

function restartGame() {
  board = createBoard(ROWS, COLS);
  score = 0;
  posX = 3;
  posY = 0;
  currentPiece = randomPiece();
  gameOver = false;
  paused = false;
  scoreElement.textContent = score;
}

function rotatePiece() {
  const oldPiece = currentPiece.piece;
  const rotatedPiece = currentPiece.piece[0].map((_, index) => currentPiece.piece.map(row => row[index]).reverse());

  currentPiece.piece = rotatedPiece;
  if (collides()) {
    currentPiece.piece = oldPiece; // Revertir si hay colisión
  }
  drawBoard();
}

document.getElementById('pauseBtn').addEventListener('click', () => {
  paused = !paused;
});

document.getElementById('restartBtn').addEventListener('click', restartGame);

document.addEventListener('keydown', (event) => {
  if (!gameOver && !paused) {
    switch (event.key) {
      case 'ArrowLeft':
        movePiece(-1, 0);
        break;
      case 'ArrowRight':
        movePiece(1, 0);
        break;
      case 'ArrowDown':
        dropPiece();
        break;
      case 'ArrowUp':
        rotatePiece();
        break;
      default:
        break;
    }
    event.preventDefault(); // Prevenir el desplazamiento de la página
  }
  drawBoard();
});

submitScoreBtn.addEventListener('click', promptForScore);

function promptForScore() {
  const name = playerNameInput.value.trim();
  const finalScore = parseInt(scoreElement.textContent, 10);
  console.log(name,finalScore);
  if (name && !isNaN(finalScore)) {
    saveScore(name, finalScore);
  } else {
    alert('Por favor ingresa un nombre y asegúrate de que el puntaje sea válido.');
  }
}

function saveScore(name, score) {
  fetch('/submit-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, score }),
  })
    .then(response => response.text())
    .then(data => {
      console.log('Puntaje registrado:', data);
      renderLeaderboard();
    })
    .catch(error => {
      console.error('Error al registrar el puntaje:', error);
    });
}

function renderLeaderboard() {
  fetch('/leaderboard')
    .then(response => response.json())
    .then(data => {
      leaderboardElement.innerHTML = '';
      data.forEach(entry => {
        const li = document.createElement('li');
        li.textContent = `${entry.name}: ${entry.score}`;
        leaderboardElement.appendChild(li);
      });
    })
    .catch(error => {
      console.error('Error al obtener la tabla de puntajes:', error);
    });
}

function gameOverHandler() {
  gameOver = true;
  promptForScore();
}

// Mobile touch gesture support
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

canvas.addEventListener('touchstart', handleTouchStart, false);
canvas.addEventListener('touchmove', handleTouchMove, false);
canvas.addEventListener('touchend', handleTouchEnd, false);

function handleTouchStart(event) {
  const touch = event.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}

function handleTouchMove(event) {
  const touch = event.touches[0];
  touchEndX = touch.clientX;
  touchEndY = touch.clientY;
}

function handleTouchEnd() {
  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;

  if (Math.abs(dx) > Math.abs(dy)) {
    movePiece(dx > 0 ? 1 : -1, 0); // Move right or left
  } else {
    dropPiece(); // Accelerate drop
  }

  // Small movement for rotation
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
    rotatePiece(); // Rotate piece
  }

  drawBoard();
}

setInterval(update, 500);
renderLeaderboard();