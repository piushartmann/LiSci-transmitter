const { Router } = require('express');
const multer = require("multer");
const multerS3 = require("multer-s3");
const { MongoConnector } = require('../../server/MongoConnector');
const sanitizeHtml = require('sanitize-html');
const router = Router();
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
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


module.exports = (db, s3Client) => {

    const config = require('../../config.json');

    /**
     * Uploads a file to an S3 bucket using multer and multerS3.
     *
     * @param {Object} req - The request object.
     * @param {Object} res - The response object.
     * @param {string} [directory=""] - The directory path within the S3 bucket where the file will be stored. e.g "images" or "posts".
     * @param {string[]} [forceFormats=[]] - An array of allowed file formats. If provided, only files with these formats will be accepted.
     * @returns {Promise<string>} - A promise that resolves with the S3 key of the uploaded file, or rejects with an error.
     */
    function uploadFile(req, res, directory = "", forceFormats = [], registerFile = true) {
        return new Promise((resolve, reject) => {
            const filename = generateRandomFilename();
            let s3Path;

            const s3upload = multer({
                storage: multerS3({
                    s3: s3Client,
                    bucket: "transmitterstorage",
                    acl: "public-read",
                    contentType: multerS3.AUTO_CONTENT_TYPE,
                    contentDisposition: "inline",
                    cacheControl: "max-age=31536000",
                    key: function (request, file, cb) {
                        const fileExtension = file.originalname.split('.').pop().toLowerCase();

                        if (forceFormats.length > 0 && !forceFormats.includes(fileExtension.toLowerCase())) {
                            return cb(new Error(`Invalid file format. Expected format(s): ${forceFormats.join(', ')}`), null);
                        }

                        // Generate the filename for S3 storage
                        if (directory !== "") {
                            s3Path = `${directory}/${filename}.${fileExtension}`;
                        } else {
                            s3Path = `${filename}.${fileExtension}`;
                        }

                        cb(null, s3Path);
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
                        if (registerFile) registerFileInDB(req.session.userID, req.files[0].key, s3Path, directory);
                        resolve(req.files[0].key);
                    } else {
                        reject(new Error("No files uploaded"));
                    }
                }
            });
        });
    }

    async function registerFileInDB(userID, filename, path, type) {
        try {
            const entry = await db.createFileEntry(userID, filename, path, type)
            console.log("File registered in database:", filename);
            return entry;
        }
        catch (error) {
            console.error("Error registering file in database:", error);
            return null;
        }
    }

    function deleteFile(path) {
        return new Promise((resolve, reject) => {
            s3Client.send(new DeleteObjectCommand({
                Bucket: "transmitterstorage",
                Key: path
            })).then(() => {
                console.log("File deleted from S3");
                db.deleteFileEntry(path);
                resolve();
            }).catch((error) => {
                console.error("Error deleting file from S3:", error);
                reject(error);
            });
        });
    }


    router.post("/uploadFile", async function (req, res) {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!permissions.includes("admin") && !permissions.includes("writer") && !permissions.includes("canPost")) return res.status(403).send("You cannot upload an image");

        let filename;
        try {
            filename = await uploadFile(req, res, "files");
        } catch (error) {
            return res.status(500).send(error.message);
        }
        return res.status(200).send(filename);
    });

    router.post('/uploadImage', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!permissions.includes("admin") && !permissions.includes("writer") && !permissions.includes("canPost")) return res.status(403).send("You cannot upload a File");

        let filename;
        try {
            filename = await uploadFile(req, res, "images", ["jpg", "jpeg", "png", "webp", "heic"]);
        } catch (error) {
            return res.status(500).send(error.message);
        }
        return res.status(200).send(filename);
    });

    router.post('/uploadHomework', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");
        const permissions = await db.getUserPermissions(req.session.userID);
        if (!permissions.includes("admin") && !permissions.includes("classmate")) return res.status(403).send("You cannot upload a Homework");

        let newFilename;
        const oldFilename = req.query.filename;
        if (!oldFilename) return res.status(400).send("Missing filename");
        try {
            newFilename = await uploadFile(req, res, "homework", [], false);
            const entry = await registerFileInDB(req.session.userID, oldFilename, newFilename, "homework");
            return res.status(200).send(entry.path);
        } catch (error) {
            return res.status(500).send(error.message);
        }
    });

    router.post('/uploadProfilePicture', multer().single('file'), async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        let { x, y, scale } = req.body;
        x = parseFloat(x);
        y = parseFloat(y);
        scale = parseFloat(scale);

        const file = req.file;

        console.log("Uploading profile picture");

        // Validate the file
        if (!file) return res.status(400).send("Missing file");

        // Validate the x, y, and scale
        if (typeof x === "undefined" || typeof y === "undefined" || typeof scale === "undefined") return res.status(400).send("Missing x, y, or scale");
        if (isNaN(x) || isNaN(y) || isNaN(scale)) return res.status(400).send("x, y, and scale must be numbers");
        if (typeof x !== "number" || typeof y !== "number" || typeof scale !== "number") return res.status(400).send("x, y, and scale must be numbers");

        try {
            const image = sharp(file.buffer)
            const metadata = await image.metadata();

            const width = metadata.width;
            const height = metadata.height;

            const extractWidth = Math.floor(width / scale);
            const extractHeight = Math.floor(height / scale);
            let extractLeft = Math.floor(x * width);
            let extractTop = Math.floor(y * height);

            if (extractWidth + extractLeft > width) extractLeft = 0;
            if (extractHeight + extractTop > height) extractTop = 0;

            if (extractLeft + extractWidth > width || extractTop + extractHeight > height) {
                console.warn("Invalid crop size");
                return res.status(400).send("Invalid crop");
            }

            image
            .rotate()
            .extract({ width: extractWidth, height: extractHeight, left: extractLeft, top: extractTop })
            .resize(config.profilePictureResolution, config.profilePictureResolution)
            .toBuffer()
            .then(async (data) => {
                //write the file to local disk on fs
                console.log("Writing file to disk");
                const filename = generateRandomFilename();
                const fileExtension = file.originalname.split('.').pop().toLowerCase();
                const newFilename = `${filename}.${fileExtension}`;
                const s3Path = `profile-pictures/${newFilename}`;
                await s3Client.send(new PutObjectCommand({
                    Bucket: "transmitterstorage",
                    Key: s3Path,
                    Body: data,
                    ContentType: file.mimetype,
                    ACL: "public-read",
                    CacheControl: "max-age=31536000",
                    ContentDisposition: "inline"
                }));
                registerFileInDB(req.session.userID, newFilename, s3Path, "profile-pictures");
                const currentProfilePic = await db.getPreference(req.session.userID, 'profilePic');
                if (currentProfilePic.type === "custom") {
                    console.log("Deleting old profile picture");
                    await deleteFile(currentProfilePic.content);
                };
                db.setPreference(req.session.userID, 'profilePic', { "type": "custom", "content": s3Path });
                res.status(200).send(s3Path);
            });
        } catch (error) {
            console.error("Error processing image:", error);
            return res.status(500).send("Error processing image");
        }
    });

    router.post('/resetProfilePicture', async (req, res) => {
        if (!req.session.userID) return res.status(401).send("Not logged in");

        const currentProfilePic = await db.getPreference(req.session.userID, 'profilePic');
        if (currentProfilePic.type === "custom") {
            console.log("Deleting old profile picture");
            await deleteFile(currentProfilePic.content);
        };
        function generateRandomProfilePic() {
            return { "type": "default", "content": "#" + Math.floor(Math.random() * 16777215).toString(16) };
        }

        const newProfilePic = generateRandomProfilePic();
        db.setPreference(req.session.userID, 'profilePic', newProfilePic);
        res.status(200).send(newProfilePic);
    });

    return router;
};