const { Router } = require('express');
const multer = require("multer");
const multerS3 = require("multer-s3");
const { MongoConnector } = require('../MongoConnector');
const sanitizeHtml = require('sanitize-html');
const router = Router();
const oneDay = 24 * 3600 * 1000

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {multer} s3Client - The s3 client instance.
 * @returns {Router} The router instance.
 */

sanitizeHtmlAllowedTags = sanitizeHtml.defaults.allowedTags.concat(['img', 'embed', 'iframe']);

function generateRandomFilename() {
    const length = 20;
    const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function uploadFile(req, res, directory = "", s3Client, forceFormats = []) {
    return new Promise((resolve, reject) => {
        const filename = generateRandomFilename();

        const s3upload = multer({
            storage: multerS3({
                s3: s3Client,
                bucket: "transmitterstorage",
                acl: "public-read",
                contentType: multerS3.AUTO_CONTENT_TYPE,
                contentDisposition: "inline",
                key: function (request, file, cb) {
                    const fileExtension = file.originalname.split('.').pop().toLowerCase();

                    if (forceFormats.length > 0 && !forceFormats.includes(fileExtension.toLowerCase())) {
                        return cb(new Error(`Invalid file format. Expected format(s): ${forceFormats.join(', ')}`), null);
                    }

                    // Generate the filename for S3 storage
                    let newFilename;
                    if (directory !== "") {
                        newFilename = `${directory}/${filename}.${fileExtension}`;
                    } else {
                        newFilename = `${filename}.${fileExtension}`;
                    }

                    cb(null, newFilename);
                },
                contentDisposition: "inline",
            }),
        }).array("upload", 1);

        // Execute the upload
        s3upload(req, res, function (error) {
            if (error) {
                console.error("File upload error:", error.message);
                reject(error);
            } else {
                if (req.files && req.files.length > 0) {
                    resolve(req.files[0].key);
                } else {
                    reject(new Error("No files uploaded"));
                }
            }
        });
    });
}

module.exports = (db, s3Client) => {
    const config = require('../config.json');
    const postsPageSize = config.postsPageSize;
    const citationsPageSize = config.citationsPageSize;

    router.get('/', (req, res) => {
        res.send("This is the interal API, it is not meant to be accessed directly. On the /api route you can find the public API.");
    });

    router.post('/login', async (req, res) => {
        const { username, password } = req.body;
        const user = await db.checkLogin(username, password);
        if (!user) {
            return res.status(401).redirect('/');
        }
        else {
            req.session.username = user.username;
            req.session.userID = user._id;
            req.session.permissions = user.permissions;
            req.session.cookie.expires = new Date(Date.now() + oneDay * 30);
            res.status(200).redirect('/');
        }
    });

    router.get('/logout', async (req, res) => {
        req.session.destroy();
        res.status(200).redirect('/');
    });

    router.get('/checkLogin', async (req, res) => { //for testing
        if (!req.session.userID) {
            return res.status(401).send("Not logged in");
        }
        return res.status(200).send("Logged in");
    });

    router.post("/uploadFile", async function (req, res) {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (!req.session.permissions.includes("admin") && !req.session.permissions.includes("writer")) return res.status(403).send("You cannot upload an image");

        let filename;
        try {
            filename = await uploadFile(req, res, "files", s3Client);
        } catch (error) {
            return res.status(500).send(error.message);
        }
        console.log(`File uploaded Successfully: ${filename}`);
        return res.status(200).send(filename);
    })

    router.post('/uploadImage', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (!req.session.permissions.includes("admin") && !req.session.permissions.includes("writer")) return res.status(403).send("You cannot upload a File");

        let filename;
        try {
            filename = await uploadFile(req, res, "images", s3Client, ["jpg", "jpeg", "png", "webp", "heic"]);
        } catch (error) {
            return res.status(500).send(error.message);
        }
        console.log(`Image uploaded Successfully: ${filename}`);
        return res.status(200).send(filename);
    })

    router.post('/createPost', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (!req.session.permissions.includes("admin") && !req.session.permissions.includes("writer")) return res.status(403).send("You cannot create a post");

        const { title, sections, permissions } = req.body;
        const permissionsBool = permissions === "true";
        console.log(title, sections, permissions);

        if (!title || !sections) return res.status(400).send("Missing parameters");
        if (typeof title !== "string" || typeof sections !== "string") return res.status(400).send("Invalid parameters");

        await db.createPost(req.session.userID, title, JSON.parse(sections), permissionsBool ? "Teachersafe" : "classmatesonly");
        return res.status(200).send("Success");
    });

    router.post('/updatePost', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (!req.session.permissions.includes("admin") && !req.session.permissions.includes("writer")) return res.status(403).send("You cannot update a post");

        const { postID, title, sections, permissions } = req.body;
        const permissionsBool = permissions === "true";
        console.log(postID, title, sections, permissions);

        if (!postID || !title || !sections) return res.status(400).send("Missing parameters");
        if (typeof postID !== "string" || typeof title !== "string" || typeof sections !== "string") return res.status(400).send("Invalid parameters");

        await db.updatePost(postID, title, JSON.parse(sections), permissionsBool ? "Teachersafe" : "classmatesonly");
        return res.status(200).send("Success");
    })

    router.get('/getPosts', async (req, res) => {
        const permissions = req.session.permissions || [];
        const isTeacher = !(permissions.includes("classmate"));
        const page = (req.query.page || 1) - 1;

        const posts = await db.getPosts(isTeacher, postsPageSize, postsPageSize * page);
        let filteredPosts = [];
        if (req.session.permissions.includes("admin") || req.session.permissions.includes("writer")) {
            posts.forEach(post => {
                let postObj = post.toObject();
                postObj.canEdit = true;
                filteredPosts.push(postObj);
            });
            return res.status(200).send(filteredPosts);
        }
        return res.status(200).send(posts);
    });

    router.get('/getPost/:id', async (req, res) => {
        const post = await db.getPost(req.params.id);
        const permissions = req.session.permissions || [];
        if (!(permissions.includes("classmate")) && post.permissions === "classmatesonly") return res.status(403).send("You cannot view this post");

        if (!post) {
            return res.status(404).send("Post not found");
        }
        return res.status(200).send(post);
    });

    router.post('/deletePost', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { postID } = req.body;
        if (!postID) return res.status(400).send("Missing parameters");
        if (typeof postID !== "string") return res.status(400).send("Invalid parameters");

        const post = await db.getPost(postID);
        if (post.userID.toString() !== req.session.userID && !(req.session.permissions.includes("admin"))) return res.status(403).send("You cannot delete this post");

        await db.deletePost(postID);
        return res.status(200).send("Success");
    })

    router.post('/createCitation', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { author, content } = req.body;
        console.log(author, content);
        if (!author || !content) return res.status(400).send("Missing parameters");
        if (typeof author !== "string" || typeof content !== "string") return res.status(400).send("Invalid parameters");

        await db.createCitation(req.session.userID, author, content);
        return res.status(200).redirect('/citations');
    });

    router.get('/getCitations', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (!(req.session.permissions.includes("classmate"))) return res.status(403).send("You cannot get this data");

        const page = (req.query.page || 1) - 1;

        const citations = await db.getCitations(citationsPageSize, citationsPageSize * page);

        let filteredCitations = [];

        citations.forEach(citation => {
            let citationObj = citation.toObject();
            if (citation.userID.id.toString() === req.session.userID || req.session.permissions.includes("admin")) {
                citationObj.canEdit = true;
            } else {
                citationObj.canEdit = false;
            }
            filteredCitations.push(citationObj);
        });

        return res.status(200).send(filteredCitations);
    });


    router.post('/deleteCitation', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { citationID } = req.body;

        if (!citationID) return res.status(400).send("Missing parameters");
        if (typeof citationID !== "string") return res.status(400).send("Invalid parameters");

        const citation = await db.getCitation(citationID);
        if (citation.userID.id.toString() !== req.session.userID && !(req.session.permissions.includes("admin"))) return res.status(403).send("You cannot delete this citation");

        await db.deleteCitation(citationID);

        return res.status(200).send("Success");
    });

    router.post('/updateCitation', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const { citationID, author, content } = req.body;
        console.log(citationID, author, content);

        if (!citationID || !author || !content) return res.status(400).send("Missing parameters");
        if (typeof citationID !== "string" || typeof author !== "string" || typeof content !== "string") return res.status(400).send("Invalid parameters");

        const citation = await db.getCitation(citationID);
        if (citation.userID.toString() !== req.session.userID && !(req.session.permissions.includes("admin"))) return res.status(403).send("You cannot update this citation");

        await db.updateCitation(citationID, author, content);
        return res.status(200).send("Success");
    });

    router.post('/pushSubscribe', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const subscription = req.body;
        console.log(subscription);

        await db.setSubscription(req.session.userID, subscription);
        return res.status(200).send("Success");
    });

    return router;
}