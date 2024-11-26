const express = require('express');
const path = require('path');
const expressWs = require('express-ws');
const app = express();
expressWs(app);

const port = 3000;
const subdomain = 'dev';
const routerModule = require(path.join(__dirname, subdomain, 'router.js'));
const router = routerModule();
app.use("/", router);

app.listen(port, () => {
    console.log(`Testing "${subdomain}" on port ${port}`);
});