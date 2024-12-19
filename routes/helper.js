const { MongoConnector } = require('../server/MongoConnector');

const basePrefetches = [

];
const version = process.env.VERSION;
const config = require("../config.json")

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
        const ips = req.headers['x-forwarded-for'] || req.socket.remoteAddress
        const ip = ips.split(",")[0]

        const isInSchool = ip == config.schoolIP;
    
        return res.render(view, {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions || [], profilePic: profilePic, version: version, prefetches: res.locals.additionalPrefetches, preferences: preferences || {}, isInSchool,
            ...additionalRenderData
        });
    }

    return {
        renderView: renderView
    };
};