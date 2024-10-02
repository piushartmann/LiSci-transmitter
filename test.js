const MongoConnector = require('./MongoConnector').MongoConnector;

connectionString = process.env.DATABASE_URL || "mongodb://localhost:27017";

const db = new MongoConnector("transmitter-test", connectionString);
db.dropDatabase().then(() => { console.log("Database dropped"); });

async function test() {

    userID = (await db.createUser("testuser", "password", "admin"))._id;
    console.log("Created user with ID: " + userID);

    postID = (await db.createPost(userID, "title", "content", "type", "classmatesonly"))._id;
    console.log("Created post with ID: " + postID);

    await db.likePost(postID, userID).then(() => { console.log("Post liked"); });
    await db.commentPost(postID, userID, "content", "classmatesonly").then(() => { console.log("Post commented"); });

    const post = await db.getPost(postID);
    console.log(`Post from ${post.userID.username} with ${post.comments.length} comments and ${post.likes.length} likes`);

    const comments = await db.loadPostComments(postID);
    console.log(`Comment0: ${comments[0].userID.username} said ${comments[0].content} this comment has ${comments[0].likes.length} likes`);

    const likes = await db.loadLikesForPost(postID);
    console.log(`Like0: ${likes[0].userID.username}`);

}

test();