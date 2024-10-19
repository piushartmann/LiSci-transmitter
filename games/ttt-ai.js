const TURN_X = 1;
const TURN_O = -1;

const STATUS_INDEX = 9;
const TURN_INDEX = 10;
const NEXT_GAME_INDEX = 11;

const STATUS_ONGOING = 0;
const STATUS_OWON = -1;
const STATUS_XWON = 1;
const STATUS_DRAW = 2;

const STD_DEPTH = 5
const MAX_EVAL = 10;

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
    
    for (var i=0; i<9; i++) {
        board.push([0,0,0,0,0,0,0,0,0,STATUS_ONGOING])
    }

    board[STATUS_INDEX] = STATUS_ONGOING;
    board[TURN_INDEX] = TURN_X;
    board[NEXT_GAME_INDEX] = -1;

    return board;
}

function is_board_expecting_game_selection(board) {
    return board[NEXT_GAME_INDEX] == -1;
}

function game_selection_possibilities(board) {
    let possibilities = [];
    for (var i=0; i<9; i++) {
        if (board[i][STATUS_INDEX] === STATUS_ONGOING) {
            possibilities.push(i);
        }
    }
    return possibilities;
}

function do_game_selection(board, index) {
    board[NEXT_GAME_INDEX] = index;
}

function square_selection_possibilities(board) {
    next_game = board[NEXT_GAME_INDEX];
    let possibilities = [];

    for (var i=0; i<9; i++) {
        if (board[next_game][i] === 0) {
            possibilities.push(i);
        }
    }
    return possibilities;
}

function check_game_state(game, turn) {
    let has_won = 0;
    winning_idecies_table.every(pattern => {
        let n1 = pattern[0];
        let n2 = pattern[1];
        let n3 = pattern[2];
        if ((game[n1] === game[n2]) && (game[n1] === game[n3]) && (game[n1] === turn)) {
            has_won = turn;
            return false;
        }
        return true;
    });
    if (has_won !== 0) {
        return has_won;
    }

    if (!game.slice(0,9).includes(STATUS_ONGOING)) {
        return STATUS_DRAW;
    }
    return STATUS_ONGOING;
}

function check_board_state(board) {
    let game_statuses = [];
    for (var i=0; i<9; i++) {
        game_statuses.push(board[i][STATUS_INDEX]);
    }

    let state = check_game_state(game_statuses, -board[TURN_INDEX]);
    return state;
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
}

function evaluate_board(board) {
    let value = 0;

    for (var i=0; i<9; i++) {
        if (board[i][STATUS_INDEX] !== 2) {
            value+= board[i][STATUS_INDEX]
        }
    }

    return value;
}

function find_best_move(board, depth=STD_DEPTH) {

    if (board[STATUS_INDEX] === STATUS_DRAW) {
        return [0];
    } else if (board[STATUS_INDEX] !== STATUS_ONGOING) {
        return [board[STATUS_INDEX] * MAX_EVAL];
    }

    if (depth <= 0) {
        return [evaluate_board(board)];
    }

    let possibilities;
    let is_board_level;
    if (is_board_expecting_game_selection(board)) {
        is_board_level = true;
        possibilities = game_selection_possibilities(board);
    } else {
        is_board_level = false;
        possibilities = square_selection_possibilities(board);
    }

    let turn = board[TURN_INDEX];

    let best_eval = -turn*(MAX_EVAL+1);
    let move = -1;
    possibilities.forEach(index => {
        let new_board = board.map(innerArray => {
            if (innerArray.constructor === Array) {
                return innerArray.slice();
            }
            return innerArray;
            
        });

        if (is_board_level) {
            do_game_selection(new_board, index);
        } else {
            do_square_selection(new_board, index);
        }
        evaluation = find_best_move(new_board, depth-1)[0];

        if (turn == TURN_X && evaluation > best_eval) {
            move = index;
            best_eval = evaluation;
        } else if (turn == TURN_O && evaluation < best_eval) {
            move = index;
            best_eval = evaluation;
        }
    });

    return [best_eval, move, is_board_level];
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