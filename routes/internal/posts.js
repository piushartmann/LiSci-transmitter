const { Router } = require('express');
const { MongoConnector } = require('../../MongoConnector');
const sanitizeHtml = require('sanitize-html');
const router = Router();
const openAI = require('../../openAI');

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {multer} s3Client - The s3 client instance.
 * @returns {Router} The router instance.
 */

sanitizeHtmlAllowedTags = sanitizeHtml.defaults.allowedTags.concat(['img', 'embed', 'iframe']);

module.exports = (db, s3Client) => {
    const config = require('../../config.json');
    const postsPageSize = config.postsPageSize;

    async function markPostsAsRead(userID, posts) {
        for (let i = 0; i < posts.length; i++) {
            await db.markPostAsRead(userID, posts[i]._id);
        }
    }

    router.post('/createPost', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (!req.session.permissions.includes("admin") && !req.session.permissions.includes("writer")) return res.status(403).send("You cannot create a post");

        const { title, sections, permissions } = req.body;
        const permissionsBool = permissions === "true";
        console.log(title, sections, permissions);

        const sanitizedSections = JSON.parse(sections).map(section => {
            if (section.type === "text" || section.type === "markdown") {
                section.content = sanitizeHtml(section.content, {
                    allowedTags: sanitizeHtmlAllowedTags,
                    allowedAttributes: {}
                });
            }
            return section;
        });

        const summarizedSections = await Promise.all(sanitizedSections.map(async section => {
            if (section.type === "file") {
                const openAIResponse = await openAI.summarizePDF("https://storage.liscitransmitter.live/" + section.content);
                section.summary = openAIResponse;
            }
            return section;
        }));

        if (!title || !sections) return res.status(400).send("Missing parameters");
        if (typeof title !== "string") return res.status(400).send("Invalid parameters");

        await db.createPost(req.session.userID, title, summarizedSections, permissionsBool ? "Teachersafe" : "classmatesonly");
        return res.status(200).send("Success");
    });

    router.post('/updatePost', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (!req.session.permissions.includes("admin") && !req.session.permissions.includes("writer")) return res.status(403).send("You cannot update a post");

        const { postID, title, sections, permissions } = req.body;

        const sanitizedSections = JSON.parse(sections).map(section => {
            if (section.type === "text" || section.type === "markdown") {
                section.content = sanitizeHtml(section.content, {
                    allowedTags: sanitizeHtmlAllowedTags,
                    allowedAttributes: {}
                });
            }
            return section;
        });

        const summarizedSections = await Promise.all(sanitizedSections.map(async section => {
            if (section.type === "file") {
                const openAIResponse = await openAI.summarizePDF("https://storage.liscitransmitter.live/" + section.content);
                section.summary = openAIResponse;
            }
            return section;
        }));

        const permissionsBool = permissions === "true";
        console.log(postID, title, sections, permissions);

        if (!postID || !title || !sections) return res.status(400).send("Missing parameters");
        if (typeof postID !== "string" || typeof title !== "string" || typeof sections !== "string") return res.status(400).send("Invalid parameters");

        await db.updatePost(postID, title, summarizedSections, permissionsBool ? "Teachersafe" : "classmatesonly");
        return res.status(200).send("Success");
    })

    router.get('/getPosts', async (req, res) => {
        const permissions = req.session.permissions || [];
        const isTeacher = !(permissions.includes("classmate"));
        const page = (req.query.page || 1) - 1;

        const posts = await db.getPosts(isTeacher, postsPageSize, postsPageSize * page);
        let filteredPosts = [];
        posts.forEach(post => {
            let postObj = post;
            if (permissions.includes("admin") || permissions.includes("writer")) {
                postObj.canEdit = true;
            }
            postObj.liked = post.likes.map(like => like.userID.toString()).includes(req.session.userID);

            for (let i = 0; i < post.comments.length; i++) {
                if (permissions.includes("admin")) {
                    postObj.comments[i].canEdit = true;
                } else {
                    postObj.comments[i].canEdit = postObj.comments[i].userID._id.toString() === req.session.userID;
                }
            }

            filteredPosts.push(postObj);
        });
        markPostsAsRead(req.session.userID, posts);
        return res.status(200).send(filteredPosts);
    });

    router.get('/getPost/:id', async (req, res) => {
        const post = await db.getPost(req.params.id);
        const permissions = req.session.permissions || [];
        if (!(permissions.includes("classmate")) && post.permissions === "classmatesonly") return res.status(403).send("You cannot view this post");

        if (!post) {
            return res.status(404).send("Post not found");
        }
        markPostsAsRead(req.session.userID, [post]);
        return res.status(200).send(post);
    });

    router.post('/deletePost', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { postID } = req.body;
        if (!postID) return res.status(400).send("Missing parameters");
        if (typeof postID !== "string") return res.status(400).send("Invalid parameters");

        const post = await db.getPost(postID);
        if (post.userID.toString() !== req.session.userID && !(req.session.permissions.includes("admin"))) return res.status(403).send("You cannot delete this post");

        await db.deletePost(postID);
        return res.status(200).send("Success");
    })

    return router;
};