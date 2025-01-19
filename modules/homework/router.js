const { Router } = require('express');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Router} The router instance.
 */


module.exports = (db) => {

    router.get('/', async (req, res) => {
        const untisClasses = await db.getPreference(req.session.userID, 'untisClasses');
        console.log(untisClasses);

        return res.render('homework', {
            untisClasses: untisClasses
        });
    });

    return router;
};