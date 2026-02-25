(function () {
    'use strict';

    var canvas = document.getElementById('gameCanvas');
    var ctx = canvas.getContext('2d');
    var messageEl = document.getElementById('message');
    var playerScoreEl = document.getElementById('playerScore');
    var aiScoreEl = document.getElementById('aiScore');
    var winsEl = document.getElementById('wins');

    var BASE_WIDTH = 800;
    var BASE_HEIGHT = 500;
    var WINNING_SCORE = 11;
    var PADDLE_WIDTH = 12;
    var PADDLE_HEIGHT = 80;
    var BALL_SIZE = 10;
    var PADDLE_MARGIN = 20;
    var BALL_BASE_SPEED = 5;
    var BALL_SPEED_INCREMENT = 0.3;
    var BALL_MAX_SPEED = 12;
    var AI_SPEED = 3.5;
    var AI_REACTION_DISTANCE = 0.35;
    var TRAIL_LENGTH = 8;

    var scale = 1;
    var state = 'idle';
    var playerScore = 0;
    var aiScore = 0;

    var player = { x: 0, y: 0, w: PADDLE_WIDTH, h: PADDLE_HEIGHT, dy: 0 };
    var ai = { x: 0, y: 0, w: PADDLE_WIDTH, h: PADDLE_HEIGHT };
    var ball = { x: 0, y: 0, dx: 0, dy: 0, speed: BALL_BASE_SPEED };
    var trail = [];

    var keys = {};
    var mouseY = null;
    var useMouseControl = false;

    function loadWins() {
        var w = parseInt(localStorage.getItem('retroPongWins'), 10);
        return isNaN(w) ? 0 : w;
    }

    function saveWins(count) {
        localStorage.setItem('retroPongWins', count.toString());
    }

    function resizeCanvas() {
        var container = document.getElementById('gameContainer');
        var maxW = container.clientWidth;
        scale = Math.min(maxW / BASE_WIDTH, 1);
        canvas.width = BASE_WIDTH * scale;
        canvas.height = BASE_HEIGHT * scale;
    }

    function s(val) {
        return val * scale;
    }

    function resetPositions() {
        player.x = PADDLE_MARGIN;
        player.y = (BASE_HEIGHT - PADDLE_HEIGHT) / 2;
        player.dy = 0;

        ai.x = BASE_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH;
        ai.y = (BASE_HEIGHT - PADDLE_HEIGHT) / 2;

        ball.x = BASE_WIDTH / 2;
        ball.y = BASE_HEIGHT / 2;
        ball.speed = BALL_BASE_SPEED;

        var angle = (Math.random() * Math.PI / 3) - Math.PI / 6;
        var dir = Math.random() < 0.5 ? 1 : -1;
        ball.dx = Math.cos(angle) * ball.speed * dir;
        ball.dy = Math.sin(angle) * ball.speed;

        trail = [];
    }

    function showMessage(text) {
        messageEl.textContent = text;
        messageEl.style.display = 'block';
    }

    function hideMessage() {
        messageEl.style.display = 'none';
    }

    function updateScoreDisplay() {
        playerScoreEl.textContent = playerScore;
        aiScoreEl.textContent = aiScore;
        winsEl.textContent = loadWins();
    }

    function handleInput() {
        var speed = 6;
        player.dy = 0;

        if (useMouseControl && mouseY !== null) {
            var targetY = mouseY / scale - player.h / 2;
            var diff = targetY - player.y;
            var maxMove = 8;
            player.dy = Math.max(-maxMove, Math.min(maxMove, diff));
        } else {
            if (keys['ArrowUp'] || keys['w'] || keys['W']) player.dy = -speed;
            if (keys['ArrowDown'] || keys['s'] || keys['S']) player.dy = speed;
        }

        player.y += player.dy;
        player.y = Math.max(0, Math.min(BASE_HEIGHT - player.h, player.y));
    }

    function updateAI() {
        var ballInRange = ball.dx > 0 && ball.x > BASE_WIDTH * AI_REACTION_DISTANCE;
        var targetY;

        if (ballInRange) {
            targetY = ball.y - ai.h / 2;
        } else {
            targetY = BASE_HEIGHT / 2 - ai.h / 2;
        }

        var diff = targetY - ai.y;
        var jitter = (Math.random() - 0.5) * 1.2;
        var move = Math.max(-AI_SPEED, Math.min(AI_SPEED, diff)) + jitter;

        ai.y += move;
        ai.y = Math.max(0, Math.min(BASE_HEIGHT - ai.h, ai.y));
    }

    function updateBall() {
        trail.push({ x: ball.x, y: ball.y });
        if (trail.length > TRAIL_LENGTH) trail.shift();

        ball.x += ball.dx;
        ball.y += ball.dy;

        if (ball.y - BALL_SIZE / 2 <= 0) {
            ball.y = BALL_SIZE / 2;
            ball.dy = Math.abs(ball.dy);
        }
        if (ball.y + BALL_SIZE / 2 >= BASE_HEIGHT) {
            ball.y = BASE_HEIGHT - BALL_SIZE / 2;
            ball.dy = -Math.abs(ball.dy);
        }

        if (
            ball.dx < 0 &&
            ball.x - BALL_SIZE / 2 <= player.x + player.w &&
            ball.x + BALL_SIZE / 2 >= player.x &&
            ball.y >= player.y &&
            ball.y <= player.y + player.h
        ) {
            handlePaddleHit(player);
        }

        if (
            ball.dx > 0 &&
            ball.x + BALL_SIZE / 2 >= ai.x &&
            ball.x - BALL_SIZE / 2 <= ai.x + ai.w &&
            ball.y >= ai.y &&
            ball.y <= ai.y + ai.h
        ) {
            handlePaddleHit(ai);
        }

        if (ball.x < -BALL_SIZE) {
            aiScore++;
            updateScoreDisplay();
            if (aiScore >= WINNING_SCORE) {
                state = 'gameover';
                showMessage('AI Wins!\nPress Space to Restart');
            } else {
                resetPositions();
            }
        }

        if (ball.x > BASE_WIDTH + BALL_SIZE) {
            playerScore++;
            updateScoreDisplay();
            if (playerScore >= WINNING_SCORE) {
                var wins = loadWins() + 1;
                saveWins(wins);
                state = 'gameover';
                showMessage('You Win!\nPress Space to Restart');
                updateScoreDisplay();
            } else {
                resetPositions();
            }
        }
    }

    function handlePaddleHit(paddle) {
        var relativeY = (ball.y - paddle.y) / paddle.h;
        var angle = (relativeY - 0.5) * (Math.PI / 2.5);
        var dir = paddle === player ? 1 : -1;

        ball.speed = Math.min(ball.speed + BALL_SPEED_INCREMENT, BALL_MAX_SPEED);
        ball.dx = Math.cos(angle) * ball.speed * dir;
        ball.dy = Math.sin(angle) * ball.speed;

        if (dir === 1) {
            ball.x = paddle.x + paddle.w + BALL_SIZE / 2;
        } else {
            ball.x = paddle.x - BALL_SIZE / 2;
        }
    }

    function drawBackground() {
        ctx.fillStyle = '#000011';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function drawCenterLine() {
        ctx.setLineDash([s(8), s(8)]);
        ctx.strokeStyle = 'rgba(0, 170, 255, 0.2)';
        ctx.lineWidth = s(2);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function drawPaddle(paddle, color) {
        var x = s(paddle.x);
        var y = s(paddle.y);
        var w = s(paddle.w);
        var h = s(paddle.h);

        ctx.shadowColor = color;
        ctx.shadowBlur = s(15);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);

        ctx.shadowColor = color;
        ctx.shadowBlur = s(30);
        ctx.fillRect(x, y, w, h);

        ctx.shadowBlur = 0;
    }

    function drawTrail() {
        for (var i = 0; i < trail.length; i++) {
            var t = trail[i];
            var alpha = (i + 1) / (trail.length + 1) * 0.35;
            var radius = s(BALL_SIZE / 2) * (0.4 + 0.6 * (i / trail.length));

            ctx.beginPath();
            ctx.arc(s(t.x), s(t.y), radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 100, ' + alpha + ')';
            ctx.fill();
        }
    }

    function drawBall() {
        var x = s(ball.x);
        var y = s(ball.y);
        var r = s(BALL_SIZE / 2);

        ctx.shadowColor = '#ffff66';
        ctx.shadowBlur = s(20);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.shadowBlur = s(40);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#ffff99';
        ctx.fill();

        ctx.shadowBlur = 0;
    }

    function drawScoresOnCanvas() {
        ctx.font = s(40) + 'px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0, 255, 255, 0.08)';
        ctx.fillText(playerScore.toString(), canvas.width * 0.25, s(55));
        ctx.fillText(aiScore.toString(), canvas.width * 0.75, s(55));
    }

    function render() {
        drawBackground();
        drawCenterLine();
        drawScoresOnCanvas();
        drawTrail();
        drawPaddle(player, '#00ffff');
        drawPaddle(ai, '#00ffff');
        if (state === 'playing') {
            drawBall();
        } else if (state === 'idle') {
            drawBall();
        }
    }

    function gameLoop() {
        if (state === 'playing') {
            handleInput();
            updateAI();
            updateBall();
        } else if (state === 'idle') {
            handleInput();
        }

        render();
        requestAnimationFrame(gameLoop);
    }

    function startGame() {
        playerScore = 0;
        aiScore = 0;
        updateScoreDisplay();
        resetPositions();
        hideMessage();
        state = 'playing';
    }

    window.addEventListener('keydown', function (e) {
        keys[e.key] = true;
        useMouseControl = false;

        if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            if (state === 'idle' || state === 'gameover') {
                startGame();
            }
        }
    });

    window.addEventListener('keyup', function (e) {
        keys[e.key] = false;
    });

    canvas.addEventListener('mousemove', function (e) {
        var rect = canvas.getBoundingClientRect();
        mouseY = e.clientY - rect.top;
        useMouseControl = true;
    });

    canvas.addEventListener('mouseleave', function () {
        mouseY = null;
        useMouseControl = false;
    });

    canvas.addEventListener('click', function () {
        if (state === 'idle' || state === 'gameover') {
            startGame();
        }
    });

    window.addEventListener('resize', function () {
        resizeCanvas();
    });

    resizeCanvas();
    resetPositions();
    updateScoreDisplay();
    showMessage('Press Space to Start');
    gameLoop();
})();
