const { Router } = require('express');
const { MongoConnector } = require('../server/MongoConnector');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {multer} s3Client - The s3 client instance.
 * @param {number} pageSize - The number of posts per page.
 * @param {webpush} webpush - The webpush instance.
 * @returns {Router} The router instance.
 */

module.exports = (db, s3Client, webpush) => {
    const config = require('../config.json');
    const postsPageSize = config.postsPageSize;

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

        const currentPage = (req.query.page || 1) - 1;
        const filter = req.query.filter || "all";
        const posts = await db.getPosts(!user.permissions.includes("classmate"), postsPageSize, postsPageSize * currentPage, filter);
        if (!posts) return res.status(404).send("No posts found");
        const filteredPosts = await Promise.all(posts.map(async post => ({
            user: post.userID.username,

            title: post.title,

            sections: post.sections,

            mediaPath: post.mediaPath,

            type: post.type,

            likes: post.likes.length,

            liked: (await db.loadLikesForPost(post._id)).map(like => like.userID.id.toString()).includes(user._id.toString()),

        })));

        return res.send(filteredPosts);
    });

router.get('/getPostPages', async (req, res) => {
    const user = await checkAPIKey(req);
    if (!user) return res.status(401).send("Invalid API key");

    const filter = req.query.filter || "all";
    const pages = Math.ceil(await db.getPostNumber(!user.permissions.includes("classmate"), filter) / postsPageSize);
    return res.send({ pages });
});

router.get('/getMostRecentPost', async (req, res) => {
    const user = await checkAPIKey(req);
    if (!user) return res.status(401).send("Invalid API key");

    const filter = req.query.filter || "all";

    const posts = await db.getPosts(!user.permissions.includes("classmate"), 1, 0, filter);
    if (!posts || posts.length < 1) return res.status(404).send("No posts found");
    const post = posts[0];
    const likes = await db.loadLikesForPost(post._id);
    return res.send({
        id: post._id,
        user: post.userID.username,
        title: post.title,
        sections: post.sections,
        mediaPath: post.mediaPath,
        type: post.type,
        likes: post.likes.length,
        liked: likes.map(like => like.userID.id.toString()).includes(user._id.toString()),
    });

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
    const permissions = db.getUserPermissions(user._id) || [];
    if (!permissions.includes("canPost")) return res.status(403).send("You cannot create a post");

    const { title, content, type, postPermissions, mediaPath } = req.body;
    try {
        const post = await db.createPost(user._id, title, content, type, postPermissions, mediaPath);
        return res.status(200).send("Success");
    }
    catch (error) {
        return res.status(500).send(error.message);
    };
});

router.post('/createComment', async (req, res) => {
    const user = await checkAPIKey(req);
    if (!user) return res.status(401).send("Invalid API key");

    const { postID, content, postPermissions } = req.body;
    console.log(postID, content, postPermissions);
    try {
        const comment = await db.commentPost(postID, user._id, content, postPermissions);
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
