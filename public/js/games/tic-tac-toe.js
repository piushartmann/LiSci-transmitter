let yourTurn = true;

document.addEventListener('DOMContentLoaded', async () => {
    const squares = Array.from(document.getElementsByClassName('square'));
    squares.forEach(square => {
        square.addEventListener('click', () => {
            if (!yourTurn) {
                return;
            }
            if (square.textContent === '') {
                square.textContent = 'X';

                yourTurn = false;

                fetch('/games/tic-tac-toe/move', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        square: squares.indexOf(square),
                    })
                }).then(async (res) => {
                    if (res.ok) {
                        updateBoard(await res.json());
                    }
                })
            }
        });
    });
});


function updateBoard(board) {
    const square = board.square;
    console.log(board);
    const squares = Array.from(document.getElementsByClassName('square'));
    squares[square].textContent = 'O';
    yourTurn = true;
}