const express = require('express');
const MongoConnector = require('./MongoConnector').MongoConnector;

const app = express();
app.use(express.json());
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

const port = 8080;
connectionString = process.env.DATABASE_URL || "mongodb://localhost:27017";

const session = require('express-session')
const MongoDBStore = require('connect-mongodb-session')(session);
const store = new MongoDBStore({
    uri: connectionString,
    collection: 'sessions'
});
app.use(session({
    secret: 'transmitter-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true },
    store: store
}));

const db = new MongoConnector("transmitter", connectionString);

app.get('/', (req, res) => {
    req.session.views = (req.session.views || 0) + 1;
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});