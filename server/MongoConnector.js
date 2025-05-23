const mongoose = require('mongoose');
const crypto = require('crypto');
const Schema = mongoose.Schema;
const { ObjectId } = mongoose.Types;
const { generateApiKey } = require('generate-api-key');
const config = require('../config.json');
const pushLib = require('./pushNotifications.js');

const apiKeyOptions = { method: 'string', pool: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"}

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
    permissions: [{ type: String, required: true, enum: config.permissions }],
    apiKey: { type: String, required: true },
    preferences: [{ key: { type: String, required: true }, value: { type: Object, required: true } }],
    expiration: { type: Date, required: false }
});

const citationContextSchema = new Schema({
    author: { type: String, required: true, index: true },
    content: { type: String, required: true, index: true }
});

const citationSchema = new Schema({
    userID: { type: ObjectId, ref: 'User', required: true, index: true },
    author: { type: String, required: false, index: true },
    content: { type: String, required: false, index: true },
    context: [{ type: citationContextSchema, required: false }],
    timestamp: { type: Date, default: Date.now, index: true },
    likes: [likeSchema],
    comments: [{ type: ObjectId, ref: 'Comment' }]
});

const gameSchema = new Schema({
    players: [{ type: ObjectId, ref: 'User', required: true, index: true }],
    type: { type: String, required: true },
    gameState: { type: Object, required: false },
    difficulty: { type: String, required: false },
    timestamp: { type: Date, default: Date.now },
});

const gameInviteSchema = new Schema({
    gameInfo: { url: { type: String, required: true }, name: { type: String, required: true }, description: { type: String, required: true } },
    from: { type: ObjectId, ref: 'User', required: true, index: true },
    gameID: { type: ObjectId, ref: 'Game', required: false },
    difficulty: { type: String, required: false },
    timestamp: { type: Date, default: Date.now },
});

const fileSchema = new Schema({
    filename: { type: String, required: true },
    path: { type: String, required: true },
    userID: { type: ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    valid_until: { type: Date, required: false }
});

const chatSchema = new Schema({
    members: [{ type: ObjectId, ref: 'User', required: true }],
    messages: [{ type: Object, required: true }]
});

const homeworkSchema = new Schema({
    userID: { type: ObjectId, ref: 'User', required: true },
    lesson: {
        lessonID: { type: Number, required: true },
        longName: { type: String, required: true },
        shortName: { type: String, required: true },
        lessonStart: { type: Date, required: true },
        teacher: { type: String, required: true },
    },
    until: {
        untilID: { type: Number, required: true },
        untilStart: { type: Date, required: true },
    },
    content: { type: String, required: true },
    files: [{ type: ObjectId, ref: 'File', required: false }],
    aiAnswer: { type: String, required: false },
    timestamp: { type: Date, default: Date.now }
});

// auto delete expired temporary users
userSchema.index({ "expiration": 1 }, { expireAfterSeconds: 0 });

function hashPassword(password) {
    const hash = crypto.createHash('sha256');
    hash.update(password);
    return hash.digest('hex');
}

module.exports.MongoConnector = class MongoConnector {
    constructor(database, url = "mongodb://localhost:27017", webpush) {
        this.mongoose = mongoose;
        this.url = url;
        this.connectPromise = this.mongoose.connect(this.url, { dbName: database });
        this.db = this.mongoose.connection;
        this.ws = null;
        this.ai = require('./openAI');

        this.Post = this.mongoose.model('Post', postSchema);
        this.User = this.mongoose.model('User', userSchema);
        this.Comment = this.mongoose.model('Comment', commentSchema);
        this.Citation = this.mongoose.model('Citation', citationSchema);
        this.Game = this.mongoose.model('Game', gameSchema);
        this.GameInvite = this.mongoose.model('GameInvite', gameInviteSchema);
        this.File = this.mongoose.model('File', fileSchema);
        this.Homework = this.mongoose.model('Homework', homeworkSchema);

        this.push = pushLib(this, webpush);
    }

    async createPost(userID, title, sections, permissions, type) {
        const filteredSections = sections.filter(section => section.content && section.content.trim() !== '');
        const post = new this.Post({ userID, title, sections: filteredSections, permissions, type });

        const user = await this.User.findById(userID);
        if (!user) return null;
        if (type === "news") {
            this.push.sendToEveryone("newsNotifications", 'Neue Zeitung', `Neue Zeitung: "${title}" von ${user.username}`);
        }
        else {
            this.push.sendToEveryone("postNotifications", 'Neuer Post', `Neuer Post: "${title}" von ${user.username}`);
        }


        await post.save();
        return post;
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
        await post.save();

        return post;
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
        if (!post) return null;
        post.comments.push(comment);

        const user = await this.User.findById(userID);
        if (!user) return null;

        this.push.sendToEveryone("commentNotifications", 'Neuer Kommentar', `Neuer Kommentar von ${user.username} auf "${post.title}"`);

        await post.save();
        return post;
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
        const user = new this.User({ username, passHash, permissions: permissions, apiKey: generateApiKey(apiKeyOptions) });
        return await user.save();
    }

    async createTemporaryUser() {
        const user = new this.User({
            username: 'Guest',
            passHash: hashPassword('guest'),
            permissions: ['guest'],
            apiKey: generateApiKey(apiKeyOptions),
            expiration: Date.now() + 1000 * 60 * 60 * 24 // 24 hours
        });

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

    async getPosts(isTeacher, limit = 10, offset = 0, filter = {}) {
        const filterObject = isTeacher ? { permissions: { $ne: 'classmatesonly' } } : {};
        if (offset < 0) offset = 0;

        const pipeline = [
            {
                $lookup: {
                    from: 'comments', localField: 'comments', foreignField: '_id', as: 'comments', pipeline: [
                        {
                            $lookup: {
                                from: 'users', localField: 'userID', foreignField: '_id', as: 'userID', pipeline: [
                                    { $project: { username: 1, preferences: 1 } }
                                ]
                            }
                        },
                        { $unwind: '$userID' }
                    ]
                }
            },
            { $lookup: { from: 'users', localField: 'userID', foreignField: '_id', as: 'userID', pipeline: [{ $project: { preferences: 1, username: 1 } }] } },
            { $unwind: '$userID' },
            { $skip: offset },
            { $limit: limit },
            { $addFields: { likeCount: { $size: '$likes' } } },
            { $project: { _id: 1, userID: 1, title: 1, sections: 1, permissions: 1, timestamp: 1, comments: 1, likes: 1 } }
        ];

        try {
            Object.keys(filter).forEach(key => {
                if (key === 'text') {
                    filterObject.$or = [
                        { title: { $regex: new RegExp(filter[key], 'i') } },
                        { 'sections.type': { $in: ['text', 'markdown'] }, 'sections.content': { $regex: new RegExp(filter[key], 'i') } },
                        { 'sections.type': 'file', 'sections.summary': { $regex: new RegExp(filter[key], 'i') } }
                    ];
                }
                else if (key === 'fromDate') {
                    const fromDate = new Date(filter[key]);
                    if (!isNaN(fromDate.getTime())) {
                        filterObject.timestamp = filterObject.timestamp || {};
                        filterObject.timestamp.$gte = fromDate;
                    }
                }
                else if (key === 'toDate') {
                    const toDate = new Date(filter[key]);
                    if (!isNaN(toDate.getTime())) {
                        filterObject.timestamp = filterObject.timestamp || {};
                        filterObject.timestamp.$lte = toDate;
                    }
                }
                else if (key === 'type') {
                    filterObject.type = filter[key];
                }
            });
        } catch (error) {
            return { posts: [], totalPosts: -1 };
        }

        const sortObject = { timestamp: -1 };
        Object.keys(filter).forEach(key => {
            if (key === 'time') {
                if (filter[key] === 'asc') {
                    sortObject.timestamp = 1;
                }
                else if (filter[key] === 'desc') {
                    sortObject.timestamp = -1;
                }
                else {
                    console.log('Invalid sort value for time: ' + filter[key]);
                    sortObject.timestamp = -1;
                }
            }
        });

        if (sortObject) pipeline.unshift({ $sort: sortObject });
        pipeline.unshift({ $match: filterObject });

        const posts = await this.Post.aggregate(pipeline);

        const totalPosts = await this.Post.countDocuments(filterObject);

        let restructuredPosts = posts.map(post => {
            let restructuredPost = this.restructureUser(post);

            restructuredPost.comments = restructuredPost.comments.map(comment => {
                return this.restructureUser(comment);
            });

            return restructuredPost;
        });

        return { posts: restructuredPosts, totalPosts };
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
        try {
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
            if (!restructuredPost) {
                return null;
            }

            function generateRandomProfilePic() {
                return { "type": "default", "content": "#" + Math.floor(Math.random() * 16777215).toString(16) };
            }

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
        } catch (error) {
            return null;
        }
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
        await citation.save();
        this.push.sendToEveryone("citationNotifications", 'Neues Zitat', `${author}: ${content}`);

        return citation;
    }

    async createCitationWithContext(userID, context, timestamp) {
        const citation = new this.Citation({ userID, context, timestamp: timestamp || Date.now() });
        await citation.save();
        this.push.sendToEveryone("citationNotifications", 'Neues Zitat', `${context[0].author}: ${context[0].content}` + context.length > 1 ? "..." : "");

        return citation;
    }

    /**
    * Get a number of citations from the database
    * @param {number} limit - The number of citations to get
    * @param {number} offset - The number of citations to skip
    * @param {object} filter - An object containing the filter parameters
    * @param {object} sort - An object containing the sort parameters
    * @returns {array} An array of citations
    * 
    * Possible filter parameters:
    * @param {string} text - The content or author of the citation
    * @param {string} fromDate - The date from which to get citations
    * @param {string} toDate - The date to which to get citations
    * 
    * Possible sort parameters:
    * @param {string} time - The sort order for the citations (asc or desc)
    * 
    * Example function call:
    * const citations = await db.getCitations(10, 0, { author: 'John Doe' }, { time: 'desc' });
     */
    async getCitations(limit = 10, offset = 0, filter = {}, sort = {}) {
        const filterObject = {};
        let pipeline = [
            { $lookup: { from: 'comments', localField: 'comments', foreignField: '_id', as: 'comments' } },
            { $lookup: { from: 'users', localField: 'userID', foreignField: '_id', as: 'userID', pipeline: [{ $project: { preferences: 1, username: 1 } }] } },
            { $unwind: '$userID' },
        ];

        try {
            Object.keys(filter).forEach(key => {
                if (key === 'text') {
                    filterObject.$or = [
                        { author: { $regex: new RegExp(filter[key], 'i') } },
                        { content: { $regex: new RegExp(filter[key], 'i') } },
                        { 'context.author': { $regex: new RegExp(filter[key], 'i') } },
                        { 'context.content': { $regex: new RegExp(filter[key], 'i') } }
                    ];
                }
                if (key === 'negText') {
                    // Exclude citations where author, content, context.author, or context.content matches negText
                    const negRegex = new RegExp(filter[key], 'i');
                    filterObject.$and = filterObject.$and || [];
                    filterObject.$and.push({
                        $nor: [
                            { author: { $regex: negRegex } },
                            { content: { $regex: negRegex } },
                            { 'context.author': { $regex: negRegex } },
                            { 'context.content': { $regex: negRegex } }
                        ]
                    });
                }
                else if (key === 'fromDate') {
                    filterObject.timestamp = filterObject.timestamp || {};
                    filterObject.timestamp.$gte = new Date(filter[key]);
                }
                else if (key === 'toDate') {
                    filterObject.timestamp = filterObject.timestamp || {};
                    filterObject.timestamp.$lte = new Date(filter[key]);
                }
            });
        } catch (error) {
            return { citations: [], totalCitations: -1 };
        }

        let sortObject = {};
        const key = Object.keys(sort).length > 0 ? Object.keys(sort)[0] : null;
        if (key === 'time') {
            sortObject = { timestamp: sort[key] === 'asc' ? 1 : -1 };
        }
        else if (key === 'likes') {
            sortObject = { likeCount: sort[key] === 'asc' ? 1 : -1, timestamp: -1 };
            pipeline.push({ $addFields: { likeCount: { $size: '$likes' } } });
        }
        else {
            sortObject = { timestamp: -1 };
        }

        if (sortObject != {}) pipeline.push({ $sort: sortObject });
        pipeline.push({ $match: filterObject });
        pipeline = pipeline.concat([
            { $skip: offset },
            ...(limit >= 0 ? [{ $limit: limit }] : []),
            { $project: { _id: 1, userID: 1, author: 1, content: 1, context: 1, timestamp: 1, likes: 1, comments: 1 } }
        ]);

        const citations = await this.Citation.aggregate(pipeline);

        const totalCitations = await this.Citation.countDocuments(filterObject);

        let restructuredCitations = citations.map(citation => {
            return this.restructureUser(citation);
        });

        return { citations: restructuredCitations, totalCitations };
    }

    restructureUser(object) {
        try {
            if (!object) {
                console.log('Object is null!');
                return null;
            }
            if (object.userID.profilePic && !object.userID.preferences) {
                return object;
            }
            function generateRandomProfilePic() {
                console.log('Generating random profile pic');
                return { "type": "default", "content": "#" + Math.floor(Math.random() * 16777215).toString(16) };
            }
            if (object.userID) {
                const profilePicPreference = object.userID.preferences.find(pref => pref.key === 'profilePic');
                if (profilePicPreference) {
                    object.userID.profilePic = profilePicPreference.value;
                    delete object.userID.preferences;

                    return object;
                }
            }
            object.userID.profilePic = generateRandomProfilePic();
            this.setPreference(object.userID._id, 'profilePic', object.userID.profilePic);

            delete object.userID.preferences;
            return object;
        }
        catch {

        }
    }

    async getCitation(citationID) {
        return await this.Citation.findById(citationID)
            .populate('userID', 'username profilePic')
    }

    async deleteCitation(citationID) {
        const citation = await this.Citation.findByIdAndDelete(citationID);

        return citation;
    }

    async updateCitation(citationID, context) {
        try {
            const citation = await this.Citation.findById(citationID);
            citation.context = context;
            await citation.save();

            return citation;
        } catch (error) {
            return null;
        }
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

    async getAllSubscriptions(type) {
        if (type == "urgent") return await this.User.find({ pushSubscription: { $exists: true } });
        if (typeof type !== "undefined") return await this.User.find({ pushSubscription: { $exists: true }, preferences: { $elemMatch: { key: type, value: true } } });

        return await this.User.find({ pushSubscription: { $exists: true } });
    }

    async setPreference(userID, key, value) {
        try {
            const user = await this.User.findById(userID);
            if (!user) return null;
            if (!user.preferences) {
                user.preferences = [];
            }
            const preferenceIndex = user.preferences.findIndex(pref => pref.key === key);
            if (preferenceIndex !== -1) {
                user.preferences[preferenceIndex].value = value;
            } else {
                user.preferences.push({ key, value });
            }
            return user.save();
        }
        catch (error) {
            return null;
        }
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
        if (!user) return null;
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
        const authors = await this.Citation.aggregate([
            { $unwind: "$context" },
            { $group: { _id: "$context.author", count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } },
            { $project: { _id: 0, author: "$_id", count: 1 } },
            { $sort: { count: -1, author: 1 } }
        ]);
        return authors.map(author => author.author);
    }

    async createGame(players, type, gameState, difficulty = null) {

        players = players.map(id => new ObjectId(id));

        if (difficulty) {
            const game = new this.Game({ players, type, gameState, difficulty });
            return await game.save();
        }
        else {
            const game = new this.Game({ players, type, gameState });
            return await game.save();
        }
    }

    async getGame(gameID) {
        try {
            return await this.Game.findById(gameID);
        }
        catch (error) {
            return null;
        }
    }

    async getGamesFromUsers(userIDs, type, difficulty = null) {
        if (difficulty) {
            return await this.Game.find({
                players: {
                    $size: userIDs.length,
                    $all: userIDs.map(id => new ObjectId(id))
                },
                type: type,
                difficulty: difficulty
            });
        } else {
            return await this.Game.find({
                players: {
                    $size: userIDs.length,
                    $all: userIDs.map(id => new ObjectId(id))
                },
                type: type
            });
        }
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

    async getPostViews(postID) {
        const post = await this.Post.findById(postID).populate('viewedBy', 'username profilePic');
        return post.viewedBy.map(user => ({
            id: user._id,
            username: user.username,
            profilePic: user.profilePic
        }));
    }

    async createFileEntry(userID, filename, path, type, valid_until = undefined) {
        const file = new this.File({ filename, path, type, userID, valid_until });
        return await file.save();
    }

    async deleteFileEntry(path) {
        return await this.File.findOneAndDelete({ path });
    }

    async clearCollections() {
        const collections = await this.mongoose.connection.db.collections();
        for (let collection of collections) {
            await collection.deleteMany({});
        }
    }

    async disconnect() {
        await this.mongoose.connection.close();
    }

    async getMostCitationsByUser(timespan) {
        let matchStage = {};

        if (timespan) {
            const now = new Date();
            switch (timespan) {
                case 'day':
                    matchStage = {
                        timestamp: {
                            $gte: new Date(now.setHours(0, 0, 0, 0))
                        }
                    };
                    break;
                case 'week':
                    const lastWeek = new Date(now.setDate(now.getDate() - 7));
                    matchStage = {
                        timestamp: { $gte: lastWeek }
                    };
                    break;
                case 'month':
                    const lastMonth = new Date(now.setMonth(now.getMonth() - 1));
                    matchStage = {
                        timestamp: { $gte: lastMonth }
                    };
                    break;
            }
        }

        const pipeline = [];
        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }

        pipeline.push(
            { $group: { _id: "$userID", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: "$user" },
            { $project: { username: "$user.username", count: 1 } },
            { $sort: { count: 1 } }
        );

        const citations = await this.Citation.aggregate(pipeline);
        return citations;
    }

    async getMostCitationsByCitiated(timespan) {
        let matchStage = {};

        if (timespan) {
            const now = new Date();
            switch (timespan) {
                case 'day':
                    matchStage = {
                        timestamp: {
                            $gte: new Date(now.setHours(0, 0, 0, 0))
                        }
                    };
                    break;
                case 'week':
                    const lastWeek = new Date(now.setDate(now.getDate() - 7));
                    matchStage = {
                        timestamp: { $gte: lastWeek }
                    };
                    break;
                case 'month':
                    const lastMonth = new Date(now.setMonth(now.getMonth() - 1));
                    matchStage = {
                        timestamp: { $gte: lastMonth }
                    };
                    break;
            }
        }

        const pipeline = [];
        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }

        pipeline.push(
            { $unwind: "$context" },
            { $group: { _id: "$context.author", count: { $sum: 1 } } },
            { $sort: { count: -1 } }, // sort by count in descending order to get most citations first
            { $limit: 10 }, // limit output to 10
            { $sort: { count: 1 } } // reverse sort order again for better display
        );

        const citations = await this.Citation.aggregate(pipeline);
        return citations;
    }

    async getCitationsOverTime(username, timespan) {

        let pattern = [];
        const now = new Date();

        switch (timespan) {
            case 'day':
                pattern.push({
                    $group: {
                        _id: {
                            hour: { $hour: "$timestamp" },
                            day: { $dayOfMonth: "$timestamp" },
                            month: { $month: "$timestamp" },
                            year: { $year: "$timestamp" }
                        },
                        count: { $sum: 1 }
                    }
                });
                break;
            case 'week':
                pattern.push({
                    $group: {
                        _id: {
                            day: { $dayOfMonth: "$timestamp" },
                            month: { $month: "$timestamp" },
                            year: { $year: "$timestamp" }
                        },
                        count: { $sum: 1 }
                    }
                });
                break;
            case 'month':
                pattern.push({
                    $group: {
                        _id: {
                            day: { $dayOfMonth: "$timestamp" },
                            month: { $month: "$timestamp" },
                            year: { $year: "$timestamp" }
                        },
                        count: { $sum: 1 }
                    }
                });
                break;
            default: // Empty timespan or any other value
                pattern.push({
                    $group: {
                        _id: {
                            month: { $month: "$timestamp" },
                            year: { $year: "$timestamp" }
                        },
                        count: { $sum: 1 }
                    }
                });
                break;
        }

        if (username) {
            const user = await this.User.findOne({ username });
            if (!user) return [];
            pattern.unshift({
                $match: timespan ? {
                    userID: user._id,
                    timestamp: {
                        $gte: timespan === 'day' ? new Date(now.getTime() - 24 * 60 * 60 * 1000) :
                            timespan === 'week' ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) :
                                timespan === 'month' ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) :
                                    new Date(0) // Get all citations if timespan is empty
                    }
                } : { userID: user._id } // No timestamp filter if timespan is empty
            });
        } else if (timespan) {
            pattern.unshift({
                $match: {
                    timestamp: {
                        $gte: timespan === 'day' ? new Date(now.getTime() - 24 * 60 * 60 * 1000) :
                            timespan === 'week' ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) :
                                timespan === 'month' ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) :
                                    new Date(0) // Get all citations if timespan is empty
                    }
                }
            });
        }

        pattern.push({ $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } });

        const citations = await this.Citation.aggregate(pattern);

        return citations.map(citation => ({
            _id: new Date(
                citation._id.year,
                citation._id.month - 1,
                citation._id.day || 1,
                citation._id.hour || 0
            ).getTime(),
            count: citation.count
        }));
    }

    async createHomework(userID, lesson, untilLesson, content, files, id = null) {
        const lessonID = lesson.id;
        const start = lesson.start;
        const longname = lesson.subjects[0].element.longName;
        const name = lesson.subjects[0].element.name;
        const teacher = lesson.teachers[0].element.name;

        const lessonElement = {
            lessonID,
            longName: longname,
            shortName: name,
            lessonStart: start,
            teacher: teacher,
        }

        const untilID = untilLesson.id;
        const untilStart = untilLesson.start;
        const untilElement = {
            untilID,
            untilStart,

        }

        try {
            files = await Promise.all(files.map(async file => {
                return await this.File.findOne({ $or: [{ _id: new ObjectId(Number(file)) }, { path: file }] });
            }));
        }
        catch (error) {
            console.log('Error while fetching files for homework: ' + error);
            return null;
        }

        //if editing existing homework entry
        if (id) {
            const homework = await this.Homework.findById(id);
            homework.lesson = lessonElement;
            homework.until = untilElement;
            homework.content = content;
            homework.files = files;
            await homework.save();
            this.openAiDoHomework(homework);
            return homework;
        }

        const homework = new this.Homework({ userID, lesson: lessonElement, until: untilElement, content, files });
        await homework.save();
        this.openAiDoHomework(homework);
        return homework;
    }

    async openAiDoHomework(homework) {
        const content = homework.content;
        const lesson = homework.lesson;
        const files = homework.files;
        this.ai.doHomework(content, files, lesson.longName).then(response => {
            homework.aiAnswer = response;
            homework.save();
        })
    }


    async getHomeworks() {
        let homework = await this.Homework.find().populate({
            path: 'userID',
            select: 'username',
            populate: {
                path: 'preferences',
                match: { key: 'profilePic' },
                select: 'value'
            }
        }).populate({
            path: 'files',
            select: 'filename path'
        })
            .lean()

        const restructuredHomework = homework.map(hw => {
            return this.restructureUser(hw);
        });
        return restructuredHomework;
    }

    async getHomework(id) {
        return await this.Homework.findById(id);
    }

    async deleteHomework(id) {
        return await this.Homework.findByIdAndDelete(id);
    }
};
