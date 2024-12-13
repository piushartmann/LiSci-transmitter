const { Router, json } = require('express');
const { MongoConnector } = require('../../server/MongoConnector');
const sanitizeHtml = require('sanitize-html');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {multer} s3Client - The s3 client instance.
 * @returns {Router} The router instance.
 */

sanitizeHtmlAllowedTags = sanitizeHtml.defaults.allowedTags.concat(['img', 'embed', 'iframe']);

module.exports = (db, s3Client) => {
    const config = require('../../config.json');
    const citationsPageSize = config.citationsPageSize;

    router.post('/createCitation', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { context } = req.body;

        if (!context) return res.status(400).send("Missing parameters");

        const sanitizedContext = [];
        context.forEach(c => {
            if (!c) return;
            if (!c.author || !c.content) return;
            const sanitizedAuthor = sanitizeHtml(c.author);
            const sanitizedContent = sanitizeHtml(c.content);

            sanitizedContext.push({
                author: sanitizedAuthor,
                content: sanitizedContent
            });
        });

        if (sanitizedContext.length === 0) return res.status(400).send("Invalid parameters");

        await db.createCitationWithContext(req.session.userID, sanitizedContext);

        return res.status(200).send("Success");
    });

    function base64toUtf8(base64) {
        return Buffer.from(base64, 'base64').toString('utf8');
    }

    router.get('/getCitations', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!(permissions.includes("classmate"))) return res.status(403).send("You cannot get this data");

        const page = (req.query.page || 1) - 1;

        let filter = req.query.f;
        let sort = req.query.s;

        try {
            filter = filter ? JSON.parse(base64toUtf8(filter)) : {};
        } catch (e) {
            return res.status(400).send("Invalid filter parameter");
        }
        try {
            sort = sort ? JSON.parse(base64toUtf8(sort)) : {};
        } catch (e) {
            return res.status(400).send("Invalid sort parameter");
        }

        Object.keys(filter).forEach(key => {
            if (filter[key] === null || filter[key] === undefined || filter[key] === "") {
                delete filter[key];
            }
        });

        Object.keys(sort).forEach(key => {
            if (sort[key] === null || sort[key] === undefined || sort[key] === "") {
                delete sort[key];
            }
        });

        const { citations, totalCitations } = await db.getCitations(citationsPageSize, citationsPageSize * page, filter, sort);
        if (!citations) return res.status(404).send("Citation not found");

        let filteredCitations = [];

        citations.forEach(citation => {
            let citationObj = citation;
            if (!citation.userID) {
                return;
            }
            if (citation.userID._id.toString() === req.session.userID || permissions.includes("admin")) {
                citationObj.canEdit = true;
            } else {
                citationObj.canEdit = false;
            }
            citationObj.liked = citation.likes.map(like => like.userID.toString()).includes(req.session.userID);
            filteredCitations.push(citationObj);
        });

        return res.status(200).send(JSON.stringify({ citations: filteredCitations, totalCitations }));
    });

    router.post('/likeCitation', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { id } = req.body;

        if (!id) return res.status(400).send("Missing parameters");
        if (typeof id !== "string") return res.status(400).send("Invalid parameters");

        await db.likeCitation(id, req.session.userID);

        return res.status(200).send("Success");
    });

    router.post('/deleteCitation', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);

        const { citationID } = req.body;

        if (!citationID) return res.status(400).send("Missing parameters");
        if (typeof citationID !== "string") return res.status(400).send("Invalid parameters");

        const citation = await db.getCitation(citationID);
        if (!citation) return res.status(404).send("Citation not found");
        if (citation.userID.id.toString() !== req.session.userID && !(permissions.includes("admin"))) return res.status(403).send("You cannot delete this citation");

        await db.deleteCitation(citationID);

        return res.status(200).send("Success");
    });

    router.post('/updateCitation', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);

        const { citationID, context } = req.body;

        if (!citationID || !context) return res.status(400).send("Missing parameters");

        const sanitizedContext = sanitizeHtml(JSON.stringify(context));

        if (typeof citationID !== "string" || typeof sanitizedContext !== "string") return res.status(400).send("Invalid parameters");

        let contextJson;
        try {
            contextJson = JSON.parse(sanitizedContext);
        }
        catch (e) {
            return res.status(400).send("Invalid parameters");
        }

        const citation = await db.getCitation(citationID);
        if (!citation) return res.status(404).send("Citation not found");
        if (citation.userID._id.toString() !== req.session.userID && !(permissions.includes("admin"))) return res.status(403).send("You cannot update this citation");

        await db.updateCitation(citationID, contextJson);
        return res.status(200).send("Success");
    });

    router.get('/getPreviousAuthors', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!(permissions.includes("classmate"))) return res.status(403).send("You cannot get this data");

        const authors = await db.getPreviousAuthors();

        return res.status(200).send(authors);
    });

    return router;
};