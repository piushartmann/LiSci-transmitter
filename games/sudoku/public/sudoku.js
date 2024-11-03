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

let ws;
let highlightedSquares = [];
let board = [];
let preventImpossibleValues = true;
let highlightImpossibleValues = true;

document.addEventListener('DOMContentLoaded', async () => {

    const game = document.getElementById('game');
    addInnerBoards(game, 1);

    const urlParts = window.location.pathname.split('/');
    gameID = urlParts[urlParts.length - 1];

    ws = connectToWS(gameID);

    window.addEventListener("focus", () => {
        if (typeof ws !== 'undefined') return;
        ws.connect();
    });

    const showErrorsCheckbox = document.getElementById('showErrors');
    const preventErrorsCheckbox = document.getElementById('preventErrors');

    showErrorsCheckbox.addEventListener('change', () => {
        highlightImpossibleValues = showErrorsCheckbox.checked;
        if (!highlightImpossibleValues) {
            unhighlightSquares();
            preventErrorsCheckbox.checked = false;
            preventErrorsCheckbox.disabled = true;
        } else {
            preventErrorsCheckbox.disabled = false;
        }
        sendPreferencesUpdate();
    });

    preventErrorsCheckbox.addEventListener('change', () => {
        preventImpossibleValues = preventErrorsCheckbox.checked;
        sendPreferencesUpdate();
    });
});

function sendPreferencesUpdate() {
    const showErrors = document.getElementById('showErrors');
    const preventErrors = document.getElementById('preventErrors');

    ws.send(JSON.stringify({ type: 'preferences', preferences: { showErrors: showErrors.checked, preventErrors: preventErrors.checked } }));
}

function deleteGame() {

    confirm("Are you sure you want to delete this game?") ? fetch('/games/sudoku/deleteGame', {
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

function connectToWS(gameID) {
    const ws = new WebSocket(window.location.origin.replace(/^http/, 'ws') + `/games/sudoku/${gameID}`);

    const showErrorsCheckbox = document.getElementById('showErrors');
    const preventErrorsCheckbox = document.getElementById('preventErrors');

    ws.onopen = () => {
        console.log('Connected to server');
    }
    ws.onmessage = (event) => {
        data = JSON.parse(event.data);
        if (data.type === 'board') {
            renderBoard(data.board, data.originalBoard);

            const preferences = data.preferences;
            showErrorsCheckbox.checked = preferences.showErrors;
            preventErrorsCheckbox.checked = preferences.preventErrors;
            highlightImpossibleValues = preferences.showErrors;
            preventImpossibleValues = preferences.preventErrors;

            board = data.board;
        }
    }
    ws.onclose = () => {
        console.log('Disconnected from server');
    }
    return ws;
}

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

function transformSquaresToBoard(squares) {
    //restructure square list to match board
    const newSquares = [];
    for (let i = 0; i < 9; i++) {
        let innerSquares = [];
        for (let j = 0; j < 3; j++) {
            //row in square + square row on board + point in square
            const point = ((i * 3) + (Math.floor(i / 3) * 18)) + (j * 9)
            innerSquares = innerSquares.concat(squares.slice(point, point + 3));
        }
        newSquares.push(innerSquares);
    }
    return newSquares;
}

function squareClick(square) {
    let storedValue = square.innerHTML === '' ? 0 : parseInt(square.innerHTML);
    if (/Mobi|Android/i.test(navigator.userAgent)) {
        const input = document.createElement('input');
        input.type = 'number';
        input.inputMode = 'numeric';
        input.min = 0;
        input.max = 9;
        input.style.position = 'absolute';
        input.style.opacity = 0;
        document.body.appendChild(input);
        input.focus();
        input.oninput = () => {
            const value = parseInt(input.value);
            if (value >= 1 && value <= 9) {
                square.innerHTML = value;
                updateBoard(square, storedValue);
                storedValue = value;
            } else if (value === 0 || input.value === '') {
                square.innerHTML = '';
                updateBoard(square, storedValue);
                storedValue = '';
            }
            input.remove();
        };
        input.onkeydown = (e) => {
            if (e.key === 8 || e.key === 46 || e.key === 'Backspace' || e.key === 'Delete') {
                square.innerHTML = '';
                updateBoard(square, storedValue);
                storedValue = '';
                input.remove();
            }
        };
        input.onblur = () => {
            input.remove();
        };
    } else {
        square.contentEditable = true;
        square.style['caret-color'] = 'transparent';
        square.focus();
        square.oninput = () => {
            if (square.innerText.length > 1) {
                square.innerHTML = square.innerText.slice(0, 1);
            }
            if (isNaN(square.innerText)) {
                square.innerHTML = '';
            }
            const value = parseInt(square.innerText);
            if (value >= 1 && value <= 9) {
                square.innerHTML = value;
                updateBoard(square, storedValue);
                storedValue = value;
            } else if (value === 0 || square.innerText === '') {
                square.innerHTML = '';
                updateBoard(square, storedValue);
                storedValue = '';
            }
        };
        square.onkeydown = (e) => {
            if (e.key === 'Backspace' || e.key === 'Delete') {
                square.innerHTML = '';
                updateBoard(square, storedValue);
                storedValue = '';
            }
        };
        square.onblur = () => {
            square.contentEditable = false;

            let squares = Array.from(document.getElementsByClassName('square')).filter(s => s.classList.contains('inner'));
            squares = transformSquaresToBoard(squares);

            let index = [];

            for (let i = 0; i < 9; i++) {
                for (let j = 0; j < 9; j++) {
                    if (squares[i][j] === square) {
                        index = [i, j];
                    }

                }
            }

            if (preventImpossibleValues) {
                if (board[index[0]][index[1]] === 0) {
                    square.innerHTML = '';
                    unhighlightSquares();
                }
            }
        };
    }
}

function updateBoard(changeSquare, storedValue) {
    let squares = Array.from(document.getElementsByClassName('square')).filter(s => s.classList.contains('inner'));
    squares = transformSquaresToBoard(squares);

    changedIndex = [];

    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (squares[i][j] === changeSquare) {
                changedIndex = [i, j];
            }

        }
    }

    unhighlightSquares();

    let value = parseInt(changeSquare.innerHTML);
    if (value === null || isNaN(value) || value < 0 || value > 9) value = 0;
    if (storedValue === '') storedValue = 0;

    if (value === storedValue) return;

    if (highlightImpossibleValues && value !== 0 && !checkIfPossible(changeSquare.innerHTML, squares, changedIndex[0], changedIndex[1])) {
        if (preventImpossibleValues) {
            return;
        }
    }

    if (ws.readyState === 1) {

        board[changedIndex[0]][changedIndex[1]] = value;
        ws.send(JSON.stringify({ type: 'move', index: changedIndex, value: value }));

        checkWon();

        console.log("Sent move");
    }
    else {
        alert('Websocket not ready');
    }
}

function checkWon() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (board[i][j] === 0) return;
        }
    }

    alert('You won!');
}

function checkIfPossible(value, board, row, col) {
    console.log(value, board, row, col);

    let possible = true;
    for (let i = 0; i < 9; i++) {
        if (board[row][i].innerHTML === value) {
            if (i != col) {
                console.log(row, i);
                highlightSquare(row, i);
                possible = false;
            }
        }
        if (board[i][col].innerHTML === value) {
            if (i != row) {
                console.log(i, col);
                highlightSquare(i, col);
                possible = false;
            }
        }
    }

    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;

    for (let i = startRow; i < startRow + 3; i++) {
        for (let j = startCol; j < startCol + 3; j++) {
            if (board[i][j].innerHTML === value) {
                if (i != row && j != col) {
                    console.log(i, j);
                    highlightSquare(i, j);
                    possible = false;
                }
            }
        }
    }

    return possible;

}

function highlightSquare(row, col, color) {
    let squares = Array.from(document.getElementsByClassName('square')).filter(s => s.classList.contains('inner'));
    squares = transformSquaresToBoard(squares);

    squares[row][col].style.backgroundColor = "rgb(255 200 200)";

    highlightedSquares.push(squares[row][col]);
}

function unhighlightSquares() {
    highlightedSquares.forEach(square => {
        square.style.backgroundColor = '';
    });
    highlightedSquares = [];
}

function renderBoard(board, originalBoard) {
    let squares = Array.from(document.getElementsByClassName('square')).filter(s => s.classList.contains('inner'));

    squares = transformSquaresToBoard(squares);

    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const square = squares[i][j];
            square.innerHTML = board[i][j] === 0 ? '' : board[i][j];
            square.classList.remove('set');
            square.classList.remove('playable');

            if (originalBoard[i][j] !== 0) {
                square.classList.add('original');
            }
            else {
                square.classList.add('playable');
                square.onclick = () => squareClick(square);
            }

        }
    }
}