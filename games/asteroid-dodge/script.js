const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const messageElement = document.getElementById('message');

const STATE_IDLE = 0;
const STATE_PLAYING = 1;
const STATE_GAMEOVER = 2;

let gameState = STATE_IDLE;
let animFrameId = null;

let player = { x: 0, y: 0, width: 20, height: 24 };
let asteroids = [];
let powerUps = [];
let particles = [];
let starLayers = [];
let score = 0;
let highScore = 0;
let shieldTimer = 0;
let slowMoTimer = 0;
let spawnAccumulator = 0;
let lastTime = 0;
let keysDown = {};

function resizeCanvas() {
    const header = document.querySelector('.game-header');
    const scoreboard = document.getElementById('scoreBoard');
    const footer = document.querySelector('footer');
    const hH = header ? header.offsetHeight : 0;
    const sH = scoreboard ? scoreboard.offsetHeight : 0;
    const fH = footer ? footer.offsetHeight : 0;
    const adTop = document.querySelector('.ad-top');
    const adBot = document.querySelector('.ad-bottom');
    const atH = adTop ? adTop.offsetHeight : 0;
    const abH = adBot ? adBot.offsetHeight : 0;

    const maxW = 800;
    const availW = Math.min(window.innerWidth - 20, maxW);
    const availH = window.innerHeight - hH - sH - fH - atH - abH - 30;

    canvas.width = availW;
    canvas.height = Math.max(300, availH);

    player.x = Math.min(player.x, canvas.width - player.width);
    player.y = canvas.height - player.height - 20;
}

function createStarLayers() {
    starLayers = [];
    for (let layer = 0; layer < 3; layer++) {
        const stars = [];
        const count = 40 + layer * 30;
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: 0.5 + Math.random() * (1 + layer * 0.3),
                brightness: 0.3 + Math.random() * 0.7
            });
        }
        starLayers.push({ stars: stars, speed: 0.2 + layer * 0.4 });
    }
}

function init() {
    highScore = parseInt(localStorage.getItem('asteroidDodgeHighScore')) || 0;
    highScoreElement.textContent = highScore;
    resizeCanvas();
    createStarLayers();

    player.width = 20;
    player.height = 24;
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - player.height - 20;

    showMessage('Press Space to Start');
    draw(0);
}

function resetGame() {
    asteroids = [];
    powerUps = [];
    particles = [];
    score = 0;
    shieldTimer = 0;
    slowMoTimer = 0;
    spawnAccumulator = 0;
    scoreElement.textContent = '0';

    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - player.height - 20;
}

function startGame() {
    resetGame();
    gameState = STATE_PLAYING;
    hideMessage();
    lastTime = performance.now();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    const rawDt = (timestamp - lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05);
    lastTime = timestamp;

    if (gameState === STATE_PLAYING) {
        update(dt);
    }
    draw(dt);
    animFrameId = requestAnimationFrame(gameLoop);
}

function update(dt) {
    const speed = 300;
    if (keysDown['ArrowLeft'] || keysDown['KeyA']) {
        player.x -= speed * dt;
    }
    if (keysDown['ArrowRight'] || keysDown['KeyD']) {
        player.x += speed * dt;
    }
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

    if (shieldTimer > 0) shieldTimer -= dt;
    if (slowMoTimer > 0) slowMoTimer -= dt;

    const timeFactor = Math.min(score / 500, 3);
    const asteroidSpeed = (120 + timeFactor * 80) * (slowMoTimer > 0 ? 0.35 : 1);
    const spawnRate = 1.2 + timeFactor * 1.5;

    updateStars(dt);
    updateAsteroids(dt, asteroidSpeed);
    updatePowerUps(dt);
    updateParticles(dt);
    spawnAsteroids(dt, spawnRate, timeFactor);
    spawnPowerUp(dt);

    score += dt * (10 + timeFactor * 5);
    scoreElement.textContent = Math.floor(score);

    if (Math.floor(score) > highScore) {
        highScore = Math.floor(score);
        highScoreElement.textContent = highScore;
        localStorage.setItem('asteroidDodgeHighScore', highScore);
    }

    checkCollisions();
}

function updateStars(dt) {
    const slowFactor = slowMoTimer > 0 ? 0.35 : 1;
    for (let l = 0; l < starLayers.length; l++) {
        const layer = starLayers[l];
        for (let i = 0; i < layer.stars.length; i++) {
            const s = layer.stars[i];
            s.y += layer.speed * 60 * dt * slowFactor;
            if (s.y > canvas.height) {
                s.y = -2;
                s.x = Math.random() * canvas.width;
            }
        }
    }
}

function createAsteroidShape(radius) {
    const verts = [];
    const numVerts = 7 + Math.floor(Math.random() * 5);
    for (let i = 0; i < numVerts; i++) {
        const angle = (i / numVerts) * Math.PI * 2;
        const r = radius * (0.6 + Math.random() * 0.4);
        verts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    return verts;
}

function spawnAsteroids(dt, rate, timeFactor) {
    spawnAccumulator += dt * rate;
    while (spawnAccumulator >= 1) {
        spawnAccumulator -= 1;
        const radius = 12 + Math.random() * (18 + timeFactor * 6);
        const a = {
            x: radius + Math.random() * (canvas.width - radius * 2),
            y: -radius * 2,
            radius: radius,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 2,
            verts: createAsteroidShape(radius),
            shade: Math.floor(Math.random() * 3)
        };
        asteroids.push(a);
    }
}

function updateAsteroids(dt, speed) {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        a.y += speed * dt;
        a.rotation += a.rotSpeed * dt;
        if (a.y - a.radius > canvas.height) {
            asteroids.splice(i, 1);
        }
    }
}

function spawnPowerUp(dt) {
    if (Math.random() < dt * 0.08) {
        const type = Math.random() < 0.5 ? 'shield' : 'slowmo';
        powerUps.push({
            x: 20 + Math.random() * (canvas.width - 40),
            y: -20,
            type: type,
            radius: 10,
            pulse: 0
        });
    }
}

function updatePowerUps(dt) {
    const slowFactor = slowMoTimer > 0 ? 0.35 : 1;
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];
        p.y += 80 * dt * slowFactor;
        p.pulse += dt * 4;
        if (p.y > canvas.height + 20) {
            powerUps.splice(i, 1);
        }
    }
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function spawnExplosion(x, y) {
    const colors = ['#ff4400', '#ffaa00', '#ff6600', '#ff0044', '#ffcc00'];
    for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 200;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.5 + Math.random() * 0.8,
            maxLife: 0.5 + Math.random() * 0.8,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 2 + Math.random() * 3
        });
    }
}

function checkCollisions() {
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    const playerRadius = player.width * 0.45;

    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];
        const dx = px - p.x;
        const dy = py - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < playerRadius + p.radius) {
            if (p.type === 'shield') {
                shieldTimer = 5;
            } else {
                slowMoTimer = 3;
            }
            powerUps.splice(i, 1);
        }
    }

    for (let i = 0; i < asteroids.length; i++) {
        const a = asteroids[i];
        const dx = px - a.x;
        const dy = py - a.y;
        if (Math.sqrt(dx * dx + dy * dy) < playerRadius + a.radius * 0.7) {
            if (shieldTimer > 0) {
                spawnExplosion(a.x, a.y);
                asteroids.splice(i, 1);
                i--;
                continue;
            }
            spawnExplosion(px, py);
            gameOver();
            return;
        }
    }
}

function gameOver() {
    gameState = STATE_GAMEOVER;
    showMessage('GAME OVER\n\nScore: ' + Math.floor(score) + '\n\nPress Space to Restart');
}

function draw() {
    ctx.fillStyle = '#000022';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawStars();
    drawAsteroids();
    drawPowerUps();
    drawPlayer();
    drawParticles();

    if (slowMoTimer > 0) {
        ctx.fillStyle = 'rgba(0, 255, 100, 0.03)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawStars() {
    for (let l = 0; l < starLayers.length; l++) {
        const layer = starLayers[l];
        for (let i = 0; i < layer.stars.length; i++) {
            const s = layer.stars[i];
            const alpha = s.brightness * (0.3 + l * 0.25);
            ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawAsteroids() {
    const shades = [
        { fill: '#555544', stroke: '#777766' },
        { fill: '#665544', stroke: '#887766' },
        { fill: '#4a4a50', stroke: '#6a6a70' }
    ];

    for (let i = 0; i < asteroids.length; i++) {
        const a = asteroids[i];
        const s = shades[a.shade];
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.rotation);

        ctx.beginPath();
        ctx.moveTo(a.verts[0].x, a.verts[0].y);
        for (let v = 1; v < a.verts.length; v++) {
            ctx.lineTo(a.verts[v].x, a.verts[v].y);
        }
        ctx.closePath();
        ctx.fillStyle = s.fill;
        ctx.fill();
        ctx.strokeStyle = s.stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }
}

function drawPlayer() {
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;

    if (shieldTimer > 0) {
        const pulse = 0.4 + Math.sin(performance.now() * 0.008) * 0.2;
        ctx.beginPath();
        ctx.arc(cx, cy, player.width * 0.9, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 150, 255, ' + pulse + ')';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(0, 150, 255, ' + (pulse * 0.2) + ')';
        ctx.fill();
    }

    ctx.save();
    ctx.translate(cx, cy);

    ctx.beginPath();
    ctx.moveTo(0, -player.height / 2);
    ctx.lineTo(-player.width / 2, player.height / 2);
    ctx.lineTo(-player.width / 4, player.height / 3);
    ctx.lineTo(0, player.height / 2.5);
    ctx.lineTo(player.width / 4, player.height / 3);
    ctx.lineTo(player.width / 2, player.height / 2);
    ctx.closePath();

    ctx.fillStyle = '#00cccc';
    ctx.fill();
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, -player.height / 2);
    ctx.lineTo(-player.width / 2, player.height / 2);
    ctx.lineTo(player.width / 2, player.height / 2);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (gameState === STATE_PLAYING) {
        const flicker = 0.6 + Math.random() * 0.4;
        ctx.fillStyle = 'rgba(0, 200, 255, ' + flicker + ')';
        ctx.beginPath();
        ctx.moveTo(-3, player.height / 3);
        ctx.lineTo(0, player.height / 2 + 6 + Math.random() * 4);
        ctx.lineTo(3, player.height / 3);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

function drawPowerUps() {
    for (let i = 0; i < powerUps.length; i++) {
        const p = powerUps[i];
        const glow = 0.5 + Math.sin(p.pulse) * 0.3;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 3, 0, Math.PI * 2);
        if (p.type === 'shield') {
            ctx.fillStyle = 'rgba(0, 100, 255, ' + (glow * 0.3) + ')';
            ctx.strokeStyle = 'rgba(0, 150, 255, ' + glow + ')';
        } else {
            ctx.fillStyle = 'rgba(0, 255, 100, ' + (glow * 0.3) + ')';
            ctx.strokeStyle = 'rgba(0, 255, 100, ' + glow + ')';
        }
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = '10px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.type === 'shield' ? 'S' : 'M', p.x, p.y);
    }
}

function drawParticles() {
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function showMessage(text) {
    messageElement.textContent = text;
    messageElement.style.whiteSpace = 'pre-line';
    messageElement.style.display = 'block';
}

function hideMessage() {
    messageElement.style.display = 'none';
}

window.addEventListener('keydown', function(e) {
    keysDown[e.code] = true;

    if (e.code === 'Space' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
    }

    if (e.code === 'Space') {
        if (gameState === STATE_IDLE || gameState === STATE_GAMEOVER) {
            startGame();
        }
    }
});

window.addEventListener('keyup', function(e) {
    keysDown[e.code] = false;
});

window.addEventListener('resize', function() {
    resizeCanvas();
    if (gameState === STATE_IDLE) {
        createStarLayers();
        player.x = canvas.width / 2 - player.width / 2;
        player.y = canvas.height - player.height - 20;
    }
});

init();

// Mobile touch controls
(function() {
    var btnLeft = document.getElementById('btnLeft');
    var btnRight = document.getElementById('btnRight');

    if (btnLeft) {
        btnLeft.addEventListener('touchstart', function(e) {
            e.preventDefault();
            keysDown['ArrowLeft'] = true;
            if (gameState === STATE_IDLE || gameState === STATE_GAMEOVER) {
                startGame();
            }
        }, {passive: false});
        btnLeft.addEventListener('touchend', function(e) {
            e.preventDefault();
            keysDown['ArrowLeft'] = false;
        }, {passive: false});
    }

    if (btnRight) {
        btnRight.addEventListener('touchstart', function(e) {
            e.preventDefault();
            keysDown['ArrowRight'] = true;
            if (gameState === STATE_IDLE || gameState === STATE_GAMEOVER) {
                startGame();
            }
        }, {passive: false});
        btnRight.addEventListener('touchend', function(e) {
            e.preventDefault();
            keysDown['ArrowRight'] = false;
        }, {passive: false});
    }

    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (gameState === STATE_IDLE || gameState === STATE_GAMEOVER) {
            startGame();
        }
    }, {passive: false});
})();
