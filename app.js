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
const MongoConnector = require('./server/MongoConnector').MongoConnector;
const rendering = require('./server/rendering');
const subdomains = require('./server/subdomainManager');
const RateLimit = require('express-rate-limit');

//set up subdomains
app.use(subdomains);
dotenv.config({ path: path.join(__dirname, '.env') });

const oneDay = 24 * 3600 * 1000;

let addReloadCallback = () => { };
let version;
let dbname = process.env.DB_NAME || "transmitter";

if (!process.env.NODE_ENV === "production") {
    console.log("Running in dev mode");
    addReloadCallback = require('./dev_browser_reload');
    version = Math.random().toString(36);
} else {
    console.log("Running in production mode");
    try {
        version = require('child_process')
            .execSync('git rev-parse HEAD')
            .toString().trim();
    } catch (error) {
        console.warn('Git not available, using fallback version');
        version = 'production-' + Date.now();
    }
}

//set up environment variables

const connectionString = process.env.DATABASE_URL || "mongodb://localhost:27017";
const port = process.env.PORT;

console.log(`Running version ${version}`);

process.env.VERSION = version;

//set up views
app.set('view engine', 'ejs');
const { gameConfigs, moduleConfigs, publicDirs, views } = require('./server/loadModules');

gameConfigs.concat(moduleConfigs).forEach(config => {
    const dir = config.publicDir;
    app.use("/" + config.url, express.static(dir, {
        setHeaders: function (res, path) {
            res.setHeader("Cache-Control", "public, max-age=86400");
        },
    }));
});

app.set('views', views);

//setup rate limiting
var limiter = RateLimit({
    windowMs: 1000 * 5, // 5 seconds
    max: 200, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

//set up static files
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: function (res, path) {
        res.setHeader("Cache-Control", "public, max-age=86400");
    },
}));

//use body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//use db to store session
app.use(session({
    secret: 'transmitter secret',
    httpOnly: false,
    cookie: {
        maxAge: oneDay * 30,
        sameSite: true,
        secure: false
    },
    secure: true,
    resave: false,
    saveUninitialized: false,
    store: MongoDBStore.create({
        mongoUrl: connectionString,
        dbName: dbname,
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

//setup rickroll
app.get('/fuesse', (req, res) => {
    res.send('<script>window.location.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";</script>');
});

//connect to db
const db = new MongoConnector(dbname, connectionString, webpush);

//store connected users for websocket. This is a global variable and will be kept updated by the websocket route
let connectedUsers = [];

//run all subsequent code after connecting to the database
db.connectPromise.then(() => {
    app.db = db;
    //set up custom renderer
    app.use(rendering(db, views, publicDirs, moduleConfigs));

    console.log("Connected to database");

    //setup websocket
    const { router: wsRouter, functions } = require('./routes/websocket')(db, connectedUsers, gameConfigs, addReloadCallback);
    app.use('/websocket', wsRouter);
    db.ws = functions;

    //use routes
    app.use('/', require('./routes/base')(db));
    app.use('/games', require('./routes/games')(db, gameConfigs, connectedUsers));
    app.use('/internal', require('./routes/internal')(db, s3Client));
    app.use('/api', require('./routes/api')(db, s3Client, db.push));

    moduleConfigs.forEach(config => {
        routerInstance = require(config.router)(db);

        const router = express.Router();

        router.use(async (req, res, next) => {
            if (config.access === "public") return next();
            if (!req.session.userID) return res.redirect("/");
            if (!config.access || config.access.length === 0) return next();
            const permissions = await db.getUserPermissions(req.session.userID);
            const hasPermission = config.access.some(access => permissions.includes(access));
            if (!hasPermission) return res.status(403).render('error', { code: 403, message: "You do not have permission to access this module" });

            next();
        });

        router.use(routerInstance);

        app.use("/" + config.url, router);
    });

    //start server
    app.listen(port, () => {
        console.log(`Server is running on ${port}`);
    });

}).catch((err) => {
    //on error, log and exit
    console.error(err);
    process.exit(1);
});
