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

    function uploadFile(req, res, directory = "") {
        return new Promise((resolve, reject) => {
            const filename = generateRandomFilename();

            const s3upload = multer({
                storage: multerS3({
                    s3: s3Client,
                    bucket: "transmitterstorage",
                    acl: "public-read",
                    key: function (request, file, cb) {
                        const fileExtension = file.originalname.split('.').pop();
                        let newFilename;

                        if (directory !== "") {
                            newFilename = `${directory}/${filename}.${fileExtension}`;
                        } else {
                            newFilename = `${filename}.${fileExtension}`;
                        }

                        cb(null, newFilename);
                    },
                }),
            }).array("upload", 1);

            s3upload(req, res, function (error) {
                if (error) {
                    console.error(error);
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



    router.post("/upload", async function (req, res) {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (req.session.type !== "admin" && req.session.type !== "writer") return res.status(403).send("You cannot upload a file");

        const filename = await uploadFile(req, res, "test");
        console.log(`new filename: ${filename}`);

        return res.status(200).send("File uploaded successfully");

    });

    return router;
}