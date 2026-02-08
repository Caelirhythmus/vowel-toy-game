// Game variables
let currentPair = null;
let timer = null;
let timeLeft = 0;
let gameActive = false;
let correctCount = 0;
let incorrectCount = 0;
let totalAttempts = 0;

// DOM elements
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const timeSelect = document.getElementById('time-select');
const timerDisplay = document.getElementById('timer-display');
const wordAElement = document.getElementById('word-a');
const wordBElement = document.getElementById('word-b');
const yesBtn = document.getElementById('yes-btn');
const noBtn = document.getElementById('no-btn');
const feedbackElement = document.getElementById('feedback');
const correctCountElement = document.getElementById('correct-count');
const incorrectCountElement = document.getElementById('incorrect-count');
const totalCountElement = document.getElementById('total-count');
const gameOverModal = document.getElementById('game-over-modal');
const finalCorrectElement = document.getElementById('final-correct');
const finalIncorrectElement = document.getElementById('final-incorrect');
const finalTotalElement = document.getElementById('final-total');
const closeModalBtn = document.getElementById('close-modal');

// Constants
const CONSONANTS = ['b', 'p', 'm', 'd', 't', 'n', 'h', 'g', 'k'];
const VOWELS = ['i', 'e', 'ɛ', 'æ', 'a']; // in increasing opening degree
const OPENING_DEGREE = {
    'i': 0,
    'e': 1,
    'ɛ': 2,
    'æ': 3,
    'a': 4
};

// Generate a random CVCV word
function generateWord() {
    const c1 = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    const v1 = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    const c2 = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    const v2 = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    return {
        string: c1 + v1 + c2 + v2,
        c1, v1, c2, v2
    };
}

// Generate a pair of words with same consonants, random vowels
function generateWordPair() {
    const c1 = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    const c2 = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    const v1a = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    const v2a = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    const v1b = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    const v2b = VOWELS[Math.floor(Math.random() * VOWELS.length)];

    const wordA = {
        string: c1 + v1a + c2 + v2a,
        c1, v1: v1a, c2, v2: v2a
    };
    const wordB = {
        string: c1 + v1b + c2 + v2b,
        c1, v1: v1b, c2, v2: v2b
    };

    return { wordA, wordB };
}

// Determine if change from A to B is possible
function canChange(wordA, wordB) {
    // For each vowel position, check if opening degree of A >= opening degree of B
    // Actually, change is allowed only if A's vowel has larger or equal opening degree? 
    // Rule says: 开口度大的往开口度小的演变，反之则无法演变。
    // So if A.v1 opening degree > B.v1 opening degree, then change is allowed for that position.
    // If equal, then it's also allowed (no change needed).
    // So we require: opening(A.v1) >= opening(B.v1) and opening(A.v2) >= opening(B.v2)
    const v1Ok = OPENING_DEGREE[wordA.v1] >= OPENING_DEGREE[wordB.v1];
    const v2Ok = OPENING_DEGREE[wordA.v2] >= OPENING_DEGREE[wordB.v2];
    return v1Ok && v2Ok;
}

// Update the displayed words
function displayWords(pair) {
    wordAElement.textContent = pair.wordA.string;
    wordBElement.textContent = pair.wordB.string;
}

// Start the game
function startGame() {
    if (gameActive) return;
    gameActive = true;
    timeLeft = parseInt(timeSelect.value);
    timerDisplay.textContent = timeLeft;
    correctCount = 0;
    incorrectCount = 0;
    totalAttempts = 0;
    updateStats();

    // Enable choice buttons
    yesBtn.disabled = false;
    noBtn.disabled = false;

    // Generate first pair
    currentPair = generateWordPair();
    displayWords(currentPair);

    // Clear feedback
    feedbackElement.textContent = "Choose 'Can Change' or 'Cannot Change'.";
    feedbackElement.className = 'feedback';

    // Start timer
    timer = setInterval(updateTimer, 1000);

    // Change start button to pause? We'll keep it simple, start button disabled while game active
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fas fa-pause"></i> Game Running';
    startBtn.classList.remove('start');
    startBtn.classList.add('reset');
}

// Update timer
function updateTimer() {
    timeLeft--;
    timerDisplay.textContent = timeLeft;

    if (timeLeft <= 0) {
        endGame();
    }
}

// End game
function endGame() {
    gameActive = false;
    clearInterval(timer);
    yesBtn.disabled = true;
    noBtn.disabled = true;
    startBtn.disabled = false;
    startBtn.innerHTML = '<i class="fas fa-play"></i> Start Game';
    startBtn.classList.remove('reset');
    startBtn.classList.add('start');

    // Show modal with final stats
    finalCorrectElement.textContent = correctCount;
    finalIncorrectElement.textContent = incorrectCount;
    finalTotalElement.textContent = totalAttempts;
    gameOverModal.style.display = 'flex';
}

// Update statistics display
function updateStats() {
    correctCountElement.textContent = correctCount;
    incorrectCountElement.textContent = incorrectCount;
    totalCountElement.textContent = totalAttempts;
}

// Handle player's choice
function handleChoice(choice) {
    if (!gameActive || !currentPair) return;

    const correctAnswer = canChange(currentPair.wordA, currentPair.wordB);
    totalAttempts++;
    let isCorrect = false;

    if ((choice === 'yes' && correctAnswer) || (choice === 'no' && !correctAnswer)) {
        // Correct
        isCorrect = true;
        correctCount++;
        feedbackElement.textContent = "Correct! Generating next pair...";
        feedbackElement.className = 'feedback correct';

        // Generate new pair after a short delay
        setTimeout(() => {
            if (gameActive) {
                currentPair = generateWordPair();
                displayWords(currentPair);
                feedbackElement.textContent = "Choose 'Can Change' or 'Cannot Change'.";
                feedbackElement.className = 'feedback';
            }
        }, 200);
    } else {
        // Incorrect
        incorrectCount++;
        feedbackElement.textContent = "Incorrect! Time reduced by 1 second.";
        feedbackElement.className = 'feedback incorrect';
        // Reduce time by 1 second
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        if (timeLeft <= 0) {
            endGame();
            return;
        }
        // Do not generate new pair, keep same words
    }

    updateStats();
}

// Event listeners
startBtn.addEventListener('click', startGame);

resetBtn.addEventListener('click', () => {
    // Reset everything
    clearInterval(timer);
    gameActive = false;
    timeLeft = parseInt(timeSelect.value);
    timerDisplay.textContent = timeLeft;
    correctCount = 0;
    incorrectCount = 0;
    totalAttempts = 0;
    updateStats();
    yesBtn.disabled = true;
    noBtn.disabled = true;
    startBtn.disabled = false;
    startBtn.innerHTML = '<i class="fas fa-play"></i> Start Game';
    startBtn.classList.remove('reset');
    startBtn.classList.add('start');
    wordAElement.textContent = '----';
    wordBElement.textContent = '----';
    feedbackElement.textContent = "Choose 'Can Change' or 'Cannot Change'.";
    feedbackElement.className = 'feedback';
});

yesBtn.addEventListener('click', () => handleChoice('yes'));
noBtn.addEventListener('click', () => handleChoice('no'));

closeModalBtn.addEventListener('click', () => {
    gameOverModal.style.display = 'none';
});

// Allow closing modal by clicking outside
window.addEventListener('click', (event) => {
    if (event.target === gameOverModal) {
        gameOverModal.style.display = 'none';
    }
});

// Initialize
timerDisplay.textContent = timeSelect.value;