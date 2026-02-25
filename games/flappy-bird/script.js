(function () {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const highScoreEl = document.getElementById('highScore');
    const messageEl = document.getElementById('message');

    function resizeCanvas() {
        canvas.width = Math.min(500, window.innerWidth - 40);
        canvas.height = Math.min(600, window.innerHeight - 200);
    }
    resizeCanvas();
    window.addEventListener('resize', function () {
        resizeCanvas();
        if (state === 'idle') drawIdle();
    });

    const GRAVITY = 0.35;
    const FLAP_STRENGTH = -6.5;
    const PIPE_WIDTH = 52;
    const PIPE_GAP = 170;
    const PIPE_SPEED = 2.5;
    const PIPE_SPAWN_INTERVAL = 110;
    const BIRD_RADIUS = 14;
    const STAR_COUNT = 60;

    let state = 'idle';
    let bird, pipes, score, highScore, frameCount, stars;

    highScore = parseInt(localStorage.getItem('flappyBirdHighScore')) || 0;
    highScoreEl.textContent = highScore;

    function createStars() {
        stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.4 + 0.1,
                brightness: Math.random()
            });
        }
    }

    function resetGame() {
        bird = {
            x: canvas.width * 0.25,
            y: canvas.height * 0.35,
            vy: 0,
            rotation: 0
        };
        pipes = [];
        score = 0;
        frameCount = 0;
        scoreEl.textContent = '0';
        createStars();
    }

    function flap() {
        bird.vy = FLAP_STRENGTH;
    }

    function spawnPipe() {
        const minTop = 60;
        const maxTop = canvas.height - PIPE_GAP - 60;
        const topHeight = Math.random() * (maxTop - minTop) + minTop;
        pipes.push({
            x: canvas.width,
            topHeight: topHeight,
            scored: false
        });
    }

    function updateStars() {
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            s.x -= s.speed;
            s.brightness += (Math.random() - 0.5) * 0.05;
            if (s.brightness < 0.2) s.brightness = 0.2;
            if (s.brightness > 1) s.brightness = 1;
            if (s.x < 0) {
                s.x = canvas.width;
                s.y = Math.random() * canvas.height;
            }
        }
    }

    function drawStars() {
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            ctx.globalAlpha = s.brightness * 0.7;
            ctx.fillStyle = '#aaccff';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function drawBird() {
        ctx.save();
        ctx.translate(bird.x, bird.y);

        const targetRotation = bird.vy * 3.5;
        const clampedRotation = Math.max(-30, Math.min(70, targetRotation));
        bird.rotation += (clampedRotation - bird.rotation) * 0.15;
        ctx.rotate((bird.rotation * Math.PI) / 180);

        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 18;

        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(0, 0, BIRD_RADIUS * 0.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000022';
        ctx.beginPath();
        ctx.arc(BIRD_RADIUS * 0.35, -BIRD_RADIUS * 0.2, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.moveTo(BIRD_RADIUS * 0.7, -2);
        ctx.lineTo(BIRD_RADIUS * 1.3, 1);
        ctx.lineTo(BIRD_RADIUS * 0.7, 4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    function drawPipe(pipe) {
        const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
        gradient.addColorStop(0, '#00cc44');
        gradient.addColorStop(0.5, '#00ff66');
        gradient.addColorStop(1, '#00cc44');

        ctx.shadowColor = '#00ff66';
        ctx.shadowBlur = 12;

        ctx.fillStyle = gradient;
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);

        const capHeight = 18;
        const capOverhang = 6;
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(pipe.x - capOverhang, pipe.topHeight - capHeight, PIPE_WIDTH + capOverhang * 2, capHeight);

        const bottomY = pipe.topHeight + PIPE_GAP;
        ctx.fillStyle = gradient;
        ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, canvas.height - bottomY);

        ctx.fillStyle = '#00ff88';
        ctx.fillRect(pipe.x - capOverhang, bottomY, PIPE_WIDTH + capOverhang * 2, capHeight);

        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#00ff66';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        ctx.strokeRect(pipe.x, bottomY, PIPE_WIDTH, canvas.height - bottomY);
    }

    function drawGround() {
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00aaff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - 1);
        ctx.lineTo(canvas.width, canvas.height - 1);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    function drawScore() {
        ctx.save();
        ctx.font = 'bold 36px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 15;
        ctx.fillText(score, canvas.width / 2, 50);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    function checkCollision() {
        if (bird.y - BIRD_RADIUS < 0) {
            bird.y = BIRD_RADIUS;
            bird.vy = 0;
            return false;
        }
        if (bird.y + BIRD_RADIUS > canvas.height) {
            if (frameCount < 120) {
                bird.y = canvas.height - BIRD_RADIUS;
                bird.vy = -3;
                return false;
            }
            return true;
        }
        for (let i = 0; i < pipes.length; i++) {
            const p = pipes[i];
            const birdLeft = bird.x - BIRD_RADIUS;
            const birdRight = bird.x + BIRD_RADIUS;
            const birdTop = bird.y - BIRD_RADIUS;
            const birdBottom = bird.y + BIRD_RADIUS;

            if (birdRight > p.x && birdLeft < p.x + PIPE_WIDTH) {
                if (birdTop < p.topHeight || birdBottom > p.topHeight + PIPE_GAP) {
                    return true;
                }
            }
        }
        return false;
    }

    function update() {
        frameCount++;

        bird.vy += GRAVITY;
        bird.y += bird.vy;

        if (frameCount > 120 && frameCount % PIPE_SPAWN_INTERVAL === 0) {
            spawnPipe();
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
            pipes[i].x -= PIPE_SPEED;

            if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < bird.x) {
                pipes[i].scored = true;
                score++;
                scoreEl.textContent = score;
            }

            if (pipes[i].x + PIPE_WIDTH < -10) {
                pipes.splice(i, 1);
            }
        }

        updateStars();

        if (checkCollision()) {
            gameOver();
        }
    }

    function draw() {
        ctx.fillStyle = '#000022';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        drawStars();

        for (let i = 0; i < pipes.length; i++) {
            drawPipe(pipes[i]);
        }

        drawGround();
        drawBird();
        drawScore();
    }

    function gameLoop() {
        if (state !== 'playing') return;
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    function startGame() {
        state = 'playing';
        messageEl.innerHTML = '';
        resetGame();
        flap();
        gameLoop();
    }

    function gameOver() {
        state = 'gameover';
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('flappyBirdHighScore', highScore);
            highScoreEl.textContent = highScore;
        }
        draw();
        showMessage('Game Over!<br>Score: ' + score + '<br><br>Click or Press Space<br>to Restart');
    }

    function drawIdle() {
        ctx.fillStyle = '#000022';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (stars) drawStars();
        drawGround();

        ctx.save();
        ctx.translate(canvas.width * 0.25, canvas.height / 2);
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(0, 0, BIRD_RADIUS * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000022';
        ctx.beginPath();
        ctx.arc(BIRD_RADIUS * 0.35, -BIRD_RADIUS * 0.2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.moveTo(BIRD_RADIUS * 0.7, -2);
        ctx.lineTo(BIRD_RADIUS * 1.3, 1);
        ctx.lineTo(BIRD_RADIUS * 0.7, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function showMessage(text) {
        messageEl.innerHTML = '<span>' + text + '</span>';
    }

    function handleInput(e) {
        if (e.type === 'keydown' && e.code !== 'Space') return;
        if (e.type === 'keydown') e.preventDefault();

        if (state === 'idle' || state === 'gameover') {
            startGame();
        } else if (state === 'playing') {
            flap();
        }
    }

    canvas.addEventListener('click', handleInput);
    canvas.addEventListener('touchstart', function (e) {
        e.preventDefault();
        handleInput(e);
    }, { passive: false });
    document.addEventListener('keydown', handleInput);

    createStars();
    drawIdle();
    showMessage('Click or Press Space<br>to Start');
})();
