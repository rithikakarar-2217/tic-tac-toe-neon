/* ==========================================================
   NEON TIC-TAC-TOE — JAVASCRIPT LOGIC
   Beginner-friendly, fully-commented game logic with Web Audio sound
   effects and particle celebration effects!
   ========================================================== */

// --- 1. GAME STATE VARIABLES ---
// Keeps track of the 9 cells on the board (indexes 0 to 8)
let board = ["", "", "", "", "", "", "", "", ""];

// Player 'X' always makes the first move
let currentPlayer = "X";

// Controls whether clicks on the board should register
let gameActive = true;

// Score tracker for both players and draws
const scores = {
  X: 0,
  O: 0,
  ties: 0,
};

// Sound effects enabled by default
let soundEnabled = true;

// All 8 possible winning combinations on a 3x3 grid
const WINNING_COMBINATIONS = [
  [0, 1, 2], // Top row
  [3, 4, 5], // Middle row
  [6, 7, 8], // Bottom row
  [0, 3, 6], // Left column
  [1, 4, 7], // Middle column
  [2, 5, 8], // Right column
  [0, 4, 8], // Diagonal from top-left to bottom-right
  [2, 4, 6], // Diagonal from top-right to bottom-left
];

// --- 2. DOM ELEMENT REFERENCES ---
// Grabbing HTML elements so we can update them dynamically with JavaScript
const cells = document.querySelectorAll(".cell");
const turnIndicator = document.getElementById("turn-indicator");
const scoreXElement = document.getElementById("score-x");
const scoreOElement = document.getElementById("score-o");
const scoreTieElement = document.getElementById("score-tie");
const cardX = document.getElementById("card-x");
const cardO = document.getElementById("card-o");

const restartBtn = document.getElementById("restart-btn");
const resetScoreBtn = document.getElementById("reset-score-btn");
const soundToggleBtn = document.getElementById("sound-toggle-btn");
const soundIcon = document.getElementById("sound-icon");

// Modal Elements
const modalOverlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const modalSubtitle = document.getElementById("modal-subtitle");
const modalPlayAgainBtn = document.getElementById("modal-play-again-btn");

// Confetti Canvas
const confettiCanvas = document.getElementById("confetti-canvas");
const confettiCtx = confettiCanvas.getContext("2d");
let confettiAnimationId = null;
let confettiTimeoutId = null;
let confettiParticles = [];

// --- 3. SOUND EFFECTS ENGINE (Web Audio API) ---
// Generates pleasant retro-modern synth sounds in the browser without loading any external files
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Play tone helper
function playTone(freq, type, duration, gainLevel = 0.1) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Smooth fade-in and fade-out to prevent audio pops
    gain.gain.setValueAtTime(gainLevel, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("Audio playback not supported or blocked by browser", e);
  }
}

// Sound presets
function playMoveSound(player) {
  if (player === "X") {
    playTone(520, "sine", 0.12, 0.12);
  } else {
    playTone(390, "sine", 0.12, 0.12);
  }
}

function playWinSound() {
  if (!soundEnabled) return;
  const notes = [440, 554.37, 659.25, 880]; // Major chord arpeggio
  notes.forEach((freq, index) => {
    setTimeout(() => {
      playTone(freq, "triangle", 0.35, 0.14);
    }, index * 90);
  });
}

function playDrawSound() {
  if (!soundEnabled) return;
  playTone(280, "sawtooth", 0.25, 0.08);
  setTimeout(() => playTone(220, "sawtooth", 0.35, 0.08), 120);
}

// --- 4. CORE GAMEPLAY FUNCTIONS ---

// Handles when a player clicks on any of the 9 cells
function handleCellClick(event) {
  const clickedCell = event.currentTarget;
  const cellIndex = parseInt(clickedCell.getAttribute("data-cell-index"), 10);

  // Ignore click if the cell is already taken OR if the game is over
  if (board[cellIndex] !== "" || !gameActive) {
    return;
  }

  // 1. Update the JavaScript board state array
  board[cellIndex] = currentPlayer;

  // 2. Update the visual cell in the DOM
  clickedCell.textContent = currentPlayer === "X" ? "✕" : "◯";
  clickedCell.classList.add("taken");
  clickedCell.classList.add(currentPlayer.toLowerCase());

  // 3. Play audio effect for move
  playMoveSound(currentPlayer);

  // 4. Check if this move caused a win or a draw
  checkGameStatus();
}

// Evaluates the board to see if there is a winner or draw
function checkGameStatus() {
  let roundWon = false;
  let winningLine = null;

  // Check all 8 winning combinations
  for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
    const [a, b, c] = WINNING_COMBINATIONS[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      roundWon = true;
      winningLine = [a, b, c];
      break;
    }
  }

  // CASE 1: Current player won!
  if (roundWon) {
    handleWin(winningLine);
    return;
  }

  // CASE 2: Board is full, but no one won (It's a Draw)
  const isDraw = !board.includes("");
  if (isDraw) {
    handleDraw();
    return;
  }

  // CASE 3: Game continues -> Switch to the other player
  switchPlayer();
}

// Handles winning state
function handleWin(winningLine) {
  gameActive = false;

  // Highlight the 3 winning cells
  winningLine.forEach((index) => {
    cells[index].classList.add("winner-cell");
  });

  // Increment score
  scores[currentPlayer]++;
  updateScoreboard();

  // Play victory chime and start celebration confetti
  playWinSound();
  launchConfetti();

  // Update status text
  turnIndicator.innerHTML = `🎉 Player <span class="${currentPlayer === "X" ? "cyan-text" : "pink-text"}">${currentPlayer}</span> Wins!`;

  // Display winning modal after a brief pleasant pause
  setTimeout(() => {
    modalTitle.textContent = `Player ${currentPlayer} Wins!`;
    modalTitle.className = `modal-title win-${currentPlayer.toLowerCase()}`;
    modalSubtitle.textContent = `Spectacular victory! Player ${currentPlayer} dominated the board.`;
    openModal();
  }, 700);
}

// Handles draw state
function handleDraw() {
  gameActive = false;
  scores.ties++;
  updateScoreboard();

  playDrawSound();

  turnIndicator.innerHTML = `🤝 It's a <span class="silver-text">Draw!</span>`;

  setTimeout(() => {
    modalTitle.textContent = `It's a Draw!`;
    modalTitle.className = "modal-title draw";
    modalSubtitle.textContent = "Evenly matched battle! No one gave up an inch.";
    openModal();
  }, 600);
}

// Switches turn between Player X and Player O
function switchPlayer() {
  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateTurnDisplay();
}

// Updates UI indicators to reflect whose turn it currently is
function updateTurnDisplay() {
  const isX = currentPlayer === "X";
  const colorClass = isX ? "cyan-text" : "pink-text";

  turnIndicator.innerHTML = `Player <span class="${colorClass}">${currentPlayer}</span>'s Turn`;
  turnIndicator.className = `turn-indicator turn-${currentPlayer.toLowerCase()}`;

  // Highlight active player's score card
  if (isX) {
    cardX.classList.add("active-card");
    cardO.classList.remove("active-card");
  } else {
    cardO.classList.add("active-card");
    cardX.classList.remove("active-card");
  }
}

// Updates numbers on the scoreboard
function updateScoreboard() {
  scoreXElement.textContent = scores.X;
  scoreOElement.textContent = scores.O;
  scoreTieElement.textContent = scores.ties;
}

// --- 5. ROUND RESTART & RESET FUNCTIONS ---

// Clears the board for the next round (keeps match scores intact)
function restartRound() {
  board = ["", "", "", "", "", "", "", "", ""];
  gameActive = true;
  currentPlayer = "X"; // Player X always leads off each new round

  // Clear cells visual state
  cells.forEach((cell) => {
    cell.textContent = "";
    cell.className = "cell";
  });

  closeModal();
  stopConfetti();
  updateTurnDisplay();
}

// Resets everything, including all match scores
function resetAllScores() {
  scores.X = 0;
  scores.O = 0;
  scores.ties = 0;
  updateScoreboard();
  currentPlayer = "X";
  restartRound();
}

// --- 6. MODAL OVERLAY CONTROLS ---
function openModal() {
  modalOverlay.classList.add("active");
  modalOverlay.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modalOverlay.classList.remove("active");
  modalOverlay.setAttribute("aria-hidden", "true");
}

// --- 7. VICTORY CONFETTI ANIMATION (Pure Canvas) ---
function resizeCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function launchConfetti() {
  stopConfetti();
  resizeCanvas();

  const colors = ["#00f2fe", "#ff087f", "#00ff88", "#ffffff", "#ffd700"];
  confettiParticles = [];

  // Create 80 vibrant falling confetti particles
  for (let i = 0; i < 80; i++) {
    confettiParticles.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * -confettiCanvas.height * 0.5,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3 + 2,
      speedX: (Math.random() - 0.5) * 3,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
    });
  }

  function renderConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    confettiParticles.forEach((p) => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotationSpeed;

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      confettiCtx.restore();

      // Wrap around if particle goes below screen
      if (p.y > confettiCanvas.height) {
        p.y = -20;
        p.x = Math.random() * confettiCanvas.width;
      }
    });

    confettiAnimationId = requestAnimationFrame(renderConfetti);
  }

  renderConfetti();

  // Automatically fade out / stop confetti after 4.5 seconds
  if (confettiTimeoutId) {
    clearTimeout(confettiTimeoutId);
  }
  confettiTimeoutId = setTimeout(() => {
    stopConfetti();
  }, 4500);
}

function stopConfetti() {
  if (confettiTimeoutId) {
    clearTimeout(confettiTimeoutId);
    confettiTimeoutId = null;
  }
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
  }
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

// --- 8. AUDIO TOGGLE ---
function toggleSound() {
  soundEnabled = !soundEnabled;
  soundIcon.textContent = soundEnabled ? "🔊" : "🔇";
  soundToggleBtn.title = soundEnabled ? "Sound: ON (Click to Mute)" : "Sound: MUTED (Click to Unmute)";
}

// --- 9. EVENT LISTENERS INITIALIZATION ---
// Attach click listeners to all 9 board cells
cells.forEach((cell) => {
  cell.addEventListener("click", handleCellClick);
});

// Control buttons
restartBtn.addEventListener("click", restartRound);
resetScoreBtn.addEventListener("click", resetAllScores);
soundToggleBtn.addEventListener("click", toggleSound);
modalPlayAgainBtn.addEventListener("click", restartRound);

// Initialize starting state on page load
updateTurnDisplay();
updateScoreboard();
