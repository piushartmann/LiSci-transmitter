const { Router } = require('express');
const router = Router();

module.exports = () => {

    router.get('/', (req, res) => {
        res.send("Hello from the dev subdomain!");
    });

    return router;
};