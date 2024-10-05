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
 * @param {number} pageSize - The number of posts per page.
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

module.exports = (db, s3Client, pageSize) => {
    router.get('/', (req, res) => {
        res.send("This is the interal API, it is not meant to be accessed directly. On the /api route you can find the public API.");
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




    router.post("/uploadFile", async function (req, res) {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (req.session.type !== "admin" && req.session.type !== "writer") return res.status(403).send("You cannot upload an image");

        let filename;
        try {
            filename = await uploadFile(req, res, "files");
        } catch (error) {
            return res.status(500).send(error.message);
        }
        console.log(`File uploaded Successfully: ${filename}`);
        return res.status(200).send(filename);
    })

    router.post('/uploadImage', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (req.session.type !== "admin" && req.session.type !== "writer") return res.status(403).send("You cannot upload an image");

        let filename;
        try {
            filename = await uploadFile(req, res, "images", ["jpg", "jpeg", "png", "webp", "heic"]);
        } catch (error) {
            return res.status(500).send(error.message);
        }
        console.log(`Image uploaded Successfully: ${filename}`);
        return res.status(200).send(filename);
    })

    router.post('/createPost', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (req.session.type !== "admin" && req.session.type !== "writer") return res.status(403).send("You cannot create a post");

        const { title, sections, permissions } = req.body;
        const permissionsBool = permissions === "true";
        console.log(title, sections, permissions);
        
        if (!title || !sections) return res.status(400).send("Missing parameters");
        if (typeof title !== "string" || typeof sections !== "string") return res.status(400).send("Invalid parameters");

        await db.createPost(req.session.userID, title, JSON.parse(sections), permissionsBool ? "Teachersafe" : "classmatesonly");
        return res.status(200).send("Success");
    });

    router.get('/getPosts', async (req, res) => {

        let isTeacher = true;
        if (!req.session.userID) {
            isTeacher = true;
        }
        else {
            isTeacher = req.session.type === "teacher";
        }

        const page = (req.query.page || 1) - 1;

        const posts = await db.getPosts(isTeacher, pageSize, pageSize * page);
        return res.status(200).send(posts);
    });

    return router;
}