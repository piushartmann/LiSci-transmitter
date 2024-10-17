const { MongoConnector } = require('./MongoConnector');

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {webpush} webpush - The webpush instance.
 */

module.exports = (db, webpush) => {
    async function send(title, body, userID) {
        const subscription = await db.getSubscription(userID);

        const pushData = { title, body };
        try {
            webpush.sendNotification(subscription, JSON.stringify(pushData));
            return 200;
        }
        catch (error) {
            return 500;
        }
    }

    async function sendToEveryone(type, title, body) {
        const users = await db.getAllSubscriptions();
        const pushData = { title, body };
        for (const user of users) {
            console.log(user.preferences);
            try {
                if (type === "urgent") webpush.sendNotification(user.pushSubscription, JSON.stringify(pushData));
                else if (type === "newNews" && await db.getPreference(user._id, "newsNotifications")) webpush.sendNotification(user.pushSubscription, JSON.stringify(pushData));
                else if (type === "newPost" && await db.getPreference(user._id, "postNotifications")) webpush.sendNotification(user.pushSubscription, JSON.stringify(pushData));
                else if (type === "newCitation" && await db.getPreference(user._id, "citationNotification")) webpush.sendNotification(user.pushSubscription, JSON.stringify(pushData));
            }
            catch (error) {
                console.error(error);
            }
        }
    }


    return {
        send,
        sendToEveryone
    };
}