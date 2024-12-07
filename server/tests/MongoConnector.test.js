const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoConnector } = require('../MongoConnector');

let mongoServer;
let mongoConnector;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    mongoConnector = new MongoConnector('testdb', uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});


describe('MongoConnector.getPosts', () => {
    let userID;

    beforeEach(async () => {
        await mongoConnector.mongoose.connection.dropDatabase();
        const user = await mongoConnector.createUser('testuser', 'password', ['admin']);
        userID = user._id;
    });

    it('should return posts with correct filters and sorting', async () => {
        const sections = [{ type: 'text', content: 'Test content' }];
        await mongoConnector.createPost(userID, 'Test Post 1', sections, 'classmatesonly', 'post');
        await mongoConnector.createPost(userID, 'Test Post 2', sections, 'Teachersafe', 'news');

        const { posts, totalPosts } = await mongoConnector.getPosts(false, 10, 0, { text: 'Test' });

        expect(totalPosts).toBe(2);
        expect(posts.length).toBe(2);
        expect(posts[0].title).toBe('Test Post 2');
        expect(posts[1].title).toBe('Test Post 1');
    });

    it('should apply teacher filter correctly', async () => {
        const sections = [{ type: 'text', content: 'Test content' }];
        await mongoConnector.createPost(userID, 'Test Post 1', sections, 'classmatesonly', 'post');
        await mongoConnector.createPost(userID, 'Test Post 2', sections, 'Teachersafe', 'news');

        const { posts, totalPosts } = await mongoConnector.getPosts(true, 10, 0);

        expect(totalPosts).toBe(1);
        expect(posts.length).toBe(1);
        expect(posts[0].title).toBe('Test Post 2');
    });

    it('should apply date filters correctly', async () => {
        const sections = [{ type: 'text', content: 'Test content' }];
        const oldDate = new Date('2020-01-01');
        const newDate = new Date();

        await mongoConnector.createPost(userID, 'Old Post', sections, 'classmatesonly', 'post');
        await mongoConnector.Post.updateOne({ title: 'Old Post' }, { $set: { timestamp: oldDate } });
        await mongoConnector.createPost(userID, 'New Post', sections, 'Teachersafe', 'news');

        const { posts, totalPosts } = await mongoConnector.getPosts(false, 10, 0, { fromDate: '2021-01-01' });

        expect(totalPosts).toBe(1);
        expect(posts.length).toBe(1);
        expect(posts[0].title).toBe('New Post');
    });

    it('should apply type filter correctly', async () => {
        const sections = [{ type: 'text', content: 'Test content' }];
        await mongoConnector.createPost(userID, 'Test Post 1', sections, 'classmatesonly', 'post');
        await mongoConnector.createPost(userID, 'Test Post 2', sections, 'Teachersafe', 'news');

        const { posts, totalPosts } = await mongoConnector.getPosts(false, 10, 0, { type: 'news' });

        expect(totalPosts).toBe(1);
        expect(posts.length).toBe(1);
        expect(posts[0].title).toBe('Test Post 2');
    });

    it('should apply limit and offset correctly', async () => {
        const sections = [{ type: 'text', content: 'Test content' }];
        await mongoConnector.createPost(userID, 'Test Post 1', sections, 'classmatesonly', 'post');
        await mongoConnector.createPost(userID, 'Test Post 2', sections, 'Teachersafe', 'news');
        await mongoConnector.createPost(userID, 'Test Post 3', sections, 'Teachersafe', 'news');

        const { posts, totalPosts } = await mongoConnector.getPosts(false, 1, 1);

        expect(totalPosts).toBe(3);
        expect(posts.length).toBe(1);
        expect(posts[0].title).toBe('Test Post 2');
    });
});

describe('MongoConnector.getCitations', () => {
    let userID;

    beforeEach(async () => {
        await mongoConnector.mongoose.connection.dropDatabase();
        const user = await mongoConnector.createUser('testuser', 'password', ['admin']);
        userID = user._id;
    });

    it('should return citations with correct filters and sorting', async () => {
        await mongoConnector.createCitation(userID, 'Author 1', 'Content 1');
        await mongoConnector.createCitation(userID, 'Author 2', 'Content 2');

        const { citations, totalCitations } = await mongoConnector.getCitations(10, 0, { text: 'Content' });

        expect(totalCitations).toBe(2);
        expect(citations.length).toBe(2);
        expect(citations[0].content).toBe('Content 2');
        expect(citations[1].content).toBe('Content 1');
    });

    it('should apply date filters correctly', async () => {
        const oldDate = new Date('2020-01-01');
        const newDate = new Date();

        await mongoConnector.createCitation(userID, 'Author 1', 'Old Content');
        await mongoConnector.Citation.updateOne({ content: 'Old Content' }, { $set: { timestamp: oldDate } });
        await mongoConnector.createCitation(userID, 'Author 2', 'New Content');

        const { citations, totalCitations } = await mongoConnector.getCitations(10, 0, { fromDate: '2021-01-01' });

        expect(totalCitations).toBe(1);
        expect(citations.length).toBe(1);
        expect(citations[0].content).toBe('New Content');
    });

    it('should apply limit and offset correctly', async () => {
        await mongoConnector.createCitation(userID, 'Author 1', 'Content 1');
        await mongoConnector.createCitation(userID, 'Author 2', 'Content 2');
        await mongoConnector.createCitation(userID, 'Author 3', 'Content 3');

        const { citations, totalCitations } = await mongoConnector.getCitations(1, 1);

        expect(totalCitations).toBe(3);
        expect(citations.length).toBe(1);
        expect(citations[0].content).toBe('Content 2');
    });

    it('should apply text filter correctly', async () => {
        await mongoConnector.createCitation(userID, 'Author 1', 'Content 1');
        await mongoConnector.createCitation(userID, 'Author 2', 'Different Content');

        const { citations, totalCitations } = await mongoConnector.getCitations(10, 0, { text: 'Different' });

        expect(totalCitations).toBe(1);
        expect(citations.length).toBe(1);
        expect(citations[0].content).toBe('Different Content');
    });

    it('should apply sort order correctly', async () => {
        await mongoConnector.createCitation(userID, 'Author 1', 'Content 1');
        await mongoConnector.createCitation(userID, 'Author 2', 'Content 2');

        const { citations, totalCitations } = await mongoConnector.getCitations(10, 0, {}, { time: 'asc' });

        expect(totalCitations).toBe(2);
        expect(citations.length).toBe(2);
        expect(citations[0].content).toBe('Content 1');
        expect(citations[1].content).toBe('Content 2');
    });
});