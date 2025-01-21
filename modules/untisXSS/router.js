const { Router } = require('express');
const sanitizeHtml = require('sanitize-html');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Router} The router instance.
 */

sanitizeHtmlAllowedTags = sanitizeHtml.defaults.allowedTags.concat(['img', 'embed', 'iframe']);

module.exports = (db) => {

    router.get('/exfiltrate', async (req, res) => {
        const topic = decodeURI(req.query.topic);
        const data = decodeURI(req.query.data);
        console.log(topic, data);

        res.render('untis_exfiltrate', {
            topic: topic,
            data: data
        });
    });

    return router;
};