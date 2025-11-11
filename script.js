// Game constants and variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameStarted = false;
let gameOver = false;
let score = 0;

// Bird properties
const bird = {
    x: 50,
    y: canvas.height / 2,
    velocity: 0,
    gravity: 0.5,
    jump: -8,
    size: 20
};

// Pipe properties
const pipeWidth = 50;
const pipeGap = 150;
const pipes = [];
let pipeTimer = 0;

// Colors
const colors = {
    bird: '#FFD700',
    pipe: '#2E8B57',
    background: '#70C5CE',
    text: '#FFFFFF'
};

// Audio system using Web Audio API
let audioContext = null;
let musicOscillator = null;
let musicGainNode = null;

// Background music via HTMLAudioElement (optional)
const bgMusic = document.getElementById('bgMusic');
const musicToggleBtn = document.getElementById('musicToggle');
let musicEnabled = false;

// Attempt muted autoplay on load to satisfy browser policies. If autoplay is
// blocked, the audio will remain muted/paused until a user gesture.
if (bgMusic) {
    try {
        bgMusic.volume = 0.35;
        bgMusic.muted = true; // muted so browsers allow autoplay
        bgMusic.loop = true;
        const playPromise = bgMusic.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                musicEnabled = true;
                if (musicToggleBtn) musicToggleBtn.textContent = 'Mute Music';
            }).catch(() => {
                musicEnabled = false;
                if (musicToggleBtn) musicToggleBtn.textContent = 'Play Music';
            });
        }
    } catch (e) {
        // ignore
    }
}

// Initialize audio context
function initAudio() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }
}

// Create sound effect using Web Audio API
function createSoundEffect(frequency, duration, type = 'sine', volume = 0.1) {
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

// Empty background music function - music disabled
function startBackgroundMusic() {
    if (!bgMusic) return;
    // Unmute and play (this should be called during a user gesture)
    bgMusic.muted = false;
    bgMusic.volume = 0.35;
    bgMusic.loop = true;
    bgMusic.play().then(() => {
        musicEnabled = true;
        if (musicToggleBtn) musicToggleBtn.textContent = 'Mute Music';
    }).catch(() => {
        // Play rejected; keep it muted/paused until another gesture
        musicEnabled = false;
        if (musicToggleBtn) musicToggleBtn.textContent = 'Play Music';
    });
}

function stopBackgroundMusic() {
    if (!bgMusic) return;
    bgMusic.pause();
    try { bgMusic.currentTime = 0; } catch (e) {}
    musicEnabled = false;
    if (musicToggleBtn) musicToggleBtn.textContent = 'Play Music';
}

function createBackgroundBeat() {
    // The existing WebAudio beat implementation was removed in favor of a simple
    // HTML audio background track. Keep this function as a no-op for now.
    return;
}

// Game sound effects
function playJumpSound() {
    initAudio();
    createSoundEffect(400, 0.1, 'sine', 0.3);
}

function playScoreSound() {
    if (gameOver) return;
    initAudio();
    setTimeout(() => createSoundEffect(600, 0.15, 'square', 0.2), 0);
    setTimeout(() => createSoundEffect(800, 0.15, 'square', 0.2), 100);
}

function playGameOverSound() {
    initAudio();
    createSoundEffect(150, 0.3, 'sawtooth', 0.4);
    setTimeout(() => createSoundEffect(100, 0.5, 'sawtooth', 0.35), 200);
    setTimeout(() => createSoundEffect(75, 0.3, 'triangle', 0.3), 600);
}

// Game loop
function gameLoop() {
    // Clear canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!gameStarted) {
        // Draw start screen
        ctx.fillStyle = colors.text;
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Click or Press Space to Start', canvas.width / 2, canvas.height / 2);
    } else {
        // Update bird
        bird.velocity += bird.gravity;
        bird.y += bird.velocity;

        // Draw bird
        ctx.fillStyle = colors.bird;
        ctx.beginPath();
        ctx.arc(bird.x, bird.y, bird.size, 0, Math.PI * 2);
        ctx.fill();

        // Update and draw pipes
        if (!gameOver) {
            pipeTimer++;
            if (pipeTimer >= 100) {
                createPipe();
                pipeTimer = 0;
            }
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
            const pipe = pipes[i];
            pipe.x -= 2;

            // Draw pipes
            ctx.fillStyle = colors.pipe;
            ctx.fillRect(pipe.x, 0, pipeWidth, pipe.top);
            ctx.fillRect(pipe.x, pipe.bottom, pipeWidth, canvas.height - pipe.bottom);

            // Check collision
            if (checkCollision(pipe)) {
                if (!gameOver) {
                    gameOver = true;
                    stopBackgroundMusic();
                    playGameOverSound();
                }
            }

            // Score point
            if (!gameOver && pipe.x + pipeWidth < bird.x && !pipe.passed) {
                score++;
                pipe.passed = true;
                playScoreSound();
            }

            // Remove off-screen pipes
            if (pipe.x + pipeWidth < 0) {
                pipes.splice(i, 1);
            }
        }

        // Draw score
        ctx.fillStyle = colors.text;
        ctx.font = '24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Score: ' + score, 10, 30);

        // Game over screen
        if (gameOver) {
            ctx.fillStyle = colors.text;
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2);
            ctx.font = '20px Arial';
            ctx.fillText('Click or Press Space to Restart', canvas.width / 2, canvas.height / 2 + 40);
        }
    }

    // Check boundaries
    if (bird.y + bird.size > canvas.height || bird.y - bird.size < 0) {
        if (!gameOver) {
            gameOver = true;
            stopBackgroundMusic();
            playGameOverSound();
        }
    }

    requestAnimationFrame(gameLoop);
}

// Create pipe
function createPipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - pipeGap - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

    pipes.push({
        x: canvas.width,
        top: topHeight,
        bottom: topHeight + pipeGap,
        passed: false
    });
}

// Check collision
function checkCollision(pipe) {
    const birdLeft = bird.x - bird.size;
    const birdRight = bird.x + bird.size;
    const birdTop = bird.y - bird.size;
    const birdBottom = bird.y + bird.size;

    return (
        birdRight > pipe.x &&
        birdLeft < pipe.x + pipeWidth &&
        (birdTop < pipe.top || birdBottom > pipe.bottom)
    );
}

// Event listeners
function handleInput() {
    if (!gameStarted) {
        gameStarted = true;
        initAudio();
        startBackgroundMusic();
        createBackgroundBeat();
    } else if (gameOver) {
        // Reset game
        gameStarted = false;
        gameOver = false;
        score = 0;
        pipes.length = 0;
        bird.y = canvas.height / 2;
        bird.velocity = 0;
        pipeTimer = 0;
        stopBackgroundMusic();
    } else {
        bird.velocity = bird.jump;
        playJumpSound();
    }
}

// Initialize game
function initGame() {
    canvas.addEventListener('click', handleInput);
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            handleInput();
        }
    });

    // Music toggle button (if present)
    if (musicToggleBtn) {
        musicToggleBtn.addEventListener('click', (e) => {
            if (!bgMusic) return;
            // If muted or paused, unmute and play. Otherwise pause and mute.
            if (bgMusic.muted || bgMusic.paused) {
                bgMusic.muted = false;
                bgMusic.volume = 0.35;
                bgMusic.play().then(() => {
                    musicEnabled = true;
                    musicToggleBtn.textContent = 'Mute Music';
                }).catch(() => {
                    // play prevented
                });
            } else {
                bgMusic.pause();
                bgMusic.muted = true;
                musicEnabled = false;
                musicToggleBtn.textContent = 'Play Music';
            }
        });
    }

    // Start game loop
    gameLoop();
}

// Start the game when the page loads
window.addEventListener('load', initGame);