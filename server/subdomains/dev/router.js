const { Router } = require('express');
const router = Router();
console.log("Loaded dev router");

module.exports = () => {

    router.get('/', (req, res) => {
        console.log("Dev subdomain hit");
        return res.send("Hello from the dev subdomain!");
    });

    return router;
};