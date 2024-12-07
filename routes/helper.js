const { MongoConnector } = require('../server/MongoConnector');

const basePrefetches = [

];
const version = process.env.VERSION;

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Object} The renderView function.
 */
module.exports = (db) => {
    async function renderView(req, res, view, additionalRenderData = {}, additionalPrefetches = []) {
        res.locals.additionalPrefetches = basePrefetches.concat(additionalPrefetches);
        const permissions = await db.getUserPermissions(req.session.userID) || [];
        const preferences = await db.getPreferences(req.session.userID) || {};
        const profilePic = await db.getPreference(req.session.userID, 'profilePic');
    
        return res.render(view, {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions || [], profilePic: profilePic, version: version, prefetches: res.locals.additionalPrefetches, preferences: preferences || {},
            ...additionalRenderData
        });
    }

    return {
        renderView: renderView
    };
};