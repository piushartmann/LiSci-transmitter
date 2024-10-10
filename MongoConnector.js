const mongoose = require('mongoose');
const crypto = require('crypto');
const Schema = mongoose.Schema;
const { ObjectId } = mongoose.Types;
const { generateApiKey } = require('generate-api-key');


const likeSchema = new Schema({
    userID: { type: ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, default: Date.now }
});

const commentSchema = new Schema({
    userID: { type: ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true },
    permissions: { type: String, required: true, enum: ['classmatesonly', 'Teachersafe'] },
    likes: [likeSchema],
    timestamp: { type: Date, default: Date.now }
});

const sectionSchema = new Schema({
    type: { type: String, required: true },
    content: { type: String, required: false },
    size: { type: Number, required: false }
});

const postSchema = new Schema({
    userID: { type: ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    sections: [{ type: sectionSchema, required: true }],
    permissions: { type: String, required: true, enum: ['classmatesonly', 'Teachersafe'] },
    timestamp: { type: Date, default: Date.now },
    comments: [{ type: ObjectId, ref: 'Comment' }],
    likes: [likeSchema],
});

const userSchema = new Schema({
    username: { type: String, required: true, index: true },
    passHash: { type: String, required: true },
    profilePic: { type: String, required: false },
    pushSubscription: { type: Object, required: false },
    permissions: [{ type: String, required: true, enum: ['classmate', 'writer', 'admin'] }],
    apiKey: { type: String, required: true }
});

const citationSchema = new Schema({
    userID: { type: ObjectId, ref: 'User', required: true, index: true },
    author: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    likes: [likeSchema],
    comments: [{ type: ObjectId, ref: 'Comment' }]
});

function hashPassword(password) {
    const hash = crypto.createHash('sha256');
    hash.update(password);
    return hash.digest('hex');
}

module.exports.MongoConnector = class MongoConnector {
    constructor(database, url = "mongodb://localhost:27017") {
        this.mongoose = mongoose;
        this.url = url;
        this.mongoose.connect(this.url, { dbName: database });

        this.Post = this.mongoose.model('Post', postSchema);
        this.User = this.mongoose.model('User', userSchema);
        this.Comment = this.mongoose.model('Comment', commentSchema);
        this.Citation = this.mongoose.model('Citation', citationSchema);
    }

    async dropDatabase() { //be careful intended for debugging
        await this.mongoose.connection.dropDatabase();
    }

    async createPost(userID, title, sections, permissions) {
        const filteredSections = sections.filter(section => section.content && section.content.trim() !== '');
        const post = new this.Post({ userID, title, sections: filteredSections, permissions });
        return await post.save();
    }

    async deletePost(postID) {
        return await this.Post.findByIdAndDelete(postID);
    }

    async updatePost(postID, title, sections, permissions) {
        const post = await this.Post.findById(postID);
        post.title = title;
        post.sections = sections;
        post.permissions = permissions;
        return await post.save();
    }

    async likePost(postID, userID) {
        const post = await this.Post.findById(postID);
        const hasLiked = post.likes.some(like => like.userID.equals(userID));
    
        if (hasLiked) {
            return { success: false, message: 'You have already liked this post.' };
        }
        
        post.likes.push({ userID, date: Date.now() });
        await post.save();
    
        return { success: true, message: 'Post liked successfully!' };
    }
    

    async commentPost(postID, userID, content, permissions) {
        const comment = await this.Comment.create({ userID, content, permissions });
        const post = await this.Post.findById(postID);
        post.comments.push(comment);
        return await post.save();
    }

    async createUser(username, password, permissions) {
        const passHash = hashPassword(password);
        const user = new this.User({ username, passHash, permissions: permissions,apiKey: generateApiKey() });
        return await user.save();
    }

    async setUserData(userID, key, value) {
        const user = await this.User.findById(userID);
        user[key] = value;
        return await user.save();
    }

    async getUserData(userID, key) {
        const user = await this.User.findById(userID);
        return user[key];
    }

    async getUserData(userID) {
        return await this.User.findById(userID);
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

    async checkLogin(username, password) {
        const user = await this.User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
        if (!user) {
            return false;
        }
        const passHash = hashPassword(password);
        if (user.passHash === passHash) {
            return user;
        }
        else {
            return false;
        }
    }

    async getPosts(isTeacher, limit = 10, offset = 0) {
        const query = isTeacher ? { permissions: { $ne: 'classmatesonly' } } : {};
        const post = await this.Post.find(query)
            .populate('userID', 'username profilePic')
            .sort({ timestamp: -1 })
            .skip(offset)
            .limit(limit);
        return post;

    }

    async getPostNumber(isTeacher) {
        const query = isTeacher ? { permissions: { $ne: 'classmatesonly' } } : {};
        return await this.Post.countDocuments(query);
    }

    async searchForPosts(query, isTeacher, limit = 10, offset = 0) {
        const search = { $text: { $search: query } };
        const permissions = isTeacher ? { permissions: { $ne: 'classmatesonly' } } : {};
        return await this.Post.find({ $and: [search, permissions] })
            .populate('userID', 'username profilePic')
            .sort({ timestamp: -1 })
            .skip(offset)
            .limit(limit);
    }

    async getUserByAPIKey(apiKey) {
        return await this.User.findOne({ apiKey });
    }

    async createCitation(userID, author, content) {
        const citation = new this.Citation({ userID, author, content });
        return await citation.save();
    }

    async getCitations(limit = 10, offset = 0) {
        return await this.Citation.find()
            .populate('userID', 'username profilePic')
            .sort({ timestamp: -1 })
            .skip(offset)
            .limit(limit);
    }

    async getCitation(citationID) {
        return await this.Citation.findById(citationID)
            .populate('userID', 'username profilePic')
            .populate('comments')
    }

    async deleteCitation(citationID) {
        return await this.Citation.findByIdAndDelete(citationID);
    }

    async updateCitation(citationID, author, content) {
        const citation = await this.Citation.findById(citationID);
        citation.author = author;
        citation.content = content;
        return await citation.save();
    }

    async setSubscription(userID, subscription) {
        const user = await this.User.findById(userID);
        user.pushSubscription = subscription;
        return await user.save();
    }

    async getSubscription(userID) {
        const user = await this.User.findById(userID);
        return user.pushSubscription;
    }
};
