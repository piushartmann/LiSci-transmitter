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
    if (!board) return;
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
    return board;
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

function get_game_states(board) {
    let game_states = [];
    for (var i=0; i<9; i++) {
        game_states.push(board[i][STATUS_INDEX]);
    }
    return game_states;
}

function check_game_state(game, turn) {
    for (const pattern of winning_idecies_table) {
        const [n1, n2, n3] = pattern;
        if (game[n1] === turn && game[n2] === turn && game[n3] === turn) {
            return turn;
        }
    }

    if (!game.slice(0,9).includes(STATUS_ONGOING)) {
        return STATUS_DRAW;
    }
    return STATUS_ONGOING;
}

function check_board_state(board) {
    let game_states = get_game_states(board);

    let state = check_game_state(game_states, -board[TURN_INDEX]);
    return state;
}

function do_square_selection(board, index) {
    const current_game = board[NEXT_GAME_INDEX];
    const turn = board[TURN_INDEX];

    if (!board) return;
    if (index === undefined || index === null) return;
    if (current_game === undefined || current_game === null || !board[current_game]) return;

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

    return board;
}

function evaluation_of_pairs(game) {
    let value = 0;

    for (const pattern of winning_idecies_table) {
        const [n1, n2, n3] = pattern;
        if (game[n1] === 0 && game[n2] === 1 && game[n3] === 1) {
            value++
        } else if (game[n1] === 1 && game[n2] === 0 && game[n3] === 1) {
            value++
        } else if (game[n1] === 1 && game[n2] === 1 && game[n3] === 0) {
            value++
        } else if (game[n1] === 0 && game[n2] === -1 && game[n3] === -1) {
            value--
        } else if (game[n1] === -1 && game[n2] === 0 && game[n3] === -1) {
            value--
        } else if (game[n1] === -1 && game[n2] === -1 && game[n3] === 0) {
            value--
        }
    }

    return value;
}

function evaluate_board(board) {
    let value = 0;

    let game_states = get_game_states(board);

    for (const state of game_states) {
        if (state !== 2) {
            value+= state * MAX_EVAL / 10;
        }
    }

    value+= evaluation_of_pairs(game_states)*5;

    for (var i=0; i<9; i++) {
        value+= evaluation_of_pairs(board[i]);
    }

    return value;
}

function find_best_move(board, depth=STD_DEPTH, alpha=-MAX_EVAL-1, beta=MAX_EVAL+1) {

    if (!board) return;

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
    possibilities.every(index => {
        let new_board = board.map(innerArray => {
            if (innerArray.constructor === Array) {
                return innerArray.slice();
            }
            return innerArray;
            
        });

        let evaluation;
        if (is_board_level) {
            do_game_selection(new_board, index);
            evaluation = find_best_move(new_board, depth, alpha, beta)[0];
        } else {
            do_square_selection(new_board, index);
            evaluation = find_best_move(new_board, depth-1, alpha, beta)[0];
        }

        // Maximize for X
        if (turn == TURN_X) {
            if (evaluation > best_eval) {
                best_eval = evaluation;
                move = index;
            }
            alpha = Math.max(alpha, best_eval);
        }
        // Minimize for O
        else if (turn == TURN_O) {
            if (evaluation < best_eval) {
                best_eval = evaluation;
                move = index;
            }
            beta = Math.min(beta, best_eval);
        }

        return !(beta <= alpha); // prune: no need to evaluate further possibilities
    });

    return [best_eval, move, is_board_level];
}

function get_best_move(board, depth=STD_DEPTH) {
    if (!board) return;
    const [_, move, is_board_level] = find_best_move(board, depth);
    let new_board = board.map(innerArray => {
        if (innerArray.constructor === Array) {
            return innerArray.slice();
        }
        return innerArray;
    });

    if (is_board_level) {
        new_board = do_game_selection(new_board, move);
        new_board = do_square_selection(new_board, move) || board;
    } else {
        new_board = do_square_selection(new_board, move);
    }

    return new_board;
}

module.exports = {
    generate_empty_board,
    get_best_move,
    is_board_expecting_game_selection,
    game_selection_possibilities,
    do_game_selection,
    square_selection_possibilities,
    do_square_selection,
    NEXT_GAME_INDEX,
    TURN_INDEX,
    STATUS_INDEX,
};