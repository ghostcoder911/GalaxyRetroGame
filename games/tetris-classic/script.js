(function () {
    'use strict';

    const COLS = 10;
    const ROWS = 20;
    const CELL = 30;
    const NEXT_CELLS = 4;
    const NEXT_CELL = 30;

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = COLS * CELL;
    canvas.height = ROWS * CELL;

    const nextCanvas = document.getElementById('nextCanvas');
    const nctx = nextCanvas.getContext('2d');
    nextCanvas.width = NEXT_CELLS * NEXT_CELL;
    nextCanvas.height = NEXT_CELLS * NEXT_CELL;

    const scoreEl = document.getElementById('score');
    const levelEl = document.getElementById('level');
    const linesEl = document.getElementById('lines');
    const messageEl = document.getElementById('message');
    const highScoreEl = document.getElementById('highScoreValue');

    const COLORS = {
        I: '#00ffff',
        O: '#ffff00',
        T: '#aa00ff',
        S: '#00ff66',
        Z: '#ff3333',
        J: '#3366ff',
        L: '#ff8800'
    };

    const GLOW = {
        I: 'rgba(0,255,255,',
        O: 'rgba(255,255,0,',
        T: 'rgba(170,0,255,',
        S: 'rgba(0,255,102,',
        Z: 'rgba(255,51,51,',
        J: 'rgba(51,102,255,',
        L: 'rgba(255,136,0,'
    };

    const SHAPES = {
        I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
        O: [[1,1],[1,1]],
        T: [[0,1,0],[1,1,1],[0,0,0]],
        S: [[0,1,1],[1,1,0],[0,0,0]],
        Z: [[1,1,0],[0,1,1],[0,0,0]],
        J: [[1,0,0],[1,1,1],[0,0,0]],
        L: [[0,0,1],[1,1,1],[0,0,0]]
    };

    const WALL_KICKS_JLSTZ = [
        [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
        [[0,0],[1,0],[1,-1],[0,2],[1,2]],
        [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
        [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
        [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
        [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
        [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
        [[0,0],[1,0],[1,-1],[0,2],[1,2]]
    ];

    const WALL_KICKS_I = [
        [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
        [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
        [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
        [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
        [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
        [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
        [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
        [[0,0],[-1,0],[2,0],[-1,2],[2,-1]]
    ];

    const PIECE_TYPES = ['I','O','T','S','Z','J','L'];
    const LINE_SCORES = [0, 100, 300, 500, 800];

    let board, currentPiece, nextPiece, score, level, totalLines;
    let dropInterval, dropTimer, gameState, animFrameId;
    let highScore = parseInt(localStorage.getItem('tetrisClassicHighScore')) || 0;
    let clearingRows = [];
    let clearAnimTimer = 0;
    const CLEAR_ANIM_DURATION = 300;

    highScoreEl.textContent = highScore;

    function createBoard() {
        return Array.from({length: ROWS}, () => Array(COLS).fill(null));
    }

    function randomPiece() {
        const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
        const shape = SHAPES[type].map(r => [...r]);
        const col = Math.floor((COLS - shape[0].length) / 2);
        return { type, shape, row: 0, col, rotation: 0 };
    }

    function rotateMatrix(matrix) {
        const n = matrix.length;
        const result = Array.from({length: n}, () => Array(n).fill(0));
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                result[c][n - 1 - r] = matrix[r][c];
            }
        }
        return result;
    }

    function valid(shape, row, col) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const nr = row + r;
                const nc = col + c;
                if (nc < 0 || nc >= COLS || nr >= ROWS) return false;
                if (nr < 0) continue;
                if (board[nr][nc]) return false;
            }
        }
        return true;
    }

    function getWallKickData(piece, newRotation) {
        const from = piece.rotation;
        const to = newRotation;
        let kickIndex;
        if (from === 0 && to === 1) kickIndex = 0;
        else if (from === 1 && to === 0) kickIndex = 1;
        else if (from === 1 && to === 2) kickIndex = 2;
        else if (from === 2 && to === 1) kickIndex = 3;
        else if (from === 2 && to === 3) kickIndex = 4;
        else if (from === 3 && to === 2) kickIndex = 5;
        else if (from === 3 && to === 0) kickIndex = 6;
        else if (from === 0 && to === 3) kickIndex = 7;
        else return [[0,0]];

        return piece.type === 'I' ? WALL_KICKS_I[kickIndex] : WALL_KICKS_JLSTZ[kickIndex];
    }

    function tryRotate() {
        if (currentPiece.type === 'O') return;
        const newShape = rotateMatrix(currentPiece.shape);
        const newRotation = (currentPiece.rotation + 1) % 4;
        const kicks = getWallKickData(currentPiece, newRotation);
        for (const [dx, dy] of kicks) {
            if (valid(newShape, currentPiece.row - dy, currentPiece.col + dx)) {
                currentPiece.shape = newShape;
                currentPiece.col += dx;
                currentPiece.row -= dy;
                currentPiece.rotation = newRotation;
                return;
            }
        }
    }

    function lockPiece() {
        const {shape, row, col, type} = currentPiece;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const br = row + r;
                const bc = col + c;
                if (br < 0) {
                    gameOver();
                    return;
                }
                board[br][bc] = type;
            }
        }
        checkLines();
    }

    function checkLines() {
        clearingRows = [];
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r].every(cell => cell !== null)) {
                clearingRows.push(r);
            }
        }
        if (clearingRows.length > 0) {
            clearAnimTimer = CLEAR_ANIM_DURATION;
            gameState = 'clearing';
        } else {
            spawnNext();
        }
    }

    function finishClear() {
        const count = clearingRows.length;
        clearingRows.sort((a, b) => a - b);
        for (const row of clearingRows) {
            board.splice(row, 1);
            board.unshift(Array(COLS).fill(null));
        }
        score += LINE_SCORES[count] * level;
        totalLines += count;
        level = Math.floor(totalLines / 10) + 1;
        dropInterval = Math.max(50, 1000 - (level - 1) * 80);

        scoreEl.textContent = score;
        levelEl.textContent = level;
        linesEl.textContent = totalLines;

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('tetrisClassicHighScore', highScore);
            highScoreEl.textContent = highScore;
        }

        clearingRows = [];
        clearAnimTimer = 0;
        spawnNext();
    }

    function spawnNext() {
        currentPiece = nextPiece;
        nextPiece = randomPiece();
        if (!valid(currentPiece.shape, currentPiece.row, currentPiece.col)) {
            gameOver();
        }
        gameState = 'playing';
    }

    function ghostRow() {
        let gr = currentPiece.row;
        while (valid(currentPiece.shape, gr + 1, currentPiece.col)) {
            gr++;
        }
        return gr;
    }

    function hardDrop() {
        while (valid(currentPiece.shape, currentPiece.row + 1, currentPiece.col)) {
            currentPiece.row++;
            score += 2;
        }
        scoreEl.textContent = score;
        lockPiece();
    }

    function softDrop() {
        if (valid(currentPiece.shape, currentPiece.row + 1, currentPiece.col)) {
            currentPiece.row++;
            score += 1;
            scoreEl.textContent = score;
        }
    }

    function moveLeft() {
        if (valid(currentPiece.shape, currentPiece.row, currentPiece.col - 1)) {
            currentPiece.col--;
        }
    }

    function moveRight() {
        if (valid(currentPiece.shape, currentPiece.row, currentPiece.col + 1)) {
            currentPiece.col++;
        }
    }

    function tick() {
        if (gameState !== 'playing') return;
        if (valid(currentPiece.shape, currentPiece.row + 1, currentPiece.col)) {
            currentPiece.row++;
        } else {
            lockPiece();
        }
    }

    function gameOver() {
        gameState = 'over';
        if (dropTimer) clearInterval(dropTimer);
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('tetrisClassicHighScore', highScore);
            highScoreEl.textContent = highScore;
        }
        messageEl.innerHTML = 'GAME OVER<div class="sub">Score: ' + score + '<br>Press Space to Restart</div>';
    }

    function drawCell(context, x, y, size, type, alpha) {
        const color = COLORS[type];
        const glowBase = GLOW[type];
        const a = alpha !== undefined ? alpha : 1;

        context.save();
        context.globalAlpha = a;

        context.shadowColor = color;
        context.shadowBlur = 8;

        context.fillStyle = color;
        context.fillRect(x + 1, y + 1, size - 2, size - 2);

        const grad = context.createLinearGradient(x, y, x + size, y + size);
        grad.addColorStop(0, 'rgba(255,255,255,0.25)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
        grad.addColorStop(1, 'rgba(0,0,0,0.2)');
        context.fillStyle = grad;
        context.fillRect(x + 1, y + 1, size - 2, size - 2);

        context.shadowBlur = 0;
        context.strokeStyle = glowBase + (0.6 * a) + ')';
        context.lineWidth = 1;
        context.strokeRect(x + 1.5, y + 1.5, size - 3, size - 3);

        context.restore();
    }

    function drawBoard() {
        ctx.fillStyle = '#000011';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(0,170,255,0.06)';
        ctx.lineWidth = 0.5;
        for (let r = 1; r < ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * CELL);
            ctx.lineTo(canvas.width, r * CELL);
            ctx.stroke();
        }
        for (let c = 1; c < COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * CELL, 0);
            ctx.lineTo(c * CELL, canvas.height);
            ctx.stroke();
        }

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c]) {
                    let alpha = 1;
                    if (clearingRows.includes(r)) {
                        const progress = 1 - (clearAnimTimer / CLEAR_ANIM_DURATION);
                        alpha = Math.cos(progress * Math.PI * 3) * 0.5 + 0.5;
                    }
                    drawCell(ctx, c * CELL, r * CELL, CELL, board[r][c], alpha);
                }
            }
        }
    }

    function drawGhost() {
        if (gameState !== 'playing') return;
        const gr = ghostRow();
        if (gr === currentPiece.row) return;
        const {shape, col, type} = currentPiece;
        ctx.save();
        ctx.globalAlpha = 0.2;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const x = (col + c) * CELL;
                const y = (gr + r) * CELL;
                ctx.strokeStyle = COLORS[type];
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
            }
        }
        ctx.restore();
    }

    function drawCurrentPiece() {
        if (gameState !== 'playing' && gameState !== 'clearing') return;
        if (gameState === 'clearing') return;
        const {shape, row, col, type} = currentPiece;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const br = row + r;
                if (br < 0) continue;
                drawCell(ctx, (col + c) * CELL, br * CELL, CELL, type);
            }
        }
    }

    function drawNextPiece() {
        nctx.fillStyle = '#000011';
        nctx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

        if (!nextPiece) return;
        const {shape, type} = nextPiece;
        const rows = shape.length;
        const cols = shape[0].length;
        const offsetX = Math.floor((NEXT_CELLS - cols) / 2);
        const offsetY = Math.floor((NEXT_CELLS - rows) / 2);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!shape[r][c]) continue;
                drawCell(nctx, (offsetX + c) * NEXT_CELL, (offsetY + r) * NEXT_CELL, NEXT_CELL, type);
            }
        }
    }

    function render(timestamp) {
        if (gameState === 'clearing') {
            if (!render._lastTime) render._lastTime = timestamp;
            const dt = timestamp - render._lastTime;
            render._lastTime = timestamp;
            clearAnimTimer -= dt;
            if (clearAnimTimer <= 0) {
                finishClear();
            }
        } else {
            render._lastTime = timestamp;
        }

        drawBoard();
        drawGhost();
        drawCurrentPiece();
        drawNextPiece();

        animFrameId = requestAnimationFrame(render);
    }

    function startGame() {
        board = createBoard();
        score = 0;
        level = 1;
        totalLines = 0;
        dropInterval = 1000;
        clearingRows = [];
        clearAnimTimer = 0;

        scoreEl.textContent = score;
        levelEl.textContent = level;
        linesEl.textContent = totalLines;

        currentPiece = randomPiece();
        nextPiece = randomPiece();

        messageEl.innerHTML = '';
        gameState = 'playing';

        if (dropTimer) clearInterval(dropTimer);
        dropTimer = setInterval(tick, dropInterval);

        if (animFrameId) cancelAnimationFrame(animFrameId);
        render._lastTime = 0;
        animFrameId = requestAnimationFrame(render);
    }

    function showStartScreen() {
        gameState = 'start';
        board = createBoard();
        drawBoard();
        drawNextPiece();
        messageEl.innerHTML = 'TETRIS<div class="sub">Press Space to Start</div>';
    }

    let levelAtLastInterval = 1;

    document.addEventListener('keydown', function (e) {
        if (e.code === 'Space') {
            e.preventDefault();
            if (gameState === 'start' || gameState === 'over') {
                startGame();
                return;
            }
            if (gameState === 'playing') {
                hardDrop();
                return;
            }
        }

        if (gameState !== 'playing') return;

        switch (e.code) {
            case 'ArrowLeft':
                e.preventDefault();
                moveLeft();
                break;
            case 'ArrowRight':
                e.preventDefault();
                moveRight();
                break;
            case 'ArrowUp':
                e.preventDefault();
                tryRotate();
                break;
            case 'ArrowDown':
                e.preventDefault();
                softDrop();
                resetDropTimer();
                break;
        }

        if (level !== levelAtLastInterval) {
            levelAtLastInterval = level;
            resetDropTimer();
        }
    });

    function resetDropTimer() {
        if (dropTimer) clearInterval(dropTimer);
        dropInterval = Math.max(50, 1000 - (level - 1) * 80);
        dropTimer = setInterval(tick, dropInterval);
    }

    showStartScreen();
})();
