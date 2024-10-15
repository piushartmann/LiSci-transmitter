const { Router } = require('express');
const multer = require("multer");
const multerS3 = require("multer-s3");
const { MongoConnector } = require('../../MongoConnector');
const sanitizeHtml = require('sanitize-html');
const router = Router();

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

    router.post("/uploadFile", async function (req, res) {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        if (!req.session.permissions.includes("admin") && !req.session.permissions.includes("writer")) return res.status(403).send("You cannot upload an image");

        let filename;
        try {
            filename = await uploadFile(req, res, "files", s3Client);
        } catch (error) {
            return res.status(500).send(error.message);
        }
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
        return res.status(200).send(filename);
    })

    return router;
};