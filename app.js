const express = require('express');
const session = require('express-session')
const path = require('path');
const fs = require('fs');
const MongoDBStore = require('connect-mongo')
const { S3Client } = require("@aws-sdk/client-s3");
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const webpush = require('web-push')
const app = express();
const ws = require('express-ws')(app);

const oneDay = 24 * 3600 * 1000

const MongoConnector = require('./MongoConnector').MongoConnector;

connectionString = process.env.DATABASE_URL || "mongodb://localhost:27017";
const port = 8080;

const gamesDirectory = path.join(__dirname, "games")

let gameConfig = [];

const files = fs.readdirSync(gamesDirectory);
files.forEach(function (file, index) {
    const fileDir = path.join(gamesDirectory, file);
    const stat = fs.statSync(fileDir);

    if (stat.isDirectory()) {
        const innerFiles = fs.readdirSync(fileDir);
        innerFiles.forEach(function (innerFile, innerIndex) {
            if (innerFile === "manifest.json") {
                const manifest = JSON.parse(fs.readFileSync(path.join(fileDir, innerFile)));
                //console.log(manifest);
                if (!(manifest.enabled==false)) {
                    gameConfig.push(manifest);
                }
            }
        });
    }
});

gameConfig.sort((a, b) => a.priority - b.priority)
gameConfig.reverse()

console.log(gameConfig);

//create express app
app.set('view engine', 'ejs')

app.use(function (req, res, next) {
    let views = [path.join(__dirname, 'views'), path.join(__dirname, 'views', 'partials')]
    gameConfig.forEach(config => {
        if (req.path.includes(config.url)) views.push(path.join(__dirname, 'games', config.url, (config.views || 'views')));
    })
    console.log(views)
    app.set('views', views);
    next()
})

app.use(express.static(path.join(__dirname, 'public')));

gameConfig.forEach(config => {
    app.use("/"+config.url, express.static(path.join(__dirname, 'games', config.url, (config.public || 'public'))));
})

app.use(bodyParser.json());
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

//connect to storage bucket
const s3Client = new S3Client({
    region: "fra1",
    endpoint: "https://fra1.digitaloceanspaces.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: false,
});

//set up webpush
webpush.setVapidDetails(
    'mailto:pius.hartmann@gmx.de',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

//connect to db
const db = new MongoConnector("transmitter", connectionString);

//use routes
app.use('/', require('./routes/base')(db));
app.use('/games', require('./routes/games')(db, s3Client, webpush, gameConfig));
app.use('/internal', require('./routes/internal')(db, s3Client, webpush));
app.use('/api', require('./routes/api')(db, s3Client, webpush));

app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});
