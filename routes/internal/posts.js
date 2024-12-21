const { Router } = require('express');
const { MongoConnector } = require('../../server/MongoConnector.js');
const sanitizeHtml = require('sanitize-html');
const router = Router();
const openAI = require('../../server/openAI');

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Router} The router instance.
 */

sanitizeHtmlAllowedTags = sanitizeHtml.defaults.allowedTags.concat(['img', 'embed', 'iframe']);

module.exports = (db) => {
    const config = require('../../config.json');
    const postsPageSize = config.postsPageSize;

    async function markPostsAsRead(userID, posts) {
        for (let i = 0; i < posts.length; i++) {
            await db.markPostAsRead(userID, posts[i]._id);
        }
    }

    router.post('/createPost', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!permissions.includes("admin") && !permissions.includes("canPost")) return res.status(403).send("You cannot create a post");

        const { title, sections, permissions: postPermissions, type } = req.body;
        const permissionsBool = postPermissions === "true";

        let postType;
        if (permissions.includes("admin") || permissions.includes("writer")) {
            postType = type ? type : "post";
        }
        else {
            postType = "post";
        }
        console.log(req.body);

        const sanitizedSections = JSON.parse(sections).map(section => {
            if (section.type === "text" || section.type === "markdown") {
                section.content = sanitizeHtml(section.content, {
                    allowedTags: sanitizeHtmlAllowedTags,
                    allowedAttributes: {}
                });
            }
            return section;
        });

        if (!title || !sections) return res.status(400).send("Missing parameters");
        if (typeof title !== "string") return res.status(400).send("Invalid parameters");

        const post = await db.createPost(req.session.userID, title, sanitizedSections, permissionsBool ? "Teachersafe" : "classmatesonly", postType);
        const postID = post._id;
        res.status(200).send("Success");
        console.log("Created post with Title: " + title);
        summarizeSections(sanitizedSections, postID);

        return;
    });

    router.post('/updatePost', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!permissions.includes("admin") && !permissions.includes("canPost")) return res.status(403).send("You cannot update a post");

        const { postID, title, sections, permissions: postPermissions, type } = req.body;

        let postType;
        if (permissions.includes("admin") || permissions.includes("writer")) {
            postType = type ? type : "post";
        }
        else {
            postType = "post";
        }

        const post = await db.getPost(postID);
        const newsIsNew = post.type !== "news" && postType === "news";
        if (req.session.userID != post.userID._id.toString() || !permissions.includes("admin")) return res.status(403).send("You cannot update this post");

        const sanitizedSections = JSON.parse(sections).map(section => {
            if (section.type === "text" || section.type === "markdown") {
                section.content = sanitizeHtml(section.content, {
                    allowedTags: sanitizeHtmlAllowedTags,
                    allowedAttributes: {}
                });
            }
            return section;
        });

        const permissionsBool = postPermissions === "true";
        console.log(postID, title, sections, postPermissions);

        if (!postID || !title || !sections) return res.status(400).send("Missing parameters");
        if (typeof postID !== "string" || typeof title !== "string" || typeof sections !== "string") return res.status(400).send("Invalid parameters");

        await db.updatePost(postID, title, sanitizedSections, permissionsBool ? "Teachersafe" : "classmatesonly", postType);
        res.status(200).send("Success");
        console.log("Updated post with Title: " + title);
        summarizeSections(sanitizedSections, postID);
        if (newsIsNew) pushNewPostNotification(post, req.session.username, postType === "news");
        return;
    })

    function summarizeSections(sections, postID) {
        sections.forEach(async section => {
            if (section.type === "file") {
                const fileType = section.content.split('.').pop();
                let text;
                if (fileType === "pdf") {
                    text = await openAI.extractTextFromPDF("https://storage.liscitransmitter.live/" + section.content);
                }

                if (text) {
                    if (!section.summary) {
                        const summary = await openAI.summarizeText(text);
                        db.addSummaryToSection(postID, section.id, summary);
                    }
                    if (!section.title) {
                        const title = await openAI.createTitle(text);
                        db.addTitleToSection(postID, section.id, title);
                    }
                }
            }
        });
    }

    router.get('/getPosts', async (req, res) => {
        const permissions = await db.getUserPermissions(req.session.userID);
        const isTeacher = !(permissions.includes("classmate"));
        if (!req.query) return res.status(400).send("Missing parameters");
        let page = (req.query.page || 1) - 1;

        const filter = req.query.filter || {};

        const totalPosts = await db.getPostNumber(isTeacher, filter);

        if (page * postsPageSize > totalPosts){
            page = Math.ceil(totalPosts / postsPageSize) - 1;
        }

        const postData = await db.getPosts(isTeacher, postsPageSize, postsPageSize * page, filter);
        const posts = postData.posts;
        let filteredPosts = [];
        posts.forEach(post => {
            let postObj = post;
            if (!post.userID) {
                return;
            }
            if (permissions.includes("admin") || post.userID._id.toString() === req.session.userID) {
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
        return res.status(200).send(JSON.stringify({ posts: filteredPosts, totalPosts, pageSize: postsPageSize }));
    });

    router.get('/getPost/:id', async (req, res) => {
        const post = await db.getPost(req.params.id);
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!(permissions.includes("classmate")) && post.permissions === "classmatesonly") return res.status(403).send("You cannot view this post");

        if (!post) {
            return res.status(404).send("Post not found");
        }
        markPostsAsRead(req.session.userID, [post]);
        return res.status(200).send(post);
    });

    router.post('/deletePost', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);

        const { postID } = req.body;
        if (!postID) return res.status(400).send("Missing parameters");
        if (typeof postID !== "string") return res.status(400).send("Invalid parameters");

        const post = await db.getPost(postID);

        if (post.userID._id.toString() !== req.session.userID && !(permissions.includes("admin"))) return res.status(403).send("You cannot delete this post");

        await db.deletePost(postID);
        return res.status(200).send("Success");
    })

    return router;
};