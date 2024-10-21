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
  const board = [];
  for (let row = 0; row < rows; row++) {
    board.push(new Array(cols).fill(0));
  }
  return board;
}

function randomPiece() {
  const piece = pieces[Math.floor(Math.random() * pieces.length)];
  const color = colors[Math.floor(Math.random() * colors.length)];
  return { piece, color };
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
      // Si hay colisión al generar una nueva pieza, significa que el juego ha terminado
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
  if (gameOver) return;
  if (!paused) {
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


document.addEventListener('keydown', (event) => {
  // Verifica que el juego no haya terminado ni esté en pausa
  if (!gameOver && !paused) {
    // Prevenir el movimiento de la pantalla
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); // Evita el comportamiento predeterminado de desplazamiento de la página
    }

    if (event.key === 'ArrowLeft') movePiece(-1, 0);
    if (event.key === 'ArrowRight') movePiece(1, 0);
    if (event.key === 'ArrowDown') dropPiece();
    if (event.key === 'ArrowUp') rotatePiece();

    drawBoard(); // Dibuja el tablero en cada evento de tecla
  }
});


document.getElementById('pauseBtn').addEventListener('click', () => {
  paused = !paused;
});

document.getElementById('restartBtn').addEventListener('click', restartGame);

function rotatePiece() {
  const rotatedPiece = currentPiece.piece[0].map((val, index) => currentPiece.piece.map(row => row[index]).reverse());
  const oldPiece = currentPiece.piece;
  currentPiece.piece = rotatedPiece;
  if (collides()) {
    currentPiece.piece = oldPiece;
  }
}

function promptForScore() {
  const name = playerNameInput.value.trim();
  const finalScore = parseInt(scoreElement.textContent, 10);

  if (name && !isNaN(finalScore)) {
    saveScoreAutomatically(name, finalScore);
  }
}

function saveScoreAutomatically(name, score) {
  fetch('/submit-score', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, score }),
  })
  .then(response => response.text())
  .then(data => {
    console.log('Puntaje registrado automáticamente:', data);
    renderLeaderboard(); // Actualiza el leaderboard automáticamente
  })
  .catch(error => {
    console.error('Error al registrar el puntaje:', error);
  });
}

function loadLeaderboard() {
  return JSON.parse(localStorage.getItem('leaderboard'));
}

function renderLeaderboard() {
  leaderboardElement.innerHTML = ''; // Limpia la lista actual
  leaderboard.forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `${entry.name}: ${entry.score}`;
    leaderboardElement.appendChild(li);
  });
}

function gameOverHandler() {
  gameOver = true;  // Marca el juego como terminado
  const name = playerNameInput.value.trim();
  promptForScore(); // Registra automáticamente el puntaje
}

function renderLeaderboard() {
  fetch('/leaderboard')
    .then(response => response.json())
    .then(data => {
      leaderboardElement.innerHTML = ''; // Limpia la lista actual
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

  // Move left or right
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      movePiece(1, 0); // Move right
    } else {
      movePiece(-1, 0); // Move left
    }
  } else {
    if (dy > 0) {
      dropPiece(); // Accelerate drop
    }
  }

  // Small movement for rotation
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
    rotatePiece(); // Rotate piece
  }

  drawBoard();
}

setInterval(update, 500);
renderLeaderboard();