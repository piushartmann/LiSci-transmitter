const express = require('express');
const expressSession = require('express-session');
const request = require('supertest');
const { MongoConnector } = require('../../server/MongoConnector');

jest.mock('../../server/MongoConnector');

const mockRender = jest.fn();

const base = require('../base');
const mockDB = new MongoConnector();

const mockBase = base(mockDB);

const app = express();
app.use(express.json());
app.use(expressSession({ secret: 'test', resave: false, saveUninitialized: true }));

app.set('view engine', 'ejs');

app.use(
    function (req, res, next) {
        res.render = function(view, locals) {
            mockRender(view);
        };
        next();
    }
)

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
        expect(mockRender).toHaveBeenCalledWith(
            'landing'
        )
    });

    test('test /create route', async () => {
        await requestEndpoint("/create")
        expect(mockRender).toHaveBeenCalledWith(
            'notLoggedIn'
        )
    });

    test('test /edit/:postID route', async () => {
        await requestEndpoint("/edit/123")
        expect(mockRender).toHaveBeenCalledWith(
            'notLoggedIn'
        )
    });

    test('test /citations route', async () => {
        await requestEndpoint("/citations")
        expect(mockRender).toHaveBeenCalledWith(
            'notLoggedIn'
        )
    });

    test('test /settings route', async () => {
        await requestEndpoint("/settings")
        expect(mockRender).toHaveBeenCalledWith(
            'notLoggedIn'
        )
    });

    test('test /about route', async () => {
        await requestEndpoint("/about")
        expect(mockRender).toHaveBeenCalledWith(
            'about'
        )
    });
});