const express = require('express');
const expressSession = require('express-session');
const request = require('supertest');
const { MongoConnector } = require('../../server/MongoConnector');
const { renderView } = require('../helper');

jest.mock('../../server/MongoConnector');

const mockRenderView = jest.fn();

jest.mock('../helper', () => {
    return () => {
        return { renderView: mockRenderView }
    };
});

const base = require('../base');
const mockDB = new MongoConnector();

const mockBase = base(mockDB);

const app = express();
app.use(express.json());
app.use(expressSession({ secret: 'test', resave: false, saveUninitialized: true }));

async function requestEndpoint(endpoint, timeout = 500) {
    try {
        await request(app).get(endpoint).timeout(timeout);
    } catch (error) {
        if (error.timeout) {

        } else {
            throw error;
        }
    }
}

test('test renderView function', async () => {
    mockDB.getUserPermissions.mockResolvedValue(['admin', 'classmate']);
    mockDB.getPreferences.mockResolvedValue([]);
    mockDB.getPreference.mockResolvedValue('profilePic.png');

    const renderFunction = jest.fn();
    let req = { session: { username: 'testUser', userID: 'testUserID' }, headers: { "x-forwarded-for": "0.0.0.0" } };
    let res = { locals: { additionalPrefetches: [] }, render: renderFunction };
    const { renderView } = jest.requireActual('../helper')(mockDB);
    await renderView(req, res, "testView", { test: "testData" }, ["testPrefetch"]);

    expect(renderFunction).toHaveBeenCalledWith('testView', {
        isInSchool: false,
        loggedIn: true,
        username: 'testUser',
        usertype: ['admin', 'classmate'],
        profilePic: 'profilePic.png',
        version: process.env.VERSION,
        prefetches: ['testPrefetch'],
        preferences: [],
        test: "testData"
    });
});

describe('base endpoints - not logged in', () => {

    beforeEach(() => {
        mockDB.getUserPermissions.mockResolvedValue([]);
        mockDB.getPreferences.mockResolvedValue([]);
        mockDB.getPreference.mockResolvedValue('profilePic.png');
        mockDB.getPostNumber.mockResolvedValue(10);
        mockDB.getNewsNumber.mockResolvedValue(10);
        mockDB.getUserData.mockResolvedValue("apiKey");

        app.use('/', mockBase);
    });

    test('test / route', async () => {
        await requestEndpoint("/")
        expect(mockRenderView).toHaveBeenCalledWith(
            expect.any(Object),
            expect.any(Object),
            'landing'
        )
    });

    test('test /create route', async () => {
        await requestEndpoint("/create")
        expect(mockRenderView).toHaveBeenCalledWith(
            expect.any(Object),
            expect.any(Object),
            'notLoggedIn'
        )
    });

    test('test /edit/:postID route', async () => {
        await requestEndpoint("/edit/123")
        expect(mockRenderView).toHaveBeenCalledWith(
            expect.any(Object),
            expect.any(Object),
            'notLoggedIn'
        )
    });

    test('test /citations route', async () => {
        await requestEndpoint("/citations")
        expect(mockRenderView).toHaveBeenCalledWith(
            expect.any(Object),
            expect.any(Object),
            'notLoggedIn'
        )
    });

    test('test /settings route', async () => {
        await requestEndpoint("/settings")
        expect(mockRenderView).toHaveBeenCalledWith(
            expect.any(Object),
            expect.any(Object),
            'notLoggedIn'
        )
    });

    test('test /about route', async () => {
        await requestEndpoint("/about")
        expect(mockRenderView).toHaveBeenCalledWith(
            expect.any(Object),
            expect.any(Object),
            'about'
        )
    });
});