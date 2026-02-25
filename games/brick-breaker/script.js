const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const livesElement = document.getElementById('lives');
const levelElement = document.getElementById('level');
const messageElement = document.getElementById('message');
const gameContainer = document.getElementById('gameContainer');

const BACKGROUND_COLOR = '#000011';
const PADDLE_COLOR = '#00ccff';
const BALL_COLOR = '#ffffff';
const BRICK_ROWS = 5;
const BRICK_COLS = 10;
const BRICK_PADDING = 4;
const BRICK_TOP_OFFSET = 60;
const BASE_BALL_SPEED = 5;
const PADDLE_SPEED = 8;

const BRICK_COLORS = [
    '#ff0055',
    '#ff8800',
    '#ffee00',
    '#00ff66',
    '#00eeff'
];

const BRICK_GLOW_COLORS = [
    'rgba(255, 0, 85, 0.6)',
    'rgba(255, 136, 0, 0.6)',
    'rgba(255, 238, 0, 0.6)',
    'rgba(0, 255, 102, 0.6)',
    'rgba(0, 238, 255, 0.6)'
];

let paddle, ball, bricks, particles;
let score, highScore, lives, level;
let gameState;
let keys = {};
let mouseX = null;
let animFrameId = null;

function resizeCanvas() {
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    const scoreboard = document.getElementById('scoreBoard');
    const adTop = document.querySelector('.ad-top');
    const adBottom = document.querySelector('.ad-bottom');

    const usedHeight =
        (header ? header.offsetHeight : 0) +
        (scoreboard ? scoreboard.offsetHeight : 0) +
        (footer ? footer.offsetHeight : 0) +
        (adTop ? adTop.offsetHeight : 0) +
        (adBottom ? adBottom.offsetHeight : 0) +
        20;

    const maxW = Math.min(window.innerWidth - 4, 800);
    const maxH = window.innerHeight - usedHeight;

    canvas.width = maxW;
    canvas.height = Math.max(maxH, 400);
    gameContainer.style.width = canvas.width + 'px';
    gameContainer.style.height = canvas.height + 'px';
}

function initPaddle() {
    const pw = Math.max(canvas.width * 0.15, 80);
    paddle = {
        x: canvas.width / 2 - pw / 2,
        y: canvas.height - 30,
        width: pw,
        height: 14,
        speed: PADDLE_SPEED
    };
}

function initBall() {
    const speed = BASE_BALL_SPEED + (level - 1) * 0.5;
    const angle = -Math.PI / 4 + Math.random() * (-Math.PI / 2);
    ball = {
        x: canvas.width / 2,
        y: paddle.y - 10,
        radius: 7,
        dx: speed * Math.cos(angle),
        dy: -speed * Math.abs(Math.sin(angle)),
        speed: speed
    };
}

function createBricks() {
    bricks = [];
    const totalPaddingW = BRICK_PADDING * (BRICK_COLS + 1);
    const brickW = (canvas.width - totalPaddingW) / BRICK_COLS;
    const brickH = 20;

    const extraRows = Math.floor((level - 1) / 2);
    const rows = Math.min(BRICK_ROWS + extraRows, 8);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
            const hits = level >= 3 && r === 0 ? 2 : 1;
            bricks.push({
                x: BRICK_PADDING + c * (brickW + BRICK_PADDING),
                y: BRICK_TOP_OFFSET + r * (brickH + BRICK_PADDING),
                width: brickW,
                height: brickH,
                color: BRICK_COLORS[r % BRICK_COLORS.length],
                glow: BRICK_GLOW_COLORS[r % BRICK_GLOW_COLORS.length],
                alive: true,
                hits: hits
            });
        }
    }
}

function spawnParticles(x, y, color) {
    const count = 12;
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        particles.push({
            x: x,
            y: y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            life: 1.0,
            color: color,
            size: Math.random() * 3 + 1
        });
    }
}

function init() {
    resizeCanvas();
    score = 0;
    lives = 3;
    level = 1;
    highScore = parseInt(localStorage.getItem('brickBreakerHighScore')) || 0;
    particles = [];
    initPaddle();
    initBall();
    createBricks();
    updateUI();
    gameState = 'ready';
    showMessage('Click to Launch');
    if (!animFrameId) {
        animFrameId = requestAnimationFrame(gameLoop);
    }
}

function startLevel() {
    initPaddle();
    initBall();
    createBricks();
    gameState = 'ready';
    showMessage('Click to Launch');
}

function updateUI() {
    scoreElement.textContent = score;
    highScoreElement.textContent = highScore;
    livesElement.textContent = lives;
    levelElement.textContent = level;
}

function showMessage(text) {
    messageElement.textContent = text;
    messageElement.style.display = 'block';
}

function hideMessage() {
    messageElement.style.display = 'none';
}

function movePaddle() {
    if (keys['ArrowLeft'] || keys['a']) {
        paddle.x -= paddle.speed;
    }
    if (keys['ArrowRight'] || keys['d']) {
        paddle.x += paddle.speed;
    }
    if (mouseX !== null) {
        paddle.x = mouseX - paddle.width / 2;
    }
    paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, paddle.x));
}

function moveBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x - ball.radius <= 0) {
        ball.x = ball.radius;
        ball.dx = Math.abs(ball.dx);
    }
    if (ball.x + ball.radius >= canvas.width) {
        ball.x = canvas.width - ball.radius;
        ball.dx = -Math.abs(ball.dx);
    }
    if (ball.y - ball.radius <= 0) {
        ball.y = ball.radius;
        ball.dy = Math.abs(ball.dy);
    }

    if (
        ball.dy > 0 &&
        ball.y + ball.radius >= paddle.y &&
        ball.y + ball.radius <= paddle.y + paddle.height + ball.speed &&
        ball.x >= paddle.x &&
        ball.x <= paddle.x + paddle.width
    ) {
        ball.y = paddle.y - ball.radius;
        const hitPos = (ball.x - paddle.x) / paddle.width;
        const angle = (hitPos - 0.5) * Math.PI * 0.7;
        ball.dx = ball.speed * Math.sin(angle);
        ball.dy = -ball.speed * Math.cos(angle);
    }

    if (ball.y - ball.radius > canvas.height) {
        lives--;
        updateUI();
        if (lives <= 0) {
            gameState = 'gameover';
            showMessage('Game Over! Click to Restart');
        } else {
            gameState = 'ready';
            initBall();
            showMessage('Click to Launch');
        }
    }
}

function checkBrickCollisions() {
    for (let i = 0; i < bricks.length; i++) {
        const b = bricks[i];
        if (!b.alive) continue;

        if (
            ball.x + ball.radius > b.x &&
            ball.x - ball.radius < b.x + b.width &&
            ball.y + ball.radius > b.y &&
            ball.y - ball.radius < b.y + b.height
        ) {
            b.hits--;
            if (b.hits <= 0) {
                b.alive = false;
                score += 10 * level;
                if (score > highScore) {
                    highScore = score;
                    localStorage.setItem('brickBreakerHighScore', highScore);
                }
                updateUI();
                spawnParticles(b.x + b.width / 2, b.y + b.height / 2, b.color);
            }

            const overlapLeft = (ball.x + ball.radius) - b.x;
            const overlapRight = (b.x + b.width) - (ball.x - ball.radius);
            const overlapTop = (ball.y + ball.radius) - b.y;
            const overlapBottom = (b.y + b.height) - (ball.y - ball.radius);
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

            if (minOverlap === overlapTop || minOverlap === overlapBottom) {
                ball.dy = -ball.dy;
            } else {
                ball.dx = -ball.dx;
            }

            break;
        }
    }

    const allDead = bricks.every(b => !b.alive);
    if (allDead) {
        level++;
        updateUI();
        gameState = 'levelcomplete';
        showMessage('Level Complete! Click to Continue');
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.life -= 0.025;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function draw() {
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < bricks.length; i++) {
        const b = bricks[i];
        if (!b.alive) continue;

        ctx.save();
        ctx.shadowColor = b.glow;
        ctx.shadowBlur = 12;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.width, b.height);

        if (b.hits > 1) {
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(b.x + 2, b.y + 2, b.width - 4, b.height - 4);
        }

        ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = 'rgba(0, 204, 255, 0.8)';
    ctx.shadowBlur = 15;
    const grad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
    grad.addColorStop(0, '#00eeff');
    grad.addColorStop(1, '#0077aa');
    ctx.fillStyle = grad;
    const r = paddle.height / 2;
    ctx.beginPath();
    ctx.moveTo(paddle.x + r, paddle.y);
    ctx.lineTo(paddle.x + paddle.width - r, paddle.y);
    ctx.arc(paddle.x + paddle.width - r, paddle.y + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(paddle.x + r, paddle.y + paddle.height);
    ctx.arc(paddle.x + r, paddle.y + r, r, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = BALL_COLOR;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function gameLoop() {
    if (gameState === 'playing') {
        movePaddle();
        moveBall();
        checkBrickCollisions();
        updateParticles();
    } else if (gameState === 'ready') {
        movePaddle();
        ball.x = paddle.x + paddle.width / 2;
        ball.y = paddle.y - ball.radius - 2;
        updateParticles();
    } else {
        updateParticles();
    }

    draw();
    animFrameId = requestAnimationFrame(gameLoop);
}

function handleClick() {
    if (gameState === 'ready') {
        hideMessage();
        gameState = 'playing';
        const speed = ball.speed;
        const angle = -Math.PI / 4 + Math.random() * (-Math.PI / 2);
        ball.dx = speed * Math.sin(angle) * 0.6;
        ball.dy = -speed;
    } else if (gameState === 'gameover') {
        hideMessage();
        score = 0;
        lives = 3;
        level = 1;
        particles = [];
        updateUI();
        startLevel();
    } else if (gameState === 'levelcomplete') {
        hideMessage();
        particles = [];
        startLevel();
    }
}

canvas.addEventListener('click', handleClick);
canvas.addEventListener('touchend', function (e) {
    e.preventDefault();
    handleClick();
});

canvas.addEventListener('mousemove', function (e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
});

canvas.addEventListener('mouseleave', function () {
    mouseX = null;
});

canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    mouseX = e.touches[0].clientX - rect.left;
}, { passive: false });

canvas.addEventListener('touchstart', function (e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.touches[0].clientX - rect.left;
}, { passive: true });

document.addEventListener('keydown', function (e) {
    keys[e.key] = true;
    if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
    if (e.key === ' ') {
        handleClick();
    }
});

document.addEventListener('keyup', function (e) {
    keys[e.key] = false;
});

window.addEventListener('resize', function () {
    resizeCanvas();
    if (gameState === 'playing') {
        paddle.x = Math.min(paddle.x, canvas.width - paddle.width);
        paddle.y = canvas.height - 30;
    } else {
        initPaddle();
        if (gameState === 'ready') {
            ball.x = paddle.x + paddle.width / 2;
            ball.y = paddle.y - ball.radius - 2;
        }
    }
});

init();
