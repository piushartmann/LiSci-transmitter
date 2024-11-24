const mongoose = require('mongoose');
const crypto = require('crypto');
const Schema = mongoose.Schema;
const { ObjectId } = mongoose.Types;
const { generateApiKey } = require('generate-api-key');
const { title } = require('process');
const { type } = require('os');
const { query } = require('express');


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
    content: { type: String, required: true },
    summary: { type: String, required: false },
    title: { type: String, required: false },
    size: { type: Number, required: false }
});

const postSchema = new Schema({
    userID: { type: ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    type: { type: String, required: true, default: 'post', enum: ['post', 'news'] },
    sections: [{ type: sectionSchema, required: true }],
    permissions: { type: String, required: true, enum: ['classmatesonly', 'Teachersafe'] },
    timestamp: { type: Date, default: Date.now },
    comments: [{ type: ObjectId, ref: 'Comment' }],
    viewedBy: [{ type: ObjectId, ref: 'User' }],
    likes: [likeSchema],
});

const userSchema = new Schema({
    username: { type: String, required: true, index: true, unique: true },
    passHash: { type: String, required: true },
    pushSubscription: { type: Object, required: false },
    permissions: [{ type: String, required: true, enum: ['classmate', 'writer', 'admin', 'push', 'canPost', 'games'] }],
    apiKey: { type: String, required: true },
    preferences: [{ key: { type: String, required: true }, value: { type: Object, required: true } }]
});

const citationContextSchema = new Schema({
    author: { type: String, required: true },
    content: { type: String, required: true }
});

const citationSchema = new Schema({
    userID: { type: ObjectId, ref: 'User', required: true, index: true },
    author: { type: String, required: false },
    content: { type: String, required: false },
    context: [{ type: citationContextSchema, required: false }],
    timestamp: { type: Date, default: Date.now },
    likes: [likeSchema],
    comments: [{ type: ObjectId, ref: 'Comment' }]
});

const gameSchema = new Schema({
    players: [{ type: ObjectId, ref: 'User', required: true, index: true }],
    type: { type: String, required: true },
    gameState: { type: Object, required: false },
    timestamp: { type: Date, default: Date.now },
});

const gameInviteSchema = new Schema({
    gameInfo: { url: { type: String, required: true }, name: { type: String, required: true }, description: { type: String, required: true } },
    from: { type: ObjectId, ref: 'User', required: true, index: true },
    gameID: { type: ObjectId, ref: 'Game', required: false },
    timestamp: { type: Date, default: Date.now },
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
        this.Game = this.mongoose.model('Game', gameSchema);
        this.GameInvite = this.mongoose.model('GameInvite', gameInviteSchema);
    }

    async dropDatabase() { //be careful intended for debugging
        await this.mongoose.connection.dropDatabase();
    }

    async createPost(userID, title, sections, permissions, type) {
        const filteredSections = sections.filter(section => section.content && section.content.trim() !== '');
        const post = new this.Post({ userID, title, sections: filteredSections, permissions, type });
        return await post.save();
    }

    async deletePost(postID) {
        return await this.Post.findByIdAndDelete(postID);
    }

    async updatePost(postID, title, sections, permissions, type) {
        const post = await this.Post.findById(postID);
        post.title = title;
        post.sections = sections;
        post.permissions = permissions;
        post.type = type;
        return await post.save();
    }

    async addSummaryToSection(postID, sectionIndex, summary) {
        const post = await this.Post.findById(postID);
        post.sections[sectionIndex].summary = summary;
        return await post.save();
    }

    async addTitleToSection(postID, sectionIndex, title) {
        const post = await this.Post.findById(postID);
        post.sections[sectionIndex].title = title;
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

    async likeCitation(citationID, userID) {
        const citation = await this.Citation.findById(citationID);
        const hasLiked = citation.likes.some(like => like.userID.equals(userID));

        if (hasLiked) {
            citation.likes = citation.likes.filter(like => !like.userID.equals(userID));
            await citation.save();
            return { success: true, message: 'Like removed successfully!' };
        }

        citation.likes.push({ userID, date: Date.now() });
        await citation.save();

        return { success: true, message: 'Citation liked successfully!' };
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

    async getUser(username) {
        const user = await this.User.findOne({ username })
            .populate('preferences');
        return user;
    }

    async getUserByID(userID) {
        const user = await this.User.findById(userID)
            .populate('preferences');
        return user;
    }

    async getUserPermissions(userID) {
        const user = await this.User.findById(userID);
        if (!user) return [];
        return user.permissions;
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

    async getPosts(isTeacher, limit = 10, offset = 0, filter = "all") {
        const query = isTeacher ? { permissions: { $ne: 'classmatesonly' } } : {};

        if (filter !== "all") {
            query.type = filter;
        }

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

    async markPostAsRead(userID, postID) {
        const post = await this.Post.findById(postID);
        if (!post) {
            console.log('Post with ID ' + postID + ' not found!');
            return;
        }
        if (!post.viewedBy) {
            post.viewedBy = [userID];
            return await post.save();
        }
        if (!post.viewedBy.includes(userID)) {
            post.viewedBy.push(userID);
            return await post.save();
        }
        return await post.save();
    }

    async getPost(postID) {
        const post = await this.Post.findById(postID)
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
            .sort({ timestamp: -1 });

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
    }


    async getPostNumber(isTeacher, filter = "all") {
        const query = isTeacher ? { permissions: { $ne: 'classmatesonly' } } : {};
        if (filter !== "all") {
            query.type = filter;
        }
        return await this.Post.countDocuments(query);
    }

    async getNewsNumber(isTeacher) {
        const query = isTeacher ? { permissions: { $ne: 'classmatesonly' }, type: 'news' } : { type: 'news' };
        return await this.Post.countDocuments(query);
    }

    async getCitationNumber() {
        return await this.Citation.countDocuments();
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

    async createCitationWithContext(userID, context, timestamp) {
        const citation = new this.Citation({ userID, context, timestamp: timestamp || Date.now() });
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
        if (restructuredObject.userID) {
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

    async getAllSubscriptions() {
        return await this.User.find({ pushSubscription: { $exists: true } });
    }

    async setPreference(userID, key, value) {
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
        if (!user) {
            return null;
        }
        const preference = user.preferences.find(pref => pref.key === key);
        return preference ? preference.value : null;
    }

    async getPreferences(userID) {
        const user = await this.User.findById(userID);
        return user.preferences;
    }

    async setProfilePic(type, profilePic, username) {
        const user = await this.User.findOne({ username });
        await this.setPreference(user._id, 'profilePic', { "type": type, "content": profilePic });
        return user.save();
    }

    async getAllUsers() {
        return await this.User.find();
    }

    async updateUserData(userID, username, password, permissions, preferences) {
        const user = await this.User.findById(userID);
        if (username) user.username = username;
        if (password) user.passHash = hashPassword(password);
        if (permissions) user.permissions = permissions;
        if (preferences) user.preferences = preferences;
        return await user.save();
    }

    async getPreviousAuthors() {
        return await this.Citation.distinct('author');
    }

    async createGame(players, type, gameState) {

        players = players.map(id => new ObjectId(id));

        const game = new this.Game({ players, type, gameState });
        return await game.save();
    }

    async getGame(gameID) {
        try {
            return await this.Game.findById(gameID);
        }
        catch (error) {
            return null;
        }
    }

    async getGamesFromUsers(userIDs, type) {
        return await this.Game.find({
            players: {
                $size: userIDs.length,
                $all: userIDs.map(id => new ObjectId(id))
            },
            type: type
        });
    }

    async deleteGame(gameID) {
        return await this.Game.findByIdAndDelete(gameID);
    }

    async updateGameState(gameID, gameState) {
        const game = await this.Game.findById(gameID);
        game.gameState = gameState;
        return await game.save();
    }

    async newInvite(gameInfo, userID) {
        const invite = new this.GameInvite({ gameInfo, from: userID });
        return await invite.save();
    }

    async getInvite(inviteID) {
        try {
            return await this.GameInvite.findById(inviteID);
        }
        catch (error) {
            return null;
        }
    }

    async setInviteGameID(inviteID, gameID) {
        try {
            const invite = await this.GameInvite.findById(inviteID);
            invite.gameID = gameID;
            return await invite.save();
        }
        catch (error) {
            return null;
        }
    }
};
