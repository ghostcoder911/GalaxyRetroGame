const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const messageElement = document.getElementById('message');
const gameContainer = document.getElementById('gameContainer');

const CELL_SIZE = 20;
const BASE_TICK_RATE = 130;
const MIN_TICK_RATE = 55;
const SPEED_INCREASE_PER_FOOD = 2.5;

let cols, rows;
let snake, direction, nextDirection, food;
let score, highScore;
let gameState; // 'idle' | 'running' | 'over'
let lastTick, tickInterval;
let particles;
let animFrameId;

function resizeCanvas() {
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    const scoreBoard = document.getElementById('scoreBoard');
    const adTop = document.querySelector('.ad-container.ad-top');
    const adBottom = document.querySelector('.ad-container.ad-bottom');

    const usedHeight =
        (header ? header.offsetHeight : 0) +
        (footer ? footer.offsetHeight : 0) +
        (scoreBoard ? scoreBoard.offsetHeight : 0) +
        (adTop ? adTop.offsetHeight : 0) +
        (adBottom ? adBottom.offsetHeight : 0) +
        20;

    const maxW = Math.min(window.innerWidth - 40, 900);
    const maxH = window.innerHeight - usedHeight;

    cols = Math.floor(maxW / CELL_SIZE);
    rows = Math.floor(maxH / CELL_SIZE);
    if (cols < 10) cols = 10;
    if (rows < 10) rows = 10;

    canvas.width = cols * CELL_SIZE;
    canvas.height = rows * CELL_SIZE;
    gameContainer.style.width = canvas.width + 'px';
    gameContainer.style.height = canvas.height + 'px';
}

function init() {
    resizeCanvas();

    snake = [
        { x: Math.floor(cols / 2), y: Math.floor(rows / 2) },
        { x: Math.floor(cols / 2) - 1, y: Math.floor(rows / 2) },
        { x: Math.floor(cols / 2) - 2, y: Math.floor(rows / 2) }
    ];

    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    highScore = parseInt(localStorage.getItem('snakeClassicHighScore')) || 0;
    particles = [];
    tickInterval = BASE_TICK_RATE;
    lastTick = 0;

    updateScoreBoard();
    placeFood();

    gameState = 'idle';
    showMessage('Press Space to Start');
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(loop);
}

function placeFood() {
    let pos;
    do {
        pos = {
            x: Math.floor(Math.random() * cols),
            y: Math.floor(Math.random() * rows)
        };
    } while (snake.some(seg => seg.x === pos.x && seg.y === pos.y));
    food = pos;
}

function startGame() {
    if (gameState === 'running') return;
    if (gameState === 'over') {
        init();
    }
    gameState = 'running';
    hideMessage();
    lastTick = performance.now();
}

function loop(timestamp) {
    animFrameId = requestAnimationFrame(loop);

    if (gameState === 'running') {
        if (timestamp - lastTick >= tickInterval) {
            lastTick += tickInterval;
            update();
        }
    }

    draw(timestamp);
}

function update() {
    direction = { ...nextDirection };

    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };

    if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
        return gameOver();
    }

    for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) {
            return gameOver();
        }
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score++;
        updateScoreBoard();
        spawnParticles(food.x * CELL_SIZE + CELL_SIZE / 2, food.y * CELL_SIZE + CELL_SIZE / 2);
        placeFood();
        tickInterval = Math.max(MIN_TICK_RATE, BASE_TICK_RATE - score * SPEED_INCREASE_PER_FOOD);
    } else {
        snake.pop();
    }
}

function gameOver() {
    gameState = 'over';
    showMessage('Game Over!\nPress Space to Restart');
}

function spawnParticles(cx, cy) {
    for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1.5;
        particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: Math.random() * 0.03 + 0.02,
            size: Math.random() * 3 + 2,
            hue: Math.random() > 0.5 ? 120 : 160
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function draw(timestamp) {
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();
    drawFood(timestamp);
    drawSnake();

    updateParticles();
    drawParticles();

    if (gameState === 'idle' || gameState === 'over') {
        drawOverlay();
    }
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(0, 100, 180, 0.08)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= cols; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL_SIZE, 0);
        ctx.lineTo(x * CELL_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL_SIZE);
        ctx.lineTo(canvas.width, y * CELL_SIZE);
        ctx.stroke();
    }
}

function drawFood(timestamp) {
    const cx = food.x * CELL_SIZE + CELL_SIZE / 2;
    const cy = food.y * CELL_SIZE + CELL_SIZE / 2;
    const pulse = Math.sin((timestamp || 0) / 200) * 2 + 6;

    ctx.save();
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 15 + pulse;
    ctx.fillStyle = '#00ff66';
    ctx.beginPath();
    ctx.arc(cx, cy, CELL_SIZE / 3 + pulse * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#aaffaa';
    ctx.beginPath();
    ctx.arc(cx - 1, cy - 1, CELL_SIZE / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawSnake() {
    for (let i = snake.length - 1; i >= 0; i--) {
        const seg = snake[i];
        const px = seg.x * CELL_SIZE;
        const py = seg.y * CELL_SIZE;
        const t = i / snake.length;

        const r = Math.floor(0 + t * 0);
        const g = Math.floor(255 - t * 100);
        const b = Math.floor(255 - t * 55);

        ctx.save();
        ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
        ctx.shadowBlur = i === 0 ? 12 : 6;

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        const inset = 1;
        const radius = 4;
        roundRect(ctx, px + inset, py + inset, CELL_SIZE - inset * 2, CELL_SIZE - inset * 2, radius);
        ctx.fill();

        if (i === 0) {
            drawEyes(seg);
        }

        ctx.restore();
    }
}

function drawEyes(head) {
    const px = head.x * CELL_SIZE;
    const py = head.y * CELL_SIZE;
    const eyeSize = 3;
    const pupilSize = 1.5;

    let e1x, e1y, e2x, e2y;
    if (direction.x === 1) {
        e1x = px + CELL_SIZE - 6; e1y = py + 5;
        e2x = px + CELL_SIZE - 6; e2y = py + CELL_SIZE - 5;
    } else if (direction.x === -1) {
        e1x = px + 6; e1y = py + 5;
        e2x = px + 6; e2y = py + CELL_SIZE - 5;
    } else if (direction.y === -1) {
        e1x = px + 5; e1y = py + 6;
        e2x = px + CELL_SIZE - 5; e2y = py + 6;
    } else {
        e1x = px + 5; e1y = py + CELL_SIZE - 6;
        e2x = px + CELL_SIZE - 5; e2y = py + CELL_SIZE - 6;
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(e1x, e1y, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(e2x, e2y, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#001122';
    ctx.beginPath();
    ctx.arc(e1x + direction.x, e1y + direction.y, pupilSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(e2x + direction.x, e2y + direction.y, pupilSize, 0, Math.PI * 2);
    ctx.fill();
}

function drawParticles() {
    for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.shadowColor = `hsl(${p.hue}, 100%, 60%)`;
        ctx.shadowBlur = 8;
        ctx.fillStyle = `hsl(${p.hue}, 100%, 70%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawOverlay() {
    ctx.fillStyle = 'rgba(0, 0, 17, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function updateScoreBoard() {
    scoreElement.textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeClassicHighScore', highScore);
    }
    highScoreElement.textContent = highScore;
}

function showMessage(text) {
    messageElement.innerHTML = text.replace('\n', '<br>');
    messageElement.style.display = 'block';
}

function hideMessage() {
    messageElement.style.display = 'none';
}

window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }

    if (e.code === 'Space') {
        if (gameState !== 'running') {
            startGame();
        }
        return;
    }

    if (gameState !== 'running') return;

    switch (e.code) {
        case 'ArrowUp':
            if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
            if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
            if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
            if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
            break;
    }
});

window.addEventListener('resize', () => {
    resizeCanvas();
    if (gameState !== 'running') {
        draw(performance.now());
    }
});

init();
