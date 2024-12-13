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
        console.log(`Sending new ${type} notification to everyone`);
        const users = await db.getAllSubscriptions(type);
        console.log(`Found ${users.length} users`);

        for (const user of users) {
            try {
                send(title, body, user._id);
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