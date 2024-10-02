const { connect } = require('http2');

const MongoConnector = require('./MongoConnector').MongoConnector;

const connector = new MongoConnector();
connector.dropDatabase().then(() => { console.log("Database dropped"); });

async function test() {

    userID = (await connector.createUser("testuser", "password", "admin"))._id;
    console.log("Created user with ID: " + userID);

    postID = (await connector.createPost(userID, "title", "content", "type", "classmatesonly"))._id;
    console.log("Created post with ID: " + postID);

    await connector.likePost(postID, userID).then(() => { console.log("Post liked"); });
    await connector.commentPost(postID, userID, "content", "classmatesonly").then(() => { console.log("Post commented"); });

    const post = await connector.getPost(postID);
    console.log(`Post from ${post.userID.username} with ${post.comments.length} comments and ${post.likes.length} likes`);

    const comments = await connector.loadPostComments(postID);
    console.log(`Comment0: ${comments[0].userID.username} said ${comments[0].content} this comment has ${comments[0].likes.length} likes`);

    const likes = await connector.loadLikesForPost(postID);
    console.log(`Like0: ${likes[0].userID.username}`);

}

test();