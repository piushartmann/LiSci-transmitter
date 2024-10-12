const { Router } = require('express');
const { MongoConnector } = require('../MongoConnector');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {multer} s3Client - The s3 client instance.
 * @param {number} pageSize - The number of posts per page.
 * @param {webpush} webpush - The webpush instance.
 * @returns {Router} The router instance.
 */

module.exports = (db, pageSize, s3Client, webpush) => {

    async function checkAPIKey(req) {
        keyHeader = req.headers['x-api-key'];
        if (!keyHeader) {
            return null;
        }
        const user = await db.getUserByAPIKey(keyHeader);
        if (!user) {
            return null;
        }
        return user;
    }

    router.get('/', async (req, res) => {
        return res.render('swaggerui.ejs', { filepath: '/swagger/api.yml' });
    });

    router.get('/checkKey', async (req, res) => {
        const user = await checkAPIKey(req);
        return res.send(user == null ? "Invalid" : "Valid " + user.username);
    });

    router.get('/getPosts', async (req, res) => {
        const user = await checkAPIKey(req);
        if (!user) return res.status(401).send("Invalid API key");

        const currentPage = req.query.page || 1;
        const posts = await db.getPosts(currentPage, pageSize, !user.permissions.includes("classmate"));

        const filteredPosts = posts.map(post => ({
            id: post._id,
            user: post.userID.username,
            title: post.title,
            content: post.content,
            mediaPath: post.mediaPath,
            type: post.type,
            likes: post.likes.length,
        }));
        return res.send(filteredPosts);
    });

    router.get('/getComments', async (req, res) => {
        const user = await checkAPIKey(req);
        if (!user) return res.status(401).send("Invalid API key");

        const postID = req.query.postID;
        const comments = await db.loadPostComments(postID);
        const filteredComments = comments.map(comment => ({
            id: comment._id,
            user: comment.userID.username,
            content: comment.content,
        }));
        return res.send(filteredComments);
    });

    router.post('/createPost', async (req, res) => {
        const user = await checkAPIKey(req);
        if (!user) return res.status(401).send("Invalid API key");
        if (!req.session.permissions.includes("writer")) return res.status(403).send("You cannot create a post");

        const { title, content, type, permissions, mediaPath } = req.body;
        try {
            const post = await db.createPost(user._id, title, content, type, permissions, mediaPath);
            return res.status(200).send("Success");
        }
        catch (error) {
            return res.status(500).send(error.message);
        };
    });

    router.post('/createComment', async (req, res) => {
        const user = await checkAPIKey(req);
        if (!user) return res.status(401).send("Invalid API key");

        const { postID, content, permissions } = req.body;
        console.log(postID, content, permissions);
        try {
            const comment = await db.commentPost(postID, user._id, content, permissions);
            return res.status(200).send("Success");
        }
        catch (error) {
            return res.status(500).send(error.message);
        }
    });

    router.post('/likePost', async (req, res) => {
        const user = await checkAPIKey(req);
        if (!user) return res.status(401).send("Invalid API key");

        const { postID } = req.body;
        try {
            const post = await db.likePost(postID, user._id);
            return res.status(200).send("Success");
        }
        catch (error) {
            return res.status(500).send(error.message);
        }
    });

    router.post('/sendPush', async (req, res) => {
        const user = await checkAPIKey(req);
        if (!user) return res.status(401).send("Invalid API key");
        if (!user.permissions.includes("push")) return res.status(403).send("You cannot send a push notification");

        const { userID, title, body, icon, badge, urgency } = req.body;
        const subscription = await db.getSubscription(userID);
        const pushData = { title, body, icon, badge, urgency };
        try {
            webpush.sendNotification(subscription, JSON.stringify(pushData));
            return res.status(200).send("Success");
        }
        catch (error) {
            return res.status(500).send(error.message);
        }
    });

    router.post('/createCitation', async (req, res) => {
        const user = await checkAPIKey(req);
        if (!user) return res.status(401).send("Invalid API key")

        const { author, content } = req.body;

        try {
            await db.createCitation(user._id, author, content);
            return res.status(200).send("Success");
        }
        catch (error) {
            return res.status(500).send(error.message);
        }
    });

    return router;
};
