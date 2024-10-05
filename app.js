const express = require('express');
const session = require('express-session')
const path = require('path');
const fs = require('fs');
const MongoDBStore = require('connect-mongo')
const { S3Client } = require("@aws-sdk/client-s3");
bodyParser = require('body-parser');
const dotenv = require('dotenv');

const oneDay = 24 * 3600 * 1000

const MongoConnector = require('./MongoConnector').MongoConnector;

connectionString = process.env.DATABASE_URL || "mongodb://localhost:27017";
const port = 8080;
const pageSize = 10;

//create express app
const app = express();
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false })); 

dotenv.config({ path: path.join(__dirname, '.env') });

//use db to store session
app.use(session({
    secret: 'transmitter secret',
    httpOnly: true,
    cookie: {
        maxAge: oneDay * 30,
        sameSite: true,
        secure: false
    },
    secure: true,
    resave: false,
    saveUninitialized: true,
    store: MongoDBStore.create({
        mongoUrl: connectionString,
        dbName: 'transmitter',
        collectionName: 'sessions'
    })
}));

const s3Client = new S3Client({
    region: "fra1",
    endpoint: "https://fra1.digitaloceanspaces.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: false,
});

//connect to db
const db = new MongoConnector("transmitter", connectionString);

//use routes
app.use('/', require('./routes/base')(db, pageSize));
app.use('/internal', require('./routes/internal')(db, s3Client, pageSize));
app.use('/api', require('./routes/api')(db, s3Client, pageSize));

//start server
app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});