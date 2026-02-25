const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const messageElement = document.getElementById('message');
const mobileControls = document.getElementById('mobileControls');
const gameContainer = document.getElementById('gameContainer');
const gameWrapper = document.getElementById('gameWrapper');

let player, enemies, bullets, stars, dx, dy, score, highScore, gameLoop, isMobile, GRID_SIZE;

const BACKGROUND_COLOR = '#000000';
const STAR_COLOR = '#ffffff';
const BULLET_COLOR = '#00ffff';

// Load spaceship SVG
const spaceshipImage = new Image();
spaceshipImage.src = 'spaceship.svg';

function init() {
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const scoreboardHeight = document.getElementById('scoreBoard').offsetHeight;
    const headerHeight = document.querySelector('header').offsetHeight;
    const footerHeight = document.querySelector('footer').offsetHeight;

    if (isMobile) {
        const mobileControlsHeight = document.getElementById('mobileControls').offsetHeight;
        canvas.width = window.innerWidth - 4;
        canvas.height = window.innerHeight - scoreboardHeight - headerHeight - footerHeight - mobileControlsHeight - 4;
        mobileControls.style.display = 'flex';
    } else {
        canvas.width = window.innerWidth - 4;
        canvas.height = window.innerHeight - scoreboardHeight - headerHeight - footerHeight - 4;
        mobileControls.style.display = 'none';
    }

    gameContainer.style.width = `${canvas.width}px`;
    gameContainer.style.height = `${canvas.height}px`;

    GRID_SIZE = Math.floor(Math.min(canvas.width, canvas.height) / 20);

    const playerSize = isMobile ? GRID_SIZE * 2.5 : GRID_SIZE;
    player = {
        x: canvas.width / 2 - playerSize / 2,
        y: canvas.height - playerSize * 1.5,
        width: playerSize,
        height: playerSize * 1.5
    };

    enemies = [];
    bullets = [];
    stars = createStars();
    dx = 0;
    dy = 0;
    score = 0;
    highScore = localStorage.getItem('galaxyRetroHighScore') || 0;
    updateScoreBoard();

    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    
    showMessage(isMobile ? 'Tap arrows to start' : 'Press Space to start');
    draw();
}

function createStars() {
    const stars = [];
    const starCount = isMobile ? 50 : 100;
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: isMobile ? Math.random() * 1 + 0.5 : Math.random() * 2 + 1,
            speed: Math.random() * 0.5 + 0.1
        });
    }
    return stars;
}

function startGame() {
    if (gameLoop) return;
    hideMessage();
    gameLoop = setInterval(update, 1000 / 60);  // 60 FPS
}

function update() {
    movePlayer();
    moveStars();
    moveEnemies();
    moveBullets();
    checkCollisions();
    spawnEnemies();
    draw();
}

function movePlayer() {
    player.x += dx * 5;
    player.y += dy * 5;
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}

function moveStars() {
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

function moveEnemies() {
    enemies.forEach(enemy => {
        enemy.y += 2;
    });
    enemies = enemies.filter(enemy => enemy.y < canvas.height);
}

function moveBullets() {
    bullets.forEach(bullet => {
        bullet.y -= 10;
    });
    bullets = bullets.filter(bullet => bullet.y + bullet.height > 0);
}

function checkCollisions() {
    bullets.forEach((bullet, bIndex) => {
        enemies.forEach((enemy, eIndex) => {
            if (collision(bullet, enemy)) {
                enemies.splice(eIndex, 1);
                bullets.splice(bIndex, 1);
                score++;
                updateScoreBoard();
            }
        });
    });

    enemies.forEach((enemy, index) => {
        if (collision(player, enemy)) {
            gameOver();
        }
    });
}

function spawnEnemies() {
    if (Math.random() < 0.02 && enemies.length < 5) {
        const enemySize = isMobile ? GRID_SIZE * 1.5 : GRID_SIZE * 0.8;
        enemies.push({
            x: Math.random() * (canvas.width - enemySize),
            y: -enemySize,
            width: enemySize,
            height: enemySize,
            emoji: ['👾', '👽', '🛸'][Math.floor(Math.random() * 3)]
        });
    }
}

function collision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function draw() {
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars
    ctx.fillStyle = STAR_COLOR;
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw player
    ctx.drawImage(spaceshipImage, player.x, player.y, player.width, player.height);

    // Draw enemies
    enemies.forEach(enemy => {
        ctx.font = `${enemy.height}px Arial`;
        ctx.fillText(enemy.emoji, enemy.x, enemy.y + enemy.height);
    });

    // Draw bullets
    ctx.fillStyle = BULLET_COLOR;
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function updateScoreBoard() {
    scoreElement.textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('galaxyRetroHighScore', highScore);
    }
    highScoreElement.textContent = highScore;
}

function gameOver() {
    clearInterval(gameLoop);
    gameLoop = null;
    showMessage(isMobile ? 'Game Over! Tap arrows to restart' : 'Game Over! Press Space to restart');
}

function showMessage(text) {
    messageElement.textContent = text;
    messageElement.style.display = 'block';
}

function hideMessage() {
    messageElement.style.display = 'none';
}

function handleDirectionChange(newDx, newDy) {
    dx = newDx;
    dy = newDy;
    if (!gameLoop) {
        init();
        startGame();
    }
}

function shoot() {
    const bulletSize = isMobile ? 6 : 4;
    bullets.push({
        x: player.x + player.width / 2 - bulletSize / 2,
        y: player.y,
        width: bulletSize,
        height: bulletSize * 2.5
    });
}

window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }
    
    if (e.code === 'Space') {
        if (!gameLoop) {
            init();
            startGame();
        } else {
            shoot();
        }
    } else if (e.code === 'ArrowUp') {
        handleDirectionChange(0, -1);
    } else if (e.code === 'ArrowDown') {
        handleDirectionChange(0, 1);
    } else if (e.code === 'ArrowLeft') {
        handleDirectionChange(-1, 0);
    } else if (e.code === 'ArrowRight') {
        handleDirectionChange(1, 0);
    }
});


function addMobileControls() {
    const controls = ['upBtn', 'downBtn', 'shootBtn'];
    controls.forEach(id => {
        document.getElementById(id).addEventListener('touchstart', (e) => {
            e.preventDefault();
            switch(id) {
                case 'upBtn': handleDirectionChange(0, -1); break;
                case 'downBtn': handleDirectionChange(0, 1); break;
                case 'shootBtn': shoot(); break;
            }
        });
        if (id !== 'shootBtn') {
            document.getElementById(id).addEventListener('touchend', (e) => {
                e.preventDefault();
                handleDirectionChange(0, 0);
            });
        }
    });

    // Add event listener for the horizontal slider
    const slider = document.getElementById('horizontalSlider');
    slider.addEventListener('input', (e) => {
        const value = e.target.value;
        const normalizedValue = value / 100; // Normalize to range -1 to 1
        handleDirectionChange(normalizedValue, 0);
    });

    slider.addEventListener('touchend', (e) => {
        e.preventDefault();
        slider.value = 0; // Reset slider to center
        handleDirectionChange(0, 0);
    });
}

window.addEventListener('resize', init);
init();
addMobileControls();
