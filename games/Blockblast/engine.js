
const boardSize = 9;
const availableBodiesCount = 3;
const scoreIndex = boardSize;
const availableBodiesIndex = scoreIndex++;

const bodies = [
    [[0,0], [1,0], [2,0], [3,0]], // line v
    [[0,0], [0,1], [0,2], [0,3]], // line h
    [[0,0], [0,1], [0,2], [1,2], [2,2]] // corner bl
];

function getRandomBodies(count) {
    max = bodies.length()
    var arr = Array.from(Array(count), () => Math.floor(Math.random() * max));
    return arr
}

function emptyBoard() {
    var arr = Array.from(Array(boardSize), () => Array(boardSize).fill(0));
    arr.push(0); // score
    arr.push(getRandomBodies(availableBodiesCount)); // bodies
    return arr;
}

// ------------ Placing ------------ *

function doesBodyFit(board, body, position) {
    for (var i=0; i<boardSize;i++) {
        var tile = board[i];
        tilePos = [tile[0]+position[0], tile[1]+position[1]];

        if (tilePos[0] >= boardSize || tilePos[1] >= boardSize) {
        return false;
        }
        if (board[tilePos[1]][tilePos[0]] != 0) {
        return false;
        }
    }
    return true;
}

function getBody(index) {
    if (index < 0 || index >= availableBodiesCount) {
        return false;
    }
    if (board[availableBodiesIndex][availableBodyIndex] == -1) {
        return false;
    }
    var bodyIndex = board[availableBodiesIndex][availableBodyIndex];
    var body = bodies[bodyIndex];
    return body;
}

function placeBody(board, body, position) {
    body.forEach((tile) => {
      tilePos = [tile[0]+position[0], tile[1]+position[1]];
      board[tilePos[1]][tilePos[0]] = 1;
    });
}

function removeBodyListing(index) {
    var board[availableBodiesIndex][index] = -1;
    for (var i=0; i<availableBodiesCount; i++) {
        if (board[availableBodiesIndex][i] != -1) {
            return;
        }
    }
    board[availableBodiesIndex] = getRandomBodies(availableBodiesCount);
}

// ------------ Clearing ------------ *

function checkRowAndColumn(board, index) {
    var result = [1,1];
    for (var j=0; j<boardSize; j++) {
        if (board[index][j] == 0) {
            result[0] = 0;
        }
        if (board[j][index] == 0) {
            result[1] = 0;
        }
    }
    return result;
}

function doClears(board, clears) {
    var count = 0;
    for (var i=0;i<boardSize;i++) {
        if (clears[i][0]) {
            count++;
            for (var j=0; j<boardSize; j++) {
                board[i][j] = 0;
            }
        }
        if (clears[i][1]) {
            count++;
            for (var j=0; j<boardSize; j++) {
                board[j][i] = 0;
            }
        }
    }
    return count;
}

function calcScore(count) {
    return count * 5;
}

function checkClears(board) {
    var clears = Array.from(Array(boardSize), (_, i) => {
        return checkRowAndColumn(board, i);
    });

    console.log(clears);

    var count = doClears(board, clears);
    var score = calcScore(count);
    return score;
}

// ------------ Game logic ------------ 

function doMove(board, availableBodyIndex, position) {
    var body = getBody(availableBodyIndex);
    if (!body) {
        return false;
    }

    if (!doesBodyFit(board, body, position)) {
        return false;
    }

    placeBody(board, body, position);
    removeBodyListing(availableBodyIndex);

    score = checkClears(board);
    board[scoreIndex]+= score;

    return true;
}

module.exports = {
    emptyBoard,
    doesBodyFit,
    doMove,
    scoreIndex,
    availableBodiesIndex,
}

