const { Router } = require('express');
const { MongoConnector } = require('../MongoConnector');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {multer} s3Client - The s3 client instance.
 * @param {number} pageSize - The number of posts per page.
 * @returns {Router} The router instance.
 */

module.exports = (db, pageSize, s3Client) => {

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
        return res.send("This is the public API, documentation is coming soon.")
    });

    router.get('/checkKey', async (req, res) => {
        const user = await checkAPIKey(req);
        return res.send(user == null ? "Invalid" : "Valid " + user.username);
    });

    router.get('/getPosts', async (req, res) => {
        const user = await checkAPIKey(req);
        if (!user) return res.status(401).send("Invalid API key");

        const currentPage = req.query.page || 1;
        const posts = await db.getPosts(currentPage, pageSize, user.type === "teacher");
        
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
        const comments = await db.getComments(postID);
        const filteredComments = comments.map(comment => ({
            id: comment._id,
            user: comment.userID.username,
            content: comment.content,
        }));
        return res.send(filteredComments);
    });

    router

    return router;
};