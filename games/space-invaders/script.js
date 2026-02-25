(function () {
    'use strict';

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const messageEl = document.getElementById('message');
    const scoreEl = document.getElementById('score');
    const highScoreEl = document.getElementById('highScore');
    const livesEl = document.getElementById('lives');
    const waveEl = document.getElementById('wave');

    const BASE_WIDTH = 700;
    const BASE_HEIGHT = 550;
    canvas.width = BASE_WIDTH;
    canvas.height = BASE_HEIGHT;

    const ALIEN_COLS = 8;
    const ALIEN_ROWS = 5;
    const ALIEN_W = 36;
    const ALIEN_H = 28;
    const ALIEN_PAD_X = 16;
    const ALIEN_PAD_Y = 14;
    const PLAYER_W = 44;
    const PLAYER_H = 20;
    const BULLET_W = 3;
    const BULLET_H = 12;
    const SHIELD_BLOCK = 5;

    const STATE_START = 0;
    const STATE_PLAYING = 1;
    const STATE_WAVE_CLEAR = 2;
    const STATE_DYING = 3;
    const STATE_GAME_OVER = 4;

    let state = STATE_START;
    let score = 0;
    let lives = 3;
    let wave = 1;
    let highScore = parseInt(localStorage.getItem('spaceInvadersHighScore')) || 0;
    highScoreEl.textContent = highScore;

    let player = { x: 0, y: 0, w: 0, h: 0, alive: false };
    let aliens = [];
    let alienDir = 1, alienDropTimer = 0, alienMoveTimer = 0, alienMoveInterval = 600;
    let playerBullet = null, alienBullets = [], shields = [], ufo = null, particles = [];
    let dyingTimer = 0, waveClearTimer = 0;
    let keys = {};

    function resetPlayer() {
        player = {
            x: BASE_WIDTH / 2 - PLAYER_W / 2,
            y: BASE_HEIGHT - 40,
            w: PLAYER_W,
            h: PLAYER_H,
            speed: 4,
            alive: true
        };
    }

    function createAliens() {
        aliens = [];
        const totalW = ALIEN_COLS * (ALIEN_W + ALIEN_PAD_X) - ALIEN_PAD_X;
        const startX = (BASE_WIDTH - totalW) / 2;
        const startY = 60;
        for (let r = 0; r < ALIEN_ROWS; r++) {
            for (let c = 0; c < ALIEN_COLS; c++) {
                let type, points, color;
                if (r === 0) { type = 'squid'; points = 30; color = '#ff44ff'; }
                else if (r <= 2) { type = 'crab'; points = 20; color = '#00ffcc'; }
                else { type = 'octopus'; points = 10; color = '#44ff44'; }
                aliens.push({
                    x: startX + c * (ALIEN_W + ALIEN_PAD_X),
                    y: startY + r * (ALIEN_H + ALIEN_PAD_Y),
                    w: ALIEN_W,
                    h: ALIEN_H,
                    type: type,
                    points: points,
                    color: color,
                    alive: true,
                    frame: 0
                });
            }
        }
        alienDir = 1;
        alienMoveInterval = Math.max(200, 600 - (wave - 1) * 40);
        alienMoveTimer = 0;
        alienDropTimer = 0;
    }

    function createShields() {
        shields = [];
        const shieldCount = 4;
        const shieldW = 52;
        const shieldH = 36;
        const totalW = shieldCount * shieldW;
        const gap = (BASE_WIDTH - totalW) / (shieldCount + 1);
        for (let s = 0; s < shieldCount; s++) {
            const sx = gap + s * (shieldW + gap);
            const sy = BASE_HEIGHT - 100;
            const blocks = [];
            for (let by = 0; by < shieldH; by += SHIELD_BLOCK) {
                for (let bx = 0; bx < shieldW; bx += SHIELD_BLOCK) {
                    const relX = bx / shieldW;
                    const relY = by / shieldH;
                    const isArch = relY > 0.55 && relX > 0.25 && relX < 0.75;
                    if (!isArch) {
                        const isCorner = (relY < 0.2 && (relX < 0.15 || relX > 0.85));
                        if (!isCorner) {
                            blocks.push({ x: sx + bx, y: sy + by, w: SHIELD_BLOCK, h: SHIELD_BLOCK, alive: true });
                        }
                    }
                }
            }
            shields.push(...blocks);
        }
    }

    function initWave() {
        createAliens();
        createShields();
        playerBullet = null;
        alienBullets = [];
        ufo = null;
        particles = particles || [];
        resetPlayer();
    }

    function initGame() {
        score = 0;
        lives = 3;
        wave = 1;
        particles = [];
        initWave();
        updateHUD();
    }

    function updateHUD() {
        scoreEl.textContent = score;
        livesEl.textContent = lives;
        waveEl.textContent = wave;
        if (score > highScore) {
            highScore = score;
            highScoreEl.textContent = highScore;
            localStorage.setItem('spaceInvadersHighScore', highScore);
        }
    }

    function showMessage(text) {
        messageEl.style.display = 'block';
        messageEl.innerHTML = text;
    }

    function hideMessage() {
        messageEl.style.display = 'none';
    }

    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 30 + Math.random() * 20,
                color: color,
                size: 2 + Math.random() * 3
            });
        }
    }

    function drawPlayer() {
        if (!player.alive) return;
        ctx.save();
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#00ddff';
        ctx.fillRect(player.x, player.y + 6, player.w, player.h - 6);
        ctx.fillRect(player.x + player.w / 2 - 3, player.y, 6, 10);
        ctx.fillRect(player.x + 4, player.y + 4, 6, 6);
        ctx.fillRect(player.x + player.w - 10, player.y + 4, 6, 6);
        ctx.restore();
    }

    function drawSquid(x, y, w, h, color, frame) {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = color;
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.fillRect(cx - 6, cy - 10, 12, 4);
        ctx.fillRect(cx - 10, cy - 6, 20, 8);
        ctx.fillRect(cx - 6, cy + 2, 12, 4);
        if (frame === 0) {
            ctx.fillRect(cx - 14, cy + 2, 4, 6);
            ctx.fillRect(cx + 10, cy + 2, 4, 6);
        } else {
            ctx.fillRect(cx - 10, cy + 6, 4, 6);
            ctx.fillRect(cx + 6, cy + 6, 4, 6);
        }
        ctx.fillStyle = '#000022';
        ctx.fillRect(cx - 6, cy - 4, 3, 3);
        ctx.fillRect(cx + 3, cy - 4, 3, 3);
        ctx.restore();
    }

    function drawCrab(x, y, w, h, color, frame) {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = color;
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.fillRect(cx - 12, cy - 8, 24, 6);
        ctx.fillRect(cx - 16, cy - 2, 32, 6);
        ctx.fillRect(cx - 12, cy + 4, 24, 4);
        if (frame === 0) {
            ctx.fillRect(cx - 16, cy - 8, 4, 4);
            ctx.fillRect(cx + 12, cy - 8, 4, 4);
            ctx.fillRect(cx - 18, cy + 4, 4, 6);
            ctx.fillRect(cx + 14, cy + 4, 4, 6);
        } else {
            ctx.fillRect(cx - 14, cy - 12, 4, 4);
            ctx.fillRect(cx + 10, cy - 12, 4, 4);
            ctx.fillRect(cx - 14, cy + 8, 4, 4);
            ctx.fillRect(cx + 10, cy + 8, 4, 4);
        }
        ctx.fillStyle = '#000022';
        ctx.fillRect(cx - 8, cy - 4, 4, 4);
        ctx.fillRect(cx + 4, cy - 4, 4, 4);
        ctx.restore();
    }

    function drawOctopus(x, y, w, h, color, frame) {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = color;
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.fillRect(cx - 8, cy - 10, 16, 4);
        ctx.fillRect(cx - 14, cy - 6, 28, 8);
        ctx.fillRect(cx - 18, cy + 2, 36, 4);
        if (frame === 0) {
            ctx.fillRect(cx - 18, cy + 6, 6, 4);
            ctx.fillRect(cx - 8, cy + 6, 6, 4);
            ctx.fillRect(cx + 2, cy + 6, 6, 4);
            ctx.fillRect(cx + 12, cy + 6, 6, 4);
        } else {
            ctx.fillRect(cx - 16, cy + 6, 6, 4);
            ctx.fillRect(cx - 6, cy + 6, 6, 4);
            ctx.fillRect(cx + 4, cy + 6, 6, 4);
            ctx.fillRect(cx + 14, cy + 6, 6, 4);
            ctx.fillRect(cx - 18, cy + 6, 4, 6);
            ctx.fillRect(cx + 16, cy + 6, 4, 6);
        }
        ctx.fillStyle = '#000022';
        ctx.fillRect(cx - 8, cy - 4, 4, 4);
        ctx.fillRect(cx + 4, cy - 4, 4, 4);
        ctx.restore();
    }

    function drawAlien(a) {
        if (!a.alive) return;
        if (a.type === 'squid') drawSquid(a.x, a.y, a.w, a.h, a.color, a.frame);
        else if (a.type === 'crab') drawCrab(a.x, a.y, a.w, a.h, a.color, a.frame);
        else drawOctopus(a.x, a.y, a.w, a.h, a.color, a.frame);
    }

    function drawUFO() {
        if (!ufo) return;
        ctx.save();
        ctx.shadowColor = '#ff0066';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ff3366';
        const cx = ufo.x + ufo.w / 2;
        const cy = ufo.y + ufo.h / 2;
        ctx.fillRect(cx - 20, cy - 2, 40, 8);
        ctx.fillRect(cx - 14, cy - 8, 28, 6);
        ctx.fillRect(cx - 6, cy - 12, 12, 4);
        ctx.fillStyle = '#ff88aa';
        ctx.fillRect(cx - 16, cy + 4, 4, 3);
        ctx.fillRect(cx - 4, cy + 4, 4, 3);
        ctx.fillRect(cx + 8, cy + 4, 4, 3);
        ctx.restore();
    }

    function drawShields() {
        ctx.fillStyle = '#33ff33';
        ctx.shadowColor = '#33ff33';
        ctx.shadowBlur = 2;
        for (const b of shields) {
            if (b.alive) {
                ctx.fillRect(b.x, b.y, b.w, b.h);
            }
        }
        ctx.shadowBlur = 0;
    }

    function drawBullets() {
        if (playerBullet) {
            ctx.save();
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(playerBullet.x, playerBullet.y, BULLET_W, BULLET_H);
            ctx.restore();
        }
        for (const b of alienBullets) {
            ctx.save();
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 6;
            ctx.fillStyle = '#ff6622';
            ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);
            ctx.restore();
        }
    }

    function drawParticles() {
        for (const p of particles) {
            ctx.globalAlpha = p.life / 50;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }

    function drawLivesIndicator() {
        ctx.save();
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 4;
        ctx.fillStyle = '#00ddff';
        for (let i = 0; i < lives - 1; i++) {
            const lx = 14 + i * 30;
            const ly = BASE_HEIGHT - 16;
            ctx.fillRect(lx, ly + 4, 20, 8);
            ctx.fillRect(lx + 8, ly, 4, 6);
        }
        ctx.restore();
    }

    function rectsOverlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function aliensAlive() {
        return aliens.filter(a => a.alive);
    }

    function movePlayer() {
        if (keys['ArrowLeft'] || keys['a']) player.x -= player.speed;
        if (keys['ArrowRight'] || keys['d']) player.x += player.speed;
        player.x = Math.max(0, Math.min(BASE_WIDTH - player.w, player.x));
    }

    function moveAliens(dt) {
        alienMoveTimer += dt;
        const alive = aliensAlive();
        if (alive.length === 0) return;

        const totalAliens = ALIEN_ROWS * ALIEN_COLS;
        const destroyed = totalAliens - alive.length;
        const speedFactor = 1 + destroyed * 0.04;
        const currentInterval = alienMoveInterval / speedFactor;

        if (alienMoveTimer >= currentInterval) {
            alienMoveTimer = 0;

            let minX = BASE_WIDTH, maxX = 0;
            for (const a of alive) {
                if (a.x < minX) minX = a.x;
                if (a.x + a.w > maxX) maxX = a.x + a.w;
            }

            let needDrop = false;
            const step = 8;

            if (alienDir === 1 && maxX + step > BASE_WIDTH - 5) {
                needDrop = true;
            } else if (alienDir === -1 && minX - step < 5) {
                needDrop = true;
            }

            if (needDrop) {
                alienDir *= -1;
                for (const a of alive) {
                    a.y += 16;
                    a.frame = a.frame === 0 ? 1 : 0;
                }
            } else {
                for (const a of alive) {
                    a.x += step * alienDir;
                    a.frame = a.frame === 0 ? 1 : 0;
                }
            }
        }
    }

    function alienShoot() {
        const alive = aliensAlive();
        if (alive.length === 0) return;
        const shootChance = 0.008 + wave * 0.002;
        if (Math.random() < shootChance) {
            const shooter = alive[Math.floor(Math.random() * alive.length)];
            alienBullets.push({
                x: shooter.x + shooter.w / 2 - BULLET_W / 2,
                y: shooter.y + shooter.h,
                w: BULLET_W,
                h: BULLET_H
            });
        }
    }

    function moveBullets() {
        if (playerBullet) {
            playerBullet.y -= 7;
            if (playerBullet.y + BULLET_H < 0) playerBullet = null;
        }
        for (let i = alienBullets.length - 1; i >= 0; i--) {
            alienBullets[i].y += 4;
            if (alienBullets[i].y > BASE_HEIGHT) {
                alienBullets.splice(i, 1);
            }
        }
    }

    function checkCollisions() {
        if (playerBullet) {
            for (const a of aliens) {
                if (a.alive && rectsOverlap(playerBullet, a)) {
                    a.alive = false;
                    score += a.points;
                    spawnParticles(a.x + a.w / 2, a.y + a.h / 2, a.color, 12);
                    playerBullet = null;
                    updateHUD();
                    break;
                }
            }
        }

        if (playerBullet && ufo) {
            if (rectsOverlap(playerBullet, ufo)) {
                const bonus = (Math.floor(Math.random() * 6) + 1) * 50;
                score += bonus;
                spawnParticles(ufo.x + ufo.w / 2, ufo.y + ufo.h / 2, '#ff3366', 18);
                ufo = null;
                playerBullet = null;
                updateHUD();
            }
        }

        if (playerBullet) {
            for (const b of shields) {
                if (b.alive && rectsOverlap(playerBullet, b)) {
                    b.alive = false;
                    playerBullet = null;
                    break;
                }
            }
        }

        for (let i = alienBullets.length - 1; i >= 0; i--) {
            const ab = alienBullets[i];
            for (const b of shields) {
                if (b.alive && rectsOverlap(ab, b)) {
                    b.alive = false;
                    alienBullets.splice(i, 1);
                    i--;
                    break;
                }
            }
        }

        for (let i = alienBullets.length - 1; i >= 0; i--) {
            const ab = alienBullets[i];
            if (player.alive && rectsOverlap(ab, player)) {
                alienBullets.splice(i, 1);
                playerHit();
                break;
            }
        }

        const alive = aliensAlive();
        for (const a of alive) {
            if (a.y + a.h >= player.y) {
                playerHit();
                lives = 0;
                updateHUD();
                break;
            }
        }
    }

    function playerHit() {
        spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#00ffff', 20);
        player.alive = false;
        lives--;
        updateHUD();
        state = STATE_DYING;
        dyingTimer = 90;
    }

    function moveUFO(dt) {
        if (ufo) {
            ufo.x += ufo.speed;
            if (ufo.x > BASE_WIDTH + 60 || ufo.x + ufo.w < -60) {
                ufo = null;
            }
        } else {
            if (Math.random() < 0.001) {
                const dir = Math.random() < 0.5 ? 1 : -1;
                ufo = {
                    x: dir === 1 ? -50 : BASE_WIDTH + 50,
                    y: 20,
                    w: 48,
                    h: 20,
                    speed: dir * 2
                };
            }
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    function update(dt) {
        if (state === STATE_PLAYING) {
            movePlayer();
            moveAliens(dt);
            alienShoot();
            moveBullets();
            moveUFO(dt);
            checkCollisions();
            updateParticles();

            if (aliensAlive().length === 0) {
                state = STATE_WAVE_CLEAR;
                waveClearTimer = 120;
                showMessage('WAVE ' + wave + ' COMPLETE!');
            }
        } else if (state === STATE_DYING) {
            updateParticles();
            dyingTimer--;
            if (dyingTimer <= 0) {
                if (lives <= 0) {
                    state = STATE_GAME_OVER;
                    showMessage('GAME OVER<br>Score: ' + score + '<br><br>Press Space to Restart');
                } else {
                    resetPlayer();
                    playerBullet = null;
                    alienBullets = [];
                    state = STATE_PLAYING;
                }
            }
        } else if (state === STATE_WAVE_CLEAR) {
            updateParticles();
            waveClearTimer--;
            if (waveClearTimer <= 0) {
                wave++;
                hideMessage();
                initWave();
                updateHUD();
                state = STATE_PLAYING;
            }
        }
    }

    function render() {
        ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

        ctx.fillStyle = '#000022';
        ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

        drawShields();
        for (const a of aliens) drawAlien(a);
        drawUFO();
        drawPlayer();
        drawBullets();
        drawParticles();
        drawLivesIndicator();
    }

    let lastTime = 0;
    function gameLoop(timestamp) {
        const dt = timestamp - lastTime;
        lastTime = timestamp;

        update(dt);
        render();

        requestAnimationFrame(gameLoop);
    }

    document.addEventListener('keydown', function (e) {
        keys[e.key] = true;

        if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
        }

        if (e.key === ' ') {
            if (state === STATE_START) {
                hideMessage();
                initGame();
                state = STATE_PLAYING;
            } else if (state === STATE_GAME_OVER) {
                hideMessage();
                initGame();
                state = STATE_PLAYING;
            } else if (state === STATE_PLAYING && !playerBullet && player.alive) {
                playerBullet = {
                    x: player.x + player.w / 2 - BULLET_W / 2,
                    y: player.y - BULLET_H,
                    w: BULLET_W,
                    h: BULLET_H
                };
            }
        }
    });

    document.addEventListener('keyup', function (e) {
        keys[e.key] = false;
    });

    showMessage('SPACE INVADERS<br><br>Press Space to Start<br><br><small>← → Move &nbsp; Space Shoot</small>');
    requestAnimationFrame(gameLoop);
})();
