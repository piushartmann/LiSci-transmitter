const { Router } = require('express');
const multer = require("multer");
const multerS3 = require("multer-s3");
const { MongoConnector } = require('../../MongoConnector');
const sanitizeHtml = require('sanitize-html');
const router = Router();
const oneDay = 24 * 3600 * 1000

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {multer} s3Client - The s3 client instance.
 * @returns {Router} The router instance.
 */

sanitizeHtmlAllowedTags = sanitizeHtml.defaults.allowedTags.concat(['img', 'embed', 'iframe']);

module.exports = (db, s3Client) => {
    const config = require('../../config.json');
    const postsPageSize = config.postsPageSize;
    const citationsPageSize = config.citationsPageSize;

    router.post('/likePost', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { postID } = req.body;
        if (!postID) return res.status(400).send("Missing parameters");
        if (typeof postID !== "string") return res.status(400).send("Invalid parameters");

        const { success, message } = await db.likePost(postID, req.session.userID);
        if (success) {
            return res.status(200).send("Success");
        } else {
            return res.status(500).send("Error:" + message)
        }
    })
    router.post('/createComment', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { postID, content, permissions } = req.body;
        if (!postID || !content || !permissions) return res.status(400).send("Missing parameters");
        if (typeof postID !== "string" || typeof content !== "string") return res.status(400).send("Invalid parameters");

        const sanitizedContent = sanitizeHtml(content);

        await db.commentPost(postID, req.session.userID, sanitizedContent, permissions);
        return res.status(200).send("Success");
    });

    router.post('/deleteComment', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { commentID } = req.body;
        if (!commentID) return res.status(400).send("Missing parameters");
        if (typeof commentID !== "string") return res.status(400).send("Invalid parameters");

        const comment = await db.getComment(commentID);
        if (comment.userID.toString() !== req.session.userID && !(req.session.permissions.includes("admin"))) return res.status(403).send("You cannot delete this comment");

        await db.deleteComment(commentID);
        return res.status(200).send("Success");
    });

    router.post('/updateComment', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { commentID, content } = req.body;
        if (!commentID || !content) return res.status(400).send("Missing parameters");
        if (typeof commentID !== "string" || typeof content !== "string") return res.status(400).send("Invalid parameters");

        const comment = await db.getComment(commentID);
        if (comment.userID.toString() !== req.session.userID && !(req.session.permissions.includes("admin"))) return res.status(403).send("You cannot update this comment");

        await db.updateComment(commentID, content);
        return res.status(200).send("Success");
    });

    return router;
};