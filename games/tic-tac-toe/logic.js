const tttAI = require('./engine.js');
const path = require('path');

async function newGame(db, players) {
    const ongoingGame = await db.getGamesFromUsers(players, "tic-tac-toe");
    if (ongoingGame[0]) {
        return ongoingGame[0]._id;
    }

    const board = tttAI.generate_empty_board();
    const game = await db.createGame(players, 'tic-tac-toe', board);
    if (!game) {
        return null;
    }

    console.log("Created game: " + game._id)

    return game._id;
}

async function deleteGame(db, gameID) {

    console.log("Deleting Game " + gameID)
    await db.deleteGame(gameID);
}

module.exports = {
    newGame,
    deleteGame
}