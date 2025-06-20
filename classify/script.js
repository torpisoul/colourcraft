document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const scoreElement = document.getElementById('score');
    const highscoreElement = document.getElementById('highscore');
    const timerBar = document.getElementById('timer-bar');
    const gameImage = document.getElementById('game-image');
    const classificationOptions = document.getElementById('classification-options');
    const gameContainer = document.getElementById('game-container');
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalScoreElement = document.getElementById('final-score');
    const restartButton = document.getElementById('restart-button');
    const streakCounter = document.getElementById('streak-counter');
    const playerModalBackdrop = document.getElementById('player-modal-backdrop');
    const playerForm = document.getElementById('player-form');
    const playerNameInput = document.getElementById('player-name-input');
    const newHighscoreMessage = document.getElementById('new-highscore-message');
    const leaderboardList = document.getElementById('leaderboard-list');

    // --- Game State ---
    let score = 0;
    let highscore = 0;
    let timer;
    let timeLeft = 100;
    let streak = 0;
    let playerName = '';
    let currentImage;
    let gameData = { images: [], categories: [] };

    // --- Sound Effects ---
    const correctSound = new Audio('sounds/correct.mp3');
    const incorrectSound = new Audio('sounds/incorrect.mp3');
    const gameOverSound = new Audio('sounds/game-over.mp3');

    // ===================================================================
    // --- PLAYER IDENTITY & LOCAL STORAGE ---
    // ===================================================================

    function checkPlayerIdentity() {
        playerName = localStorage.getItem('classifyPlayerName');
        if (!playerName) {
            playerModalBackdrop.classList.remove('hidden');
        } else {
            initializeGame();
        }
    }

    playerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        playerName = playerNameInput.value.trim();
        if (playerName) {
            localStorage.setItem('classifyPlayerName', playerName);
            playerModalBackdrop.classList.add('hidden');
            initializeGame();
        }
    });

    function loadHighscore() {
        highscore = parseInt(localStorage.getItem('classifyHighScore') || '0');
        highscoreElement.textContent = highscore.toLocaleString();
    }

    function saveAndDisplayLeaderboard(newScore) {
        const leaderboard = JSON.parse(localStorage.getItem('classifyLeaderboard') || '[]');
        
        leaderboard.push({ name: playerName, score: newScore });
        leaderboard.sort((a, b) => b.score - a.score); // Sort descending
        
        const top10 = leaderboard.slice(0, 10); // Keep only top 10
        
        localStorage.setItem('classifyLeaderboard', JSON.stringify(top10));

        // Display it
        leaderboardList.innerHTML = ''; // Clear old list
        top10.forEach(entry => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="player-name">${entry.name}</span><span class="player-score">${entry.score.toLocaleString()}</span>`;
            leaderboardList.appendChild(li);
        });
    }

    // ===================================================================
    // --- GAME LOGIC ---
    // ===================================================================

    async function initializeGame() {
        loadHighscore();
        if (gameData.images.length === 0) {
            await loadGameData();
        }
        startGame();
    }

    async function loadGameData() {
        try {
            const response = await fetch('dataset.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            gameData = await response.json();
            console.log("Game data loaded!");
        } catch (error) {
            console.error("Could not load game data:", error);
            gameContainer.innerHTML = '<h2>Could not load game data. Please refresh.</h2>';
        }
    }

    function startGame() {
        score = 0;
        streak = 0;
        timeLeft = 100;
        
        updateUI();
        gameContainer.classList.remove('hidden');
        gameOverScreen.classList.add('hidden');
        streakCounter.classList.add('hidden');
        newHighscoreMessage.classList.add('hidden');

        loadNextImage();
        startTimer();
    }

    function loadNextImage() {
        classificationOptions.innerHTML = '';
        currentImage = gameData.images[Math.floor(Math.random() * gameData.images.length)];
        gameImage.src = currentImage.url;

        const correctAnswer = currentImage.category;
        const allCategories = gameData.categories;
        const options = [correctAnswer];

        while (options.length < 4) {
            const randomCategory = allCategories[Math.floor(Math.random() * allCategories.length)];
            if (!options.includes(randomCategory)) options.push(randomCategory);
        }
        
        shuffleArray(options);
        
        options.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.classList.add('option-button');
            button.addEventListener('click', () => handleClassification(option));
            classificationOptions.appendChild(button);
        });
    }

    function handleClassification(selectedOption) {
        document.querySelectorAll('.option-button').forEach(btn => btn.disabled = true);
        clearInterval(timer);

        let isCorrect = selectedOption === currentImage.category;

        if (isCorrect) {
            // --- New Scoring Logic ---
            const pointsFromTime = Math.round(timeLeft * 10);
            const streakBonus = streak * 100;
            score += pointsFromTime + streakBonus;
            
            streak++;
            correctSound.play();
            updateStreakCounter();
        } else {
            streak = 0;
            incorrectSound.play();
            streakCounter.classList.add('hidden');
        }
        
        // Visual Feedback
        const buttons = document.querySelectorAll('.option-button');
        buttons.forEach(button => {
            if (button.textContent === currentImage.category) button.classList.add('correct');
            else if (button.textContent === selectedOption) button.classList.add('incorrect');
        });
        
        updateUI();

        // --- New Pacing Logic ---
        setTimeout(() => {
            if (timeLeft > 0) {
                timeLeft = 100;
                loadNextImage();
                startTimer();
            } else {
                endGame();
            }
        }, isCorrect ? 400 : 1500); // Faster transition on correct answer
    }

    function startTimer() {
        timer = setInterval(() => {
            timeLeft -= 0.5; // Slower timer for more scoring variance (20s total)
            timerBar.style.width = `${timeLeft}%`;
            if (timeLeft <= 0) {
                clearInterval(timer);
                endGame();
            }
        }, 100);
    }

    function updateUI() {
        scoreElement.textContent = score.toLocaleString();
    }
    
    function updateStreakCounter() {
        if (streak > 1) {
            streakCounter.textContent = `Streak x${streak}`;
            streakCounter.classList.remove('hidden');
            // Re-trigger animation
            streakCounter.style.animation = 'none';
            streakCounter.offsetHeight; // Trigger reflow
            streakCounter.style.animation = null; 
        } else {
            streakCounter.classList.add('hidden');
        }
    }

    function endGame() {
        gameOverSound.play();
        gameContainer.classList.add('hidden');
        gameOverScreen.classList.remove('hidden');
        finalScoreElement.textContent = score.toLocaleString();

        // High Score Logic
        if (score > highscore) {
            newHighscoreMessage.classList.remove('hidden');
            highscore = score;
            localStorage.setItem('classifyHighScore', highscore);
            loadHighscore();
        }

        // Leaderboard Logic
        saveAndDisplayLeaderboard(score);
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    restartButton.addEventListener('click', startGame);

    // --- Initial Entry Point ---
    checkPlayerIdentity();
});