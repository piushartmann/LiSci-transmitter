const { Router } = require('express');
const router = Router();

module.exports = () => {

    router.get('/', (req, res) => {
        res.send('Hello from dev subdomain!');
    });

    router.ws('/', (ws, req) => {
        ws.on('message', msg => {
            console.log(`Received message: ${msg}`);
            ws.send(msg);
        });
    });

    return router;
};