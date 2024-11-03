let yourTurn = false;
let gameID = null;

const gameHTML = `<div class="inner game">
<div class="inner square top left"></div>
<div class="inner square top"></div>
<div class="inner square top right"></div>
<div class="inner square left"></div>
<div class="inner square"></div>
<div class="inner square right"></div>
<div class="inner square bottom left"></div>
<div class="inner square bottom"></div>
<div class="inner square bottom right"></div>
</div>`

document.addEventListener('DOMContentLoaded', async () => {

    const game = document.getElementById('game');
    addInnerBoards(game, 1);

    const urlParts = window.location.pathname.split('/');
    gameID = urlParts[urlParts.length - 1];

    const ws = connectToWS(gameID);

    const squares = Array.from(document.getElementsByClassName('playable'));
    squares.forEach(square => {
        square.addEventListener('click', () => {
            if (!yourTurn) {
                return;
            }
            if (!square.classList.contains('set')) {
                ws.send(JSON.stringify({ "type": "move", "index": squares.indexOf(square) }));
            }
        });
    });

    window.addEventListener("focus", () => {
        if (typeof ws !== 'undefined') return;
        ws.connect();
    });
});

function addInnerBoards(game, depth) {

    const baseWidth = 1;

    if (depth < 1) {
        Array.from(game.children).forEach(child => {
            child.classList.add('playable');
        });
        return;
    }

    Array.from(game.children).forEach(child => {
        child.innerHTML = gameHTML;
        child.style = `border-width: ${baseWidth + (depth * 5)}px;`;
        addInnerBoards(child.childNodes[0], depth - 1);
    });
}


function updateBoard(board, player, nextGame) {
    const squares = document.getElementsByClassName('playable');
    const mainGame = document.getElementById('game');
    const mainSquares = Array.from(mainGame.children);
    const games = Array.from(document.getElementsByClassName('game'));
    const turnDescription = document.getElementById('turnDescription');
    const currentSymbol = document.getElementById('currentSymbol');

    console.log(board);

    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const square = squares[i * 9 + j];
            const actioned = board[i][j] !== 0;

            if (actioned) {
                if (!square.classList.contains('set')) {
                    square.classList.add('set');
                    number = board[i][j];
                    addIcon(square, number === 1 ? '/icons/games/ttt-cross.svg' : '/icons/games/ttt-circle.svg');
                }
            }
        }

        if (board[i][9] === 0) {
            if (nextGame !== i && nextGame !== -1) {
                mainSquares[i].classList.add('not-selectable');
            }
            else {
                mainSquares[i].classList.remove('not-selectable');
            }
        }
        else {
            mainSquares[i].classList.remove('not-selectable');
        }

        if (board[i][9] === 1) {
            if (mainSquares[i].classList.contains('won')) {
                continue;
            }
            games[i + 1].classList.add('won');
            mainSquares[i].classList.add('won');
            addIcon(mainSquares[i], '/icons/games/ttt-cross.svg');
        } else if (board[i][9] === -1) {
            if (mainSquares[i].classList.contains('lost')) {
                continue;
            }
            games[i + 1].classList.add('lost');
            mainSquares[i].classList.add('lost');
            addIcon(mainSquares[i], '/icons/games/ttt-circle.svg');
        }
    }
    if (board[10] === player) {
        turnDescription.innerText = "Dein Zug";
        currentSymbol.src = player === 1 ? '/icons/games/ttt-cross.svg' : '/icons/games/ttt-circle.svg';
        yourTurn = true;
    } else {
        turnDescription.innerText = "Warte auf Gegner";
        currentSymbol.src = player === 1 ? '/icons/games/ttt-circle.svg' : '/icons/games/ttt-cross.svg';
        yourTurn = false;
    }
}

function addIcon(parent, src) {
    let icon = document.createElement('img');
    icon.src = src;
    icon.className = 'icon';
    parent.appendChild(icon);
}

function deleteGame() {

    confirm("Are you sure you want to delete this game?") ? fetch('/games/tic-tac-toe/deleteGame', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            gameID: gameID,
        })
    }).then(async (res) => {
        if (res.ok) {
            window.location.href = '/games';
        }
    }) : null;
}

function gameOver(status) {
    const banner = document.getElementById('gameOverBanner');
    const bannerText = document.getElementById('gameOverText');
    const bannerIcon = document.getElementById('gameOverIcon');

    if (status === 1) {
        bannerText.innerText = "Du hast gewonnen!";
        bannerIcon.src = '/icons/games/ttt-cross.svg';
    } else if (status === -1) {
        bannerText.innerText = "Du hast verloren!";
        bannerIcon.src = '/icons/games/ttt-circle.svg';
    }
    else {
        bannerText.innerText = "Unentschieden!";
        bannerIcon.src = '/icons/games/ttt-tie.svg';
    }

    banner.style.display = 'flex';
}

function connectToWS(gameID) {
    const ws = new WebSocket(window.location.origin.replace(/^http/, 'ws') + `/games/tic-tac-toe/${gameID}`);
    ws.onopen = () => {
        console.log('Connected to server');
    }
    ws.onmessage = (event) => {
        data = JSON.parse(event.data);
        if (data.type === 'board') {
            if (data.board.length === 0) {
                console.error('Game not found');
                return;
            }
            updateBoard(data.board, data.player, data.nextGame);
            if (data.board[9] !== 0) {
                gameOver(data.board[9]);
            }
        }
    }
    ws.onclose = () => {
        console.log('Disconnected from server');
    }
    return ws;
}