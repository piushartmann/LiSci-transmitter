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
    pushSubscription: { type: Object, required: false },
    permissions: [{ type: String, required: true, enum: ['classmate', 'writer', 'admin'] }],
    apiKey: { type: String, required: true },
    preferences: [{ key: { type: String, required: true }, value: { type: Object, required: true } }]
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
            post.likes = post.likes.filter(like => !like.userID.equals(userID));
            await post.save();
            return { success: true, message: 'Like removed successfully!' };
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

    async getComment(commentID) {
        return await this.Comment.findById(commentID);
    }

    async deleteComment(commentID) {
        return await this.Comment.findByIdAndDelete(commentID);
    }

    async updateComment(commentID, content) {
        const comment = await this.Comment.findById(commentID);
        comment.content = content;
        return await comment.save();
    }

    async createUser(username, password, permissions) {
        const passHash = hashPassword(password);
        const user = new this.User({ username, passHash, permissions: permissions, apiKey: generateApiKey() });
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
        const user = await this.User.findOne({ username })
            .populate('preferences');
        console.log(user);
        return user;
    }

    async getPost(postID) {
        return await this.Post.findById(postID)
            .populate('userID', 'username')
            .populate('likes.userID', 'username profilePic');
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

        function generateRandomProfilePic() {
            return { "type": "default", "content": "#" + Math.floor(Math.random() * 16777215).toString(16) };
        }

        const posts = await this.Post.find(query)
            .populate({
                path: 'userID',
                select: 'username',
                populate: {
                    path: 'preferences',
                    match: { key: 'profilePic' },
                    select: 'value'
                }
            })
            .populate({
                path: 'comments',
                populate: {
                    path: 'userID',
                    select: 'username',
                    populate: {
                        path: 'preferences',
                        match: { key: 'profilePic' },
                        select: 'value'
                    }
                }
            })
            .sort({ timestamp: -1 })
            .skip(offset)
            .limit(limit);

        let restructuredPosts = posts.map(post => {
            let restructuredPost = this.restructureUser(post);

            restructuredPost.comments = restructuredPost.comments.map(comment => {
                if (comment.userID.profilePic) {
                    return comment;
                }
                if (comment.userID.preferences && comment.userID.preferences.length > 0) {
                    const profilePicPreference = comment.userID.preferences.find(pref => pref.key === 'profilePic');
                    if (profilePicPreference) {
                        comment.userID.profilePic = profilePicPreference.value;
                    }
                } else {
                    const randomProfilePic = generateRandomProfilePic();
                    comment.userID.profilePic = randomProfilePic;
                    this.setPreference(comment.userID._id, 'profilePic', randomProfilePic);
                }
                delete comment.userID.preferences;
                return comment;
            });

            return restructuredPost;
        });

        return restructuredPosts;
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

        const citations = await this.Citation.find()
            .populate({
                path: 'userID',
                select: 'username',
                populate: {
                    path: 'preferences',
                    match: { key: 'profilePic' },
                    select: 'value'
                }
            })
            .sort({ timestamp: -1 })
            .skip(offset)
            .populate('comments')
            .limit(limit);

        let restructuredCitations = citations.map(citation => {
            return this.restructureUser(citation);
        });

        return restructuredCitations;
    }

    restructureUser(object) {

        function generateRandomProfilePic() {
            return { "type": "default", "content": "#" + Math.floor(Math.random() * 16777215).toString(16) };
        }

        let restructuredObject = object.toObject();
        if (restructuredObject.userID){
            if (restructuredObject.userID.preferences && restructuredObject.userID.preferences.length > 0) {
                const profilePicPreference = restructuredObject.userID.preferences.find(pref => pref.key === 'profilePic');
                if (profilePicPreference) {
                    restructuredObject.userID.profilePic = profilePicPreference.value;
                }
            }
            else {
                let randomProfilePic = generateRandomProfilePic();
                restructuredObject.userID.profilePic = randomProfilePic;
                this.setPreference(restructuredObject.userID._id, 'profilePic', randomProfilePic);
            }
            delete restructuredObject.userID.preferences;
        }
        return restructuredObject;
    }

    async getCitation(citationID) {
        return await this.Citation.findById(citationID)
            .populate('userID', 'username profilePic')
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

    async setPreference(userID, key, value) {
        console.log(userID, key, value);
        const user = await this.User.findById(userID);
        const preferenceIndex = user.preferences.findIndex(pref => pref.key === key);
        if (preferenceIndex !== -1) {
            user.preferences[preferenceIndex].value = value;
        } else {
            user.preferences.push({ key, value });
        }
        return user.save();
    }

    async getPreference(userID, key) {
        const user = await this.User.findById(userID);
        const preference = user.preferences.find(pref => pref.key === key);
        return preference ? preference.value : null;
    }

    async setProfilePic(type, profilePic, username) {
        const user = await this.User.findOne({ username });
        await this.setPreference(user._id, 'profilePic', { "type": type, "content": profilePic });
        return user.save();
    }
};
