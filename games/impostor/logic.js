const path = require('path');

async function newGame(db, players) {
    const ongoingGame = await db.getGamesFromUsers(players, 'impostor');
    if (ongoingGame[0]) {
        return ongoingGame[0]._id;
    }

    const words = ['Apfel', 'Auto', 'Schule', 'Pizza', 'Buch', 'Haus'];
    const word = words[Math.floor(Math.random() * words.length)];
    const impostor = players[Math.floor(Math.random() * players.length)];
    const gameState = { word, impostor, votes: {} };

    const game = await db.createGame(players, 'impostor', gameState);
    if (!game) {
        return null;
    }

    console.log('Created game: ' + game._id);
    return game._id;
}

async function deleteGame(db, gameID) {
    console.log('Deleting Game ' + gameID);
    await db.deleteGame(gameID);
}

module.exports = {
    newGame,
    deleteGame,
};
