const express = require('express');

const app = express();
const port = 8080;
const MongoConnector = require('./MongoConnector').MongoConnector;

connectionString = process.env.DATABASE_URL || "mongodb://localhost:27017";

const db = new MongoConnector("transmitter", connectionString);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});