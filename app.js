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
const versioning = require('./versioning');

const oneDay = 24 * 3600 * 1000

const MongoConnector = require('./MongoConnector').MongoConnector;

//use dotenv in development environment
dotenv.config({ path: path.join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL || "mongodb://localhost:27017";
const port = 8080;
const gamesDirectory = path.join(__dirname, "games")

const version = require('child_process')
    .execSync('git rev-parse HEAD')
    .toString().trim();

console.log(`Running version ${version}`);

process.env.VERSION = version;

//load game config from manifest files
let gameConfig = [];

const games = fs.readdirSync(gamesDirectory);
games.forEach(function (file) {
    const fileDir = path.join(gamesDirectory, file);
    const stat = fs.statSync(fileDir);

    if (stat.isDirectory()) {
        const gameFiles = fs.readdirSync(fileDir);
        gameFiles.forEach(function (gameFile) {
            if (gameFile === "manifest.json") {
                const manifest = JSON.parse(fs.readFileSync(path.join(fileDir, gameFile)));
                //console.log(manifest);
                if (!(manifest.enabled == false)) {
                    gameConfig.push(manifest);
                }
            }
        });
    }
});

gameConfig.sort((a, b) => a.priority - b.priority)
gameConfig.reverse()

console.log("Loaded games:", gameConfig.map(config => "'" + config.name + "'").join(", "));

//set view engine
app.set('view engine', 'ejs');

//set up versioning
app.use(versioning);

//set up static files
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: function (res, path) {
        res.setHeader("Cache-Control", "public, max-age=86400");
    },
    
}));

let views = [path.join(__dirname, 'views'), path.join(__dirname, 'views', 'partials')]
gameConfig.forEach(config => {
    app.use("/" + config.url, express.static(path.join(__dirname, 'games', config.url, (config.public || 'public'))));
    views.push(path.join(__dirname, 'games', config.url, (config.views || 'views')));
})
app.set('views', views);

//use body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


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
    'mailto:admin@liscitransmitter.live',
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
