const { Router } = require('express');
const sanitizeHtml = require('sanitize-html');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Router} The router instance.
 */

sanitizeHtmlAllowedTags = sanitizeHtml.defaults.allowedTags.concat(['img', 'embed', 'iframe']);

module.exports = (db) => {

// TODO: Add router routes here

    router.get('/', async (req, res) => {
        const untisClasses = await db.getPreference(req.session.userID, 'untisClasses');

        return res.render('untis', {
            untisClasses: untisClasses
        });
    });


    return router;
};