const express = require('express');
const expressSession = require('express-session');
const path = require('path');
const fs = require('fs');
const { MongoConnector } = require('../../server/MongoConnector');
const { MongoMemoryServer } = require('mongodb-memory-server');
const helperModule = require('../helper')
const mockApp = express();
const ws = require('express-ws')(mockApp);
const request = require('supertest');
const bodyParser = require('body-parser');

let mongoServer;
let db;

let testUser;

beforeAll(async () => {
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

    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    db = new MongoConnector('testdb', uri);
    await db.connectPromise;

    let push;
    let s3Client;
    let gameConfig = [];
    //use routes
    mockApp.use('/', require('../base')(db));
    mockApp.use('/games', require('../games')(db, s3Client, push, gameConfig));
    mockApp.use('/internal', require('../internal')(db, s3Client, push));
    mockApp.use('/api', require('../api')(db, s3Client, push));

    testUser = await db.createUser("test", "test", ["classmate", "admin"]);
});

afterAll(async () => {
    await mongoServer.stop();
});

describe('Base Server Functions', () => {

    it('should start the server', async () => {
        expect(mockApp).toBeDefined();
    });

    it('should be possible to login', async () => {
        const spy = jest.spyOn(db, 'checkLogin');
        spy.mockResolvedValue({ username: 'test', _id: 0, preferences: [] });
        await request(mockApp)
            .post('/internal/login')
            .send({ username: 'test', password: 'test' })
            .expect(200);
    });
});

describe('Base Endpoints - logged in', () => {

    let agent;
    let newPost;

    beforeAll(async () => {

        agent = request.agent(mockApp);
        await agent
            .post('/internal/login')
            .send({ username: 'test', password: 'test' })
            .expect(200);

        newPost = await db.createPost(testUser._id, "title", [{ type: "text", content: "test" }], "classmatesonly", "post")
        newCitation = await db.createCitation(testUser._id, "author", "content");
    });

    it('should return the home page', async () => {
        await agent
            .get('/')
            .expect(res => {
                expect([200, 302]).toContain(res.status);
            });
    });

    it('should return the citations page', async () => {
        await agent
            .get('/citations')
            .expect(res => {
                expect([200, 302]).toContain(res.status);
            });
    });

    it('should return the create page', async () => {
        await agent
            .get('/create')
            .expect(res => {
                expect([200, 302]).toContain(res.status);
            });
    }, 10000);

    it('should return the edit page', async () => {

        await agent
            .get(`/edit/${newPost._id}`)
            .expect(res => {
                expect([200, 302]).toContain(res.status);
            });
    });

    it('should return the games page', async () => {
        await agent
            .get('/games')
            .expect(res => {
                expect([200, 302]).toContain(res.status);
            });
    });

    it('should return the about page', async () => {
        await agent
            .get('/about')
            .expect(res => {
                expect([200, 302]).toContain(res.status);
            });
    });

    describe('games endpoints', () => {
        
    });
});