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

    router.post('/createCitation', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { author, content } = req.body;
        console.log(author, content);
        if (!author || !content) return res.status(400).send("Missing parameters");
        if (typeof author !== "string" || typeof content !== "string") return res.status(400).send("Invalid parameters");

        const sanitizedContent = sanitizeHtml(content);
        const sanitizedAuthor = sanitizeHtml(author);

        await db.createCitation(req.session.userID, sanitizedAuthor, sanitizedContent);
        return res.status(200).redirect('/citations');
    });

    router.get('/getCitations', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (!(req.session.permissions.includes("classmate"))) return res.status(403).send("You cannot get this data");

        const page = (req.query.page || 1) - 1;

        const citations = await db.getCitations(citationsPageSize, citationsPageSize * page);

        let filteredCitations = [];

        citations.forEach(citation => {
            let citationObj = citation;
            if (!citation.userID) {
                return;
            }
            if (citation.userID._id.toString() === req.session.userID || req.session.permissions.includes("admin")) {
                citationObj.canEdit = true;
            } else {
                citationObj.canEdit = false;
            }
            filteredCitations.push(citationObj);
        });

        return res.status(200).send(filteredCitations);
    });


    router.post('/deleteCitation', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { citationID } = req.body;

        if (!citationID) return res.status(400).send("Missing parameters");
        if (typeof citationID !== "string") return res.status(400).send("Invalid parameters");

        const citation = await db.getCitation(citationID);
        if (citation.userID.id.toString() !== req.session.userID && !(req.session.permissions.includes("admin"))) return res.status(403).send("You cannot delete this citation");

        await db.deleteCitation(citationID);

        return res.status(200).send("Success");
    });

    router.post('/updateCitation', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { citationID, author, content } = req.body;
        console.log(citationID, author, content);

        if (!citationID || !author || !content) return res.status(400).send("Missing parameters");
        if (typeof citationID !== "string" || typeof author !== "string" || typeof content !== "string") return res.status(400).send("Invalid parameters");

        const citation = await db.getCitation(citationID);
        if (citation.userID.toString() !== req.session.userID && !(req.session.permissions.includes("admin"))) return res.status(403).send("You cannot update this citation");

        await db.updateCitation(citationID, author, content);
        return res.status(200).send("Success");
    });
    return router;
};