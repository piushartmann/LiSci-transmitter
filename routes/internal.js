const { Router } = require('express');
const { MongoConnector } = require('../server/MongoConnector');
const sanitizeHtml = require('sanitize-html');
const router = Router();
const oneDay = 24 * 3600 * 1000

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {multer} s3Client - The s3 client instance.
 * @returns {Router} The router instance.
 */

sanitizeHtmlAllowedTags = sanitizeHtml.defaults.allowedTags.concat(['img', 'embed', 'iframe']);

function generateRandomProfilePic() {
    return { "type": "default", "content": "#" + Math.floor(Math.random() * 16777215).toString(16) };
}

module.exports = (db, s3Client, webpush) => {

    router.get('/', (req, res) => {
        res.send("This is the internal API, it is not meant to be accessed directly. On the /api route you can find the public API.");
    });

    router.get('/health', async (req, res) => {
        res.status(200).send("OK");
    });

    router.post('/login', async (req, res) => {
        const { username, password } = req.body;
        const user = await db.checkLogin(username, password);
        if (!user) {
            return res.status(401).redirect('/');
        }
        else {
            req.session.username = user.username;
            req.session.userID = user._id;
            req.session.cookie.expires = new Date(Date.now() + oneDay * 30);
            const profilePicPreference = user.preferences.find(preference => preference.key === "profilePic");
            if (profilePicPreference) {
                req.session.profilePic = profilePicPreference.value;
            }
            else {
                req.session.profilePic = generateRandomProfilePic();
                await db.setPreference(user._id, 'profilePic', req.session.profilePic);
            }
            res.status(200).redirect('/');
        }
    });

    router.get('/logout', async (req, res) => {
        req.session.destroy();
        res.status(200).redirect('/');
    });

    //include all internal routes
    router.use('/', require('./internal/interactions')(db, s3Client));
    router.use('/', require('./internal/citations')(db, s3Client, webpush));
    router.use('/', require('./internal/posts')(db, s3Client, webpush));
    router.use('/', require('./internal/uploads')(db, s3Client));
    router.use('/', require('./internal/users')(db, s3Client));
    router.use('/settings', require('./internal/settings')(db, s3Client));

    return router;
}
