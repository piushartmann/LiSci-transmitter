let yourTurn = true;

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

    const squares = Array.from(document.getElementsByClassName('playable'));
    squares.forEach(square => {
        square.addEventListener('click', () => {
            if (!yourTurn) {
                return;
            }
            if (!square.classList.contains('set')) {
                square.classList.add('set');
                let icon = document.createElement('img');
                icon.src = '/icons/games/ttt-cross.svg';
                icon.className = 'icon';
                square.appendChild(icon);

                yourTurn = false;

                fetch('/games/tic-tac-toe/move', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        gameID: "6712bc555478c7311a8dbd4b",
                        index: squares.indexOf(square),
                    })
                }).then(async (res) => {
                    if (res.ok) {
                        updateBoard((await res.json()).board);
                    }
                })
            }
        });
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


function updateBoard(board) {
    const squares = document.getElementsByClassName('playable');
    const mainGame = document.getElementById('game');
    const mainSquares = Array.from(mainGame.children);
    const games = Array.from(document.getElementsByClassName('game'));

    console.log(games);
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const square = squares[i * 9 + j];
            const actioned = board[i][j] !== 0;
            if (actioned) {
                if (!square.classList.contains('set')) {
                    square.classList.add('set');
                    addIcon(square, board[i][j] === 1 ? '/icons/games/ttt-cross.svg' : '/icons/games/ttt-circle.svg');
                }
            }
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
    yourTurn = true;
}

function addIcon(parent, src) {
    let icon = document.createElement('img');
    icon.src = src;
    icon.className = 'icon';
    parent.appendChild(icon);
}