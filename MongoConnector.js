const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = mongoose.Types;

const commentSchema = new Schema({
    userID: { type: ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    permissions: { type: String, required: true, enum: ['classmatesonly', 'Teachersafe'] },
    likes: [{ userID: String, date: Date }],
    timestamp: { type: Date, default: Date.now }
});

const postSchema = new Schema({
    userID: { type: ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, required: true },
    permissions: { type: String, required: true, enum: ['classmatesonly', 'Teachersafe'] },
    timestamp: { type: Date, default: Date.now },
    comments: [{ type: ObjectId, ref: 'Comment' }],
    likes: [{ userID: { type: ObjectId, ref: 'User', required: true }, date: { type: Date, default: Date.now } }],
});

const userSchema = new Schema({
    username: { type: String, required: true },
    passHash: { type: String, required: true },
    profilePic: { type: String, required: false },
    email: { type: String, required: false },
    comments: [{ type: ObjectId, ref: 'Comment' }],
    likes: [{ postID: { type: ObjectId, ref: 'Post', required: true }, date: { type: Date, default: Date.now } }],
    type: { type: String, required: true, enum: ['classmate', 'teacher', 'writer', 'admin'] }
});

module.exports.MongoConnector = class MongoConnector {
    constructor(url = "mongodb://localhost:27017") {
        this.mongoose = mongoose;
        this.url = url;
        this.mongoose.connect(this.url, {dbName: "transmitter"});

        this.Post = this.mongoose.model('Post', postSchema);
        this.User = this.mongoose.model('User', userSchema);
        this.Comment = this.mongoose.model('Comment', commentSchema);
    }

    async dropDatabase() { //be careful intended for debugging
        await this.mongoose.connection.dropDatabase();
    }

    async createPost(userID, title, content, type, permissions) {
        const post = new this.Post({ userID, title, content, type, permissions });
        return await post.save();
    }

    async likePost(postID, userID) {
        const post = await this.Post.findById(postID);
        const user = await this.User.findById(userID);
        post.likes.push({ userID, date: Date.now() });
        user.likes.push({ postID, date: Date.now() });
        await user.save();
        return await post.save();
    }

    async commentPost(postID, userID, content, permissions) {
        const comment = await this.Comment.create({ userID, content, permissions });
        const post = await this.Post.findById(postID);
        const user = await this.User.findById(userID);
        post.comments.push(comment);
        user.comments.push(comment);
        await user.save();
        return await post.save();
    }

    async createUser(username, passHash, type) {
        const user = new this.User({ username, passHash, email: "", type });
        return await user.save();
    }

    async getUser(username) {
        return await this.User.findOne({ username });
    }

    async getPost(postID) {
        return await this.Post.findById(postID)
            .populate('userID', 'username profilePic')
    }

    async loadPostComments(postID) {
        const post = await this.Post.findById(postID)
            .populate('comments')
            .populate({
                path: 'comments',
                populate: {
                    path: 'userID',
                    select: 'username profilePic'
                }
            });
        return post.comments;
    }

    async loadLikesForPost(postID) {
        const post = await this.Post.findById(postID)
            .populate('likes.userID', 'username profilePic');
        return post.likes;
    }
};
