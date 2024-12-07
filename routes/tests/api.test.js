const request = require('supertest');
const express = require('express');
const apiRouter = require('../api');
const { MongoConnector } = require('../../server/MongoConnector');
const webpush = require('web-push');

jest.mock('../../server/MongoConnector');
jest.mock('web-push');

const app = express();
app.use(express.json());
const mockDB = new MongoConnector();
app.use('/api', apiRouter(mockDB, {}, webpush));

describe('API Routes - valid Key', () => {
    beforeEach(() => {
        mockDB.getUserByAPIKey.mockResolvedValue({ _id: "user-id", username: 'testuser', permissions: ['apiAccess', 'canPost'] });
    });

    test('GET /api/checkKey', async () => {
        const response = await request(app).get('/api/checkKey').set('x-api-key', 'valid-key');
        expect(response.status).toBe(200);
        expect(response.text).toBe('Valid testuser');
    });

    test('POST /api/getPosts', async () => {
        mockDB.getPosts.mockResolvedValue({ posts: [{ userID: { username: 'user1' }, title: 'Post 1', sections: [], mediaPath: '', type: '', likes: [] }] });
        const response = await request(app).post('/api/getPosts').set('x-api-key', 'valid-key').send({ filter: {} });
        expect(response.status).toBe(200);
        expect(response.body).toEqual([{ user: 'user1', title: 'Post 1', sections: [], mediaPath: '', type: '', likes: 0, liked: false }]);
    });

    test('GET /api/getPostPages', async () => {
        mockDB.getPostNumber.mockResolvedValue(10);
        const response = await request(app).get('/api/getPostPages').set('x-api-key', 'valid-key').query({ filter: 'all' });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ pages: 1 });
    });

    test('POST /api/createPost', async () => {
        mockDB.createPost.mockResolvedValue({});
        const response = await request(app).post('/api/createPost').set('x-api-key', 'valid-key').send({ title: 'New Post', content: 'Content', type: 'text', postPermissions: [], mediaPath: '' });
        expect(response.status).toBe(200);
        expect(response.text).toBe('Success');
    });

    test('GET /api/getMostRecentPost', async () => {
        mockDB.getPosts.mockResolvedValue({posts: [{ userID: { username: 'user1' }, title: 'Post 1', sections: [], mediaPath: '', type: '', likes: [] }]});
        const response = await request(app).get('/api/getMostRecentPost').set('x-api-key', 'valid-key');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ user: 'user1', title: 'Post 1', sections: [], mediaPath: '', type: '', likes: 0, liked: false });
    })

    test('GET /api/getMostRecentCitation', async () => {
        mockDB.getCitations.mockResolvedValue({citations: [{citation: 'citation'}]});
        const response = await request(app).get('/api/getMostRecentCitation').set('x-api-key', 'valid-key');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({citation: 'citation'});
    });
});

describe('API Routes - invalid Key', () => {
    beforeEach(() => {
        mockDB.getUserByAPIKey.mockResolvedValue(null);
    });

    test('GET /api/checkKey', async () => {
        const response = await request(app).get('/api/checkKey').set('x-api-key', 'invalid-key');
        expect(response.status).toBe(200);
        expect(response.text).toBe('Invalid');
    });

    test('POST /api/getPosts - invalid key', async () => {
        const response = await request(app).post('/api/getPosts').set('x-api-key', 'invalid-key').send({ filter: {} });
        expect(response.status).toBe(401);
        expect(response.text).toBe('Invalid API key or insufficient permissions');
    });

    test('GET /api/getPostPages - invalid key', async () => {
        const response = await request(app).get('/api/getPostPages').set('x-api-key', 'invalid-key').query({ filter: 'all' });
        expect(response.status).toBe(401);
        expect(response.text).toBe('Invalid API key or insufficient permissions');
    });

    test('POST /api/createPost - invalid key', async () => {
        const response = await request(app).post('/api/createPost').set('x-api-key', 'invalid-key').send({ title: 'New Post', content: 'Content', type: 'text', postPermissions: [], mediaPath: '' });
        expect(response.status).toBe(401);
        expect(response.text).toBe('Invalid API key or insufficient permissions');
    });

    test('POST /api/createPost - insufficient permissions', async () => {
        mockDB.getUserByAPIKey.mockResolvedValue({ _id: 'user-id', permissions: ['apiAccess'] });
        const response = await request(app).post('/api/createPost').set('x-api-key', 'valid-key').send({ title: 'New Post', content: 'Content', type: 'text', postPermissions: [], mediaPath: '' });
        expect(response.status).toBe(403);
        expect(response.text).toBe('You cannot create a post');
    });

    // Add more tests for other routes as needed
});