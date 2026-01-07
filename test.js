const { S3Client } = require("@aws-sdk/client-s3");
const dotenv = require('dotenv');
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

//connect to storage bucket
const s3Client = new S3Client({
    region: "fra1",
    endpoint: "https://fra1.digitaloceanspaces.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: false,
});

// list buckets to verify connection
s3Client.listBuckets().then(data => {
    console.log("Connected to S3-compatible storage. Buckets:");
    data.Buckets.forEach(bucket => {
        console.log(" - " + bucket.Name);
    });
}).catch(err => {
    console.error("Error connecting to S3-compatible storage:", err);
});