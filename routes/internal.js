const { Router } = require('express');
const multer = require("multer");
const multerS3 = require("multer-s3");
const { MongoConnector } = require('../MongoConnector');
const router = Router();
const oneDay = 24 * 3600 * 1000

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @param {multer} s3Client - The s3 client instance.
 * @returns {Router} The router instance.
 */

function generateRandomFilename() {
    const length = 20;
    const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

module.exports = (db, s3Client) => {
    router.get('/', (req, res) => {
        res.send("This is the API endpoint");
    });

    router.post('/login', async (req, res) => {
        const { username, password } = req.body;
        const user = await db.checkLogin(username, password);
        if (!user) {
            return res.status(401).send("Invalid Username or Password");
        }
        else {
            req.session.username = user.username;
            req.session.userID = user._id;
            req.session.type = user.type;
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

    router.post('/createPost', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (req.session.type !== "admin" && req.session.type !== "writer") return res.status(403).send("You cannot create a post");

        const { title, content, type, permissions } = req.body;
        const post = await db.createPost(req.session.userID, title, content, type, permissions);
        return res.status(200).send(post);
    });

    function uploadFile(req, res, directory = "", forceFormats = []) {
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




    router.post("/upload", async function (req, res) { //for testing
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (req.session.type !== "admin") return res.status(403).send("You cannot upload a file");

        let filename;
        try {
            filename = await uploadFile(req, res, "test");
        } catch (error) {
            return res.status(500).send(error.message);
        }
        console.log(`new filename: ${filename}`);

        return res.status(200).send("File uploaded successfully");

    });

    router.post('/createTextPost', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (req.session.type !== "admin" && req.session.type !== "writer") return res.status(403).send("You cannot create a post");

        const { title, content, teachersafe } = req.body;
        const post = await db.createPost(req.session.userID, title, content, "text", teachersafe ? "Teachersafe" : "classmatesonly");
        return res.status(200).redirect('/');
    });

    router.post('/createPDFPost', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (req.session.type !== "admin" && req.session.type !== "writer") return res.status(403).send("You cannot create a post");

        let filename;
        try {
            filename = await uploadFile(req, res, "posts", ["pdf"]);
        } catch (error) {
            return res.status(500).send(error.message);
        }
        const { title, teachersafe } = req.body;

        const post = await db.createPost(req.session.userID, title, filename, "pdf", teachersafe ? "Teachersafe" : "classmatesonly");
        return res.status(200).redirect('/');
    });

    router.post('/createImagePost', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (req.session.type !== "admin" && req.session.type !== "writer") return res.status(403).send("You cannot create a post");

        let filename;
        try {
            filename = await uploadFile(req, res, "posts", ["png", "jpg", "jpeg", "gif", "webp"]);
        } catch (error) {
            return res.status(500).send(error.message);
        }
        const { title, teachersafe } = req.body;

        const post = await db.createPost(req.session.userID, title, filename, "img", teachersafe ? "Teachersafe" : "classmatesonly");
        return res.status(200).redirect('/');
    })

    router.get('/getPost/:postID', async (req, res) => {
        const post = await db.getPost(req.params.postID);
        return res.status(200).send(post);
    })

    router.get('/getPosts', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const isTeacher = req.session.type === "teacher";

        const page = req.query.page || 0;

        pageSize = 10;
        const posts = await db.getPosts(isTeacher, pageSize, pageSize * page);
        return res.status(200).send(posts);
    });

    return router;
}