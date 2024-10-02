const express = require('express');
const session = require('express-session')
const path = require('path');
const MongoDBStore = require('connect-mongo')

const MongoConnector = require('./MongoConnector').MongoConnector;

connectionString = process.env.DATABASE_URL || "mongodb://localhost:27017";
const port = 8080;

//create express app
const app = express();
app.use(express.json());
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

//use db to store session
app.use(session({
    secret: 'transmitter secret',
    httpOnly: true,
    secure: true,
    maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
    resave: false,
    saveUninitialized: true,
    store: MongoDBStore.create({
        mongoUrl: connectionString,
        dbName: 'transmitter',
        collectionName: 'sessions'
    })
}));

//connect to db
const db = new MongoConnector("transmitter", connectionString);

//use routes
app.use('/', require('./routes')(db));

//start server
app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});