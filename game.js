const tubes = document.querySelectorAll('.tube');
const resetBtn = document.getElementById('reset-btn');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const gameLevelElement = document.getElementById('game-level');
const winPopup = document.getElementById('win-popup');
const nextLevelBtn = document.getElementById('next-level-btn');
const closePopupBtn = document.getElementById('close-popup-btn');
const bgMusic = document.getElementById('bg-music');
const musicToggle = document.getElementById('music-toggle');
const currentScoreElement = document.getElementById('current-score');
const bestScoreElement = document.getElementById('best-score');

// Toggle Popup Elements
const toggleIcon = document.getElementById('toggle-icon');
const togglePopup = document.getElementById('toggle-popup');
const closeTogglePopupBtn = document.getElementById('close-toggle-popup-btn');
const musicToggleBtn = document.getElementById('music-toggle-btn');
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const difficultySelect = document.getElementById('difficulty-select');

let selectedTube = null;
let gameState = [];
let currentLevel = 1;
const maxLevel = 1000;
const colors = ['frout-1', 'frout-2', 'frout-3', 'frout-4'];
const colorMap = {
  'frout-1': './asset/frout-1.png',
  'frout-2': './asset/frout-2.png',
  'frout-3': './asset/frout-3.png',
  'frout-4': './asset/frout-4.png'
};

// Undo and Redo system
let gameStateHistory = [];
let redoHistory = [];
const MAX_HISTORY_LENGTH = 10;

// Score tracking
let currentScore = 0;
let bestScore = localStorage.getItem('bestScore') || 0;

// Deep clone game state
function deepCloneGameState(state) {
  return state.map(tube => [...tube]);
}

// Save current state before a move
function saveCurrentState() {
  // Deep clone the current game state
  const currentStateCopy = deepCloneGameState(gameState);
  
  // Add to history
  gameStateHistory.push(currentStateCopy);
  
  // Limit history length
  if (gameStateHistory.length > MAX_HISTORY_LENGTH) {
    gameStateHistory.shift();
  }
  
  // Clear redo history when a new move is made
  redoHistory = [];
  
  // Update button states
  updateUndoRedoButtons();
}

// Update undo and redo button states
function updateUndoRedoButtons() {
  if (undoBtn) {
    undoBtn.style.opacity = gameStateHistory.length === 0 ? 0.5 : 1;
    undoBtn.style.cursor = gameStateHistory.length === 0 ? 'not-allowed' : 'pointer';
  }
  
  if (redoBtn) {
    redoBtn.style.opacity = redoHistory.length === 0 ? 0.5 : 1;
    redoBtn.style.cursor = redoHistory.length === 0 ? 'not-allowed' : 'pointer';
  }
}

// Undo last move
function undoMove() {
  if (gameStateHistory.length > 0) {
    // Save current state to redo history
    const currentStateCopy = deepCloneGameState(gameState);
    redoHistory.push(currentStateCopy);
    
    // Restore previous state
    gameState = gameStateHistory.pop();
    renderGame();
    updateUndoRedoButtons();
  }
}

// Redo last undone move
function redoMove() {
  if (redoHistory.length > 0) {
    // Save current state to undo history
    const currentStateCopy = deepCloneGameState(gameState);
    gameStateHistory.push(currentStateCopy);
    
    // Restore next state
    gameState = redoHistory.pop();
    renderGame();
    updateUndoRedoButtons();
  }
}

// Load or initialize game level from localStorage
function initializeGameLevel() {
  const savedLevel = localStorage.getItem('waterSortLevel');
  currentLevel = savedLevel ? parseInt(savedLevel, 10) : 1;
  gameLevelElement.textContent = currentLevel;
}

// Save current level to localStorage
function saveGameLevel() {
  localStorage.setItem('waterSortLevel', currentLevel.toString());
}

// Generate game state with partially filled tubes
function generateRandomGameState() {
  const allColors = [];

  // Adjust color distribution based on level
  const colorCount = Math.min(4 + Math.floor(currentLevel / 10), 8);
  const dynamicColors = colors.slice(0, colorCount);

  // Add 4 of each color to the pool
  dynamicColors.forEach(color => {
    for (let i = 0; i < 4; i++) {
      allColors.push(color);
    }
  });

  // Shuffle the color pool
  for (let i = allColors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
        [allColors[i], allColors[j]] = [allColors[j], allColors[i]];
  }

  // Distribute colors into tubes with random empty spaces
  gameState = Array.from({ length: 4 + Math.floor(currentLevel / 10) }, () => []);

  allColors.forEach(color => {
    // Randomly choose a non-full tube (max 3 for partial fill)
    const availableTubes = gameState.filter(tube => tube.length < 3); // Leave space at the bottom
    if (availableTubes.length > 0) {
      const randomTube = availableTubes[Math.floor(Math.random() * availableTubes.length)];
      randomTube.push(color);
    }
  });

  // Reset histories when generating new game state
  gameStateHistory = [];
  redoHistory = [];
  updateUndoRedoButtons();
}

// Render the game state visually (fill from top)
function renderGame() {
  tubes.forEach((tube, index) => {
    tube.innerHTML = '';
    const tubeState = gameState[index];
    const emptySpaces = 4 - tubeState.length; // Calculate empty space at the bottom

    // Render liquids in normal order (top to bottom)
    tubeState.forEach(color => {
      const liquid = document.createElement('div');
      liquid.classList.add('liquid');
      liquid.style.backgroundImage = `url(${colorMap[color]})`;
      liquid.style.height = `${100 / 4}%`;
      tube.appendChild(liquid);
    });

    // Render empty space (after liquids)
    for (let i = 0; i < emptySpaces; i++) {
      const emptyBlock = document.createElement('div');
      emptyBlock.classList.add('liquid');
      emptyBlock.style.height = `${100 / 4}%`;
      emptyBlock.style.backgroundImage = 'none'; // Empty space is transparent
      tube.appendChild(emptyBlock);
    }
  });
}

// Handle tube selection and pouring
tubes.forEach(tube => {
  tube.addEventListener('click', () => {
    if (!selectedTube) {
      selectedTube = tube;
      tube.classList.add('selected');
    } else {
      if (selectedTube !== tube) {
        pourLiquid(selectedTube, tube);
      }
      selectedTube.classList.remove('selected');
      selectedTube = null;
    }
  });
});

// Pour liquid logic
function pourLiquid(fromTube, toTube) {
  // Save current state before move
  saveCurrentState();

  const fromIndex = fromTube.dataset.tube - 1;
  const toIndex = toTube.dataset.tube - 1;
  const fromLiquid = gameState[fromIndex];
  const toLiquid = gameState[toIndex];

  if (fromLiquid.length === 0) return;

  const topColor = fromLiquid[fromLiquid.length - 1];
  let pourCount = 0;

  // Count how many of the top color can be poured
  for (let i = fromLiquid.length - 1; i >= 0; i--) {
    if (fromLiquid[i] === topColor) {
      pourCount++;
    } else {
      break;
    }
  }

  // Pour into the target tube
  for (let i = 0; i < pourCount; i++) {
    if (toLiquid.length < 4) {
      toLiquid.push(fromLiquid.pop());
      
      // Add scoring logic
      updateScore(1);
    }
  }

  renderGame();
  checkWinCondition();
}

// Check if all tubes contain one color or are empty
function checkWinCondition() {
  const isWin = gameState.every(tube => {
    return tube.length === 0 || new Set(tube).size === 1;
  });

  if (isWin) {
    setTimeout(() => {
      showWinPopup();
    }, 300);
  }
}

// Show win popup
function showWinPopup() {
  winPopup.style.display = 'flex';
}

// Close popup
function closePopup() {
  winPopup.style.display = 'none';
}

// Next level logic
function nextLevel() {
  if (currentLevel < maxLevel) {
    currentLevel++;
    gameLevelElement.textContent = currentLevel;
    saveGameLevel(); // Save the current level
    generateRandomGameState();
    renderGame();
    resetScore(); // Reset score when moving to next level
    closePopup();
  } else {
    alert('Congratulations! You have completed all levels!');
    closePopup();
  }
}

// Event listeners for popup buttons
nextLevelBtn.addEventListener('click', nextLevel);
closePopupBtn.addEventListener('click', closePopup);

// Add event listeners for undo and redo buttons
undoBtn.addEventListener('click', undoMove);
redoBtn.addEventListener('click', redoMove);

// Reset game without changing level
resetBtn.addEventListener('click', () => {
  // Generate a new random game state while keeping the current level
  generateRandomGameState();
  renderGame();
  resetScore(); // Reset score when resetting the game
});

// Initialize score display
bestScoreElement.textContent = bestScore;

// Function to update score
function updateScore(points) {
  currentScore += points;
  currentScoreElement.textContent = currentScore;

  // Update best score if needed
  if (currentScore > bestScore) {
    bestScore = currentScore;
    bestScoreElement.textContent = bestScore;
    localStorage.setItem('bestScore', bestScore);
  }
}

// Reset score when starting a new game or level
function resetScore() {
  currentScore = 0;
  currentScoreElement.textContent = currentScore;
}

// Music Toggle Functionality
let isMusicPlaying = false;

function startBackgroundMusic() {
  const playPromise = bgMusic.play();
  
  if (playPromise !== undefined) {
    playPromise.then(() => {
      // Successful autoplay
      isMusicPlaying = true;
      musicToggleBtn.textContent = 'On';
      musicToggleBtn.classList.add('music-on');
      musicToggleBtn.classList.remove('music-off');
    }).catch(error => {
      // Autoplay was prevented
      console.log('Autoplay was prevented:', error);
      isMusicPlaying = false;
      musicToggleBtn.textContent = 'Off';
      musicToggleBtn.classList.add('music-off');
      musicToggleBtn.classList.remove('music-on');
    });
  }
}

function stopBackgroundMusic() {
  bgMusic.pause();
  isMusicPlaying = false;
  musicToggleBtn.textContent = 'Off';
  musicToggleBtn.classList.add('music-off');
  musicToggleBtn.classList.remove('music-on');
}

// Music Toggle in Popup
musicToggleBtn.addEventListener('click', () => {
  if (!isMusicPlaying) {
    startBackgroundMusic();
  } else {
    stopBackgroundMusic();
  }
});

// Initial music setup
document.addEventListener('DOMContentLoaded', () => {
  // Set initial state
  musicToggleBtn.textContent = 'Off';
  musicToggleBtn.classList.add('music-off');
  
  // Attempt to start music, but respect browser autoplay restrictions
  bgMusic.volume = 0.5; // Set a moderate volume
  bgMusic.loop = true;
});

// Toggle Popup Functionality
toggleIcon.addEventListener('click', () => {
  togglePopup.style.display = 'flex';
  togglePopup.style.justifyContent = 'center';
  togglePopup.style.alignItems = 'center';
});

closeTogglePopupBtn.addEventListener('click', () => {
  togglePopup.style.display = 'none';
});

// Ensure toggle popup is hidden on page load
togglePopup.style.display = 'none';

// Sound Effects Toggle (placeholder for future implementation)
soundToggleBtn.addEventListener('click', () => {
  if (soundToggleBtn.textContent === 'Off') {
    soundToggleBtn.textContent = 'On';
    // TODO: Implement sound effects
  } else {
    soundToggleBtn.textContent = 'Off';
    // TODO: Disable sound effects
  }
});

// Difficulty Selection
difficultySelect.addEventListener('change', (event) => {
  const selectedDifficulty = event.target.value;
  // TODO: Implement difficulty logic
  console.log(`Difficulty set to: ${selectedDifficulty}`);
});

// Initialize game
function initializeGame() {
  initializeGameLevel(); // Load saved level
  generateRandomGameState();
  renderGame();
}

// Add event listener to start music when game initializes
document.addEventListener('DOMContentLoaded', () => {
  initializeGame();
});