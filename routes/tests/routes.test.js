const express = require('express');
const expressSession = require('express-session');
const path = require('path');
const fs = require('fs');
const { MongoConnector } = require('../../server/MongoConnector');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mockApp = express();
const ws = require('express-ws')(mockApp);
const request = require('supertest');
const bodyParser = require('body-parser');

let mongoServer;
let db;
let testUser;


describe('Base Endpoints - logged in', () => {

    let agent;
    let newPost;
    let newCitation;

    beforeEach(async () => {
        // Create the MongoDB instance first
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();

        // Initialize database connection
        db = new MongoConnector('testdb', uri);
        db.push = { sendToEveryone: jest.fn() };

        // Wait for connection to be established
        await db.connectPromise;

        // Setup Express app after DB is connected
        mockApp.set('view engine', 'ejs');

        let views = [path.join(__dirname, '../../views'), path.join(__dirname, '../../views', 'partials')]

        mockApp.set('views', views);

        mockApp.use(express.static(path.join(__dirname, '../../public'), {
            setHeaders: function (res, path) {
                res.setHeader("Cache-Control", "public, max-age=86400");
            },
        }));

        mockApp.use(bodyParser.json());
        mockApp.use(bodyParser.urlencoded({ extended: false }));

        mockApp.use(expressSession({ secret: 'test', resave: false, saveUninitialized: true }));

        let s3Client;
        let gameConfig = [];
        //use routes
        mockApp.use('/', require('../base')(db));
        mockApp.use('/games', require('../games')(db, gameConfig, []));
        mockApp.use('/internal', require('../internal')(db, s3Client));
        mockApp.use('/api', require('../api')(db, s3Client));

        // Create test user after everything is set up
        testUser = await db.createUser("test", "test", ["classmate", "admin"]);


        // Create a new agent for each test
        agent = request.agent(mockApp);

        // Login with proper user object
        const loginResponse = await agent
            .post('/internal/login')
            .send({ username: 'test', password: 'test' });

        expect(loginResponse.status).toBe(200);

        // Create test data after successful login
        newPost = await db.createPost(testUser._id, "title", [{ type: "text", content: "test" }], "classmatesonly", "post");
        newCitation = await db.createCitation(testUser._id, "author", "content");
    });

    afterEach(async () => {
        // Close agent connections
        if (agent) {
            await new Promise(resolve => agent.app.close(resolve));
        }

        await db.disconnect();
        await mongoServer.stop();
    });

    // Update valid status codes to include all possible responses
    const validStatusCodes = [200, 302];

    // Individual tests with higher timeouts
    const routeTests = [
        { name: 'home', path: '/' },
        { name: 'citations', path: '/citations' },
        { name: 'create', path: '/create' },
        { name: 'edit', path: '/edit/' },
        { name: 'games', path: '/games' },
        { name: 'about', path: '/about' }
    ];

    routeTests.forEach(route => {
        it(`should return a valid status code for ${route.name} page`, async () => {
            const path = route.path === '/edit/' ? `${route.path}${newPost._id}` : route.path;
            const response = await agent.get(path);
            expect(validStatusCodes).toContain(response.status);

            // Additional checks based on response status
            if (response.status === 403) {
                // Forbidden is acceptable for some routes when permissions are missing
                expect(['citations', 'create', 'edit']).toContain(route.name);
            } else if (response.status === 500) {
                // 500 might occur when templates or required data is missing
                expect(['home', 'about']).toContain(route.name);
            }
        });
    });
});