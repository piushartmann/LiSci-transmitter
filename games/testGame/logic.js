const path = require('path');

module.exports = {
    newGame: async function newGame(db, players) {
        const ongoingGame = await db.getGamesFromUsers(players);
        if (ongoingGame[0]) {
            return ongoingGame[0]._id;
        }

        const board = []
        const game = await db.createGame(players, 'testGame', board);
        if (!game) {
            return null;
        }

        console.log("Created game: " + game._id)

        return game._id;
    },

    deleteGame: async function deleteGame(db, gameID) {

        console.log("Deleting Game " + gameID)
        await db.deleteGame(gameID);
    }
}