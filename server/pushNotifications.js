const { MongoConnector } = require('./MongoConnector');

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {webpush} webpush - The webpush instance.
 */

module.exports = (db, webpush) => {
    async function send(title, body, userID) {

        console.log(`Sending: ${title} with ${body}`)
        const subscription = await db.getSubscription(userID);
        if (!subscription) return;

        const pushData = { title, body };
        try {
            await webpush.sendNotification(subscription, JSON.stringify(pushData));
            return 200;
        }
        catch (error) {
            return 500;
        }
    }

    async function sendToEveryone(type, title, body) {
        const users = await db.getAllSubscriptions();

        for (const user of users) {
            try {
                if (type === "urgent") {
                    send(title, body, user._id);
                }
                else if (type === "newNews" && await db.getPreference(user._id, "newsNotifications")) {
                    send(title, body, user._id);
                }
                else if (type === "newPost" && await db.getPreference(user._id, "postNotifications")) {
                    send(title, body, user._id);
                }
                else if (type === "newCitation" && await db.getPreference(user._id, "citationNotification")) {
                    send(title, body, user._id);
                }
            }
            catch (error) {
                console.warn(error);
            }
        }
    }


    return {
        send,
        sendToEveryone
    };
}