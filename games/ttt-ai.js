const TURN_X = 1;
const TURN_O = -1;

const STATUS_INDEX = 9;
const TURN_INDEX = 10;
const NEXT_GAME_INDEX = 11;

const STATUS_ONGOING = 0;
const STATUS_OWON = -1;
const STATUS_XWON = 1;
const STATUS_DRAW = 2;

const winning_idecies_table = [
    // Rows
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],

    // Columns
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],

    // Diagonals
    [0, 4, 8],
    [2, 4, 6]
]

function generate_empty_board() {
    let board = [];

    for (var i = 0; i < 9; i++) {
        board.push([0, 0, 0, 0, 0, 0, 0, 0, 0, STATUS_ONGOING])
    }

    board.push(STATUS_ONGOING);
    board.push(TURN_X);
    board.push(-1)

    return board;
}

function is_board_expecting_game_selection(board) {
    return board[NEXT_GAME_INDEX] == -1;
}

function game_selection_possibilities(board) {
    let possibilities = [];
    board.forEach((game, index) => {
        if (game[STATUS_INDEX] === STATUS_ONGOING) {
            possibilities.push(index);
        }
    });
    return possibilities;
}

function do_game_selection(board, index) {
    board[NEXT_GAME_INDEX] = index;

    return board;
}

function square_selection_possibilities(board) {
    next_game = board[NEXT_GAME_INDEX];
    let possibilities = [];

    board[next_game].forEach((square, index) => {
        if (square === 0) {
            possibilities.push(index);
        }
    });
    return possibilities;
}

function check_game_state(game, turn) {
    let has_won = 0;
    winning_idecies_table.forEach(pattern => {
        let n1 = pattern[0];
        let n2 = pattern[1];
        let n3 = pattern[2];
        if (game[n1] === game[n2] && game[n1] === game[n3] && game[n1] === turn) {
            has_won = turn;
            return;
        }
    });
    if (has_won !== 0) {
        return has_won;
    }

    if (!game.includes(STATUS_ONGOING)) {
        return STATUS_DRAW;
    }
    return STATUS_ONGOING;
}

function check_board_state(board) {
    let game_statuses = [];
    for (var i = 0; i < 9; i++) {
        game_statuses.push(board[i][STATUS_INDEX]);
    }

    return check_game_state(game_statuses, board[TURN_INDEX]);
}

function do_square_selection(board, index) {
    current_game = board[NEXT_GAME_INDEX];
    turn = board[TURN_INDEX];

    board[current_game][index] = turn;

    board[TURN_INDEX] = -turn;

    if (board[index][STATUS_INDEX] !== STATUS_ONGOING) {
        board[NEXT_GAME_INDEX] = -1;
    } else {
        board[NEXT_GAME_INDEX] = index;
    }

    let board_state = STATUS_ONGOING;
    let game_state = check_game_state(board[current_game], turn);

    if (game_state !== STATUS_ONGOING) {
        board[current_game][STATUS_INDEX] = game_state;

        board_state = check_board_state(board);
        board[STATUS_INDEX] = board_state;
    }

    board[TURN_INDEX] = -turn;

    return board;
}

function find_best_move(board) {
    if (is_board_expecting_game_selection(board)) {
        let possibilities = game_selection_possibilities(board);
        let random = possibilities[Math.floor(Math.random() * (possibilities.length - 1))];
        do_game_selection(board, random);
    }

    let possibilities = square_selection_possibilities(board);
    let random = possibilities[Math.floor(Math.random() * (possibilities.length - 1))];
    do_square_selection(board, random);

    return board;
}

module.exports = {
    generate_empty_board,
    is_board_expecting_game_selection,
    game_selection_possibilities,
    do_game_selection,
    square_selection_possibilities,
    do_square_selection,
    find_best_move,
    NEXT_GAME_INDEX,
    TURN_INDEX,
};