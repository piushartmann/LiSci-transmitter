const { Router } = require('express');
const router = Router();


module.exports = (db) => {

    router.get('/', (req, res) => {
        res.send("here will be tic tac toe");
    });

    return router;
}