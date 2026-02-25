const SYMBOLS = ['🚀', '🎮', '👾', '🛸', '⚡', '🌟', '🎯', '💎'];
const SYMBOL_COLORS = {
    '🚀': '#ff4444',
    '🎮': '#44ff44',
    '👾': '#aa44ff',
    '🛸': '#44ffff',
    '⚡': '#ffff00',
    '🌟': '#ffaa00',
    '🎯': '#ff4488',
    '💎': '#44aaff'
};

let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let lockBoard = false;

const gameGrid = document.getElementById('gameGrid');
const movesDisplay = document.getElementById('moves');
const matchesDisplay = document.getElementById('matches');
const bestScoreDisplay = document.getElementById('bestScore');
const restartBtn = document.getElementById('restartBtn');

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function createCards() {
    const pairs = [...SYMBOLS, ...SYMBOLS];
    shuffle(pairs);
    return pairs.map((symbol, index) => ({
        id: index,
        symbol: symbol,
        color: SYMBOL_COLORS[symbol]
    }));
}

function renderCard(card) {
    const cardEl = document.createElement('div');
    cardEl.classList.add('card');
    cardEl.dataset.id = card.id;

    const inner = document.createElement('div');
    inner.classList.add('card-inner');

    const front = document.createElement('div');
    front.classList.add('card-front');
    front.textContent = '?';

    const back = document.createElement('div');
    back.classList.add('card-back');
    back.textContent = card.symbol;
    back.style.borderColor = card.color;

    inner.appendChild(front);
    inner.appendChild(back);
    cardEl.appendChild(inner);

    cardEl.addEventListener('click', () => flipCard(cardEl, card));

    return cardEl;
}

function flipCard(cardEl, card) {
    if (lockBoard) return;
    if (cardEl.classList.contains('flipped')) return;
    if (cardEl.classList.contains('matched')) return;

    cardEl.classList.add('flipped');
    flippedCards.push({ el: cardEl, card: card });

    if (flippedCards.length === 2) {
        moves++;
        movesDisplay.textContent = moves;
        checkMatch();
    }
}

function checkMatch() {
    const [first, second] = flippedCards;

    if (first.card.symbol === second.card.symbol) {
        first.el.classList.add('matched');
        second.el.classList.add('matched');
        matchedPairs++;
        matchesDisplay.textContent = matchedPairs;
        flippedCards = [];

        if (matchedPairs === 8) {
            setTimeout(() => endGame(), 400);
        }
    } else {
        lockBoard = true;
        setTimeout(() => {
            first.el.classList.remove('flipped');
            second.el.classList.remove('flipped');
            flippedCards = [];
            lockBoard = false;
        }, 800);
    }
}

function endGame() {
    const best = localStorage.getItem('memoryMatchBest');
    if (!best || moves < parseInt(best, 10)) {
        localStorage.setItem('memoryMatchBest', moves);
        bestScoreDisplay.textContent = moves;
    }
    setTimeout(() => {
        alert(`Congratulations! You matched all pairs in ${moves} moves!`);
    }, 100);
}

function loadBestScore() {
    const best = localStorage.getItem('memoryMatchBest');
    bestScoreDisplay.textContent = best ? best : '-';
}

function initGame() {
    gameGrid.innerHTML = '';
    cards = createCards();
    flippedCards = [];
    matchedPairs = 0;
    moves = 0;
    lockBoard = false;
    movesDisplay.textContent = '0';
    matchesDisplay.textContent = '0';
    loadBestScore();

    cards.forEach(card => {
        gameGrid.appendChild(renderCard(card));
    });
}

restartBtn.addEventListener('click', initGame);

initGame();
