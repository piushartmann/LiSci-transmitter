const unpdf = require("unpdf");
const tesseract = require("tesseract.js");
const fs = require("fs");
const { createCanvas } = require("canvas");

async function extractTextFromPDF(buffer) {
    try {
        const arrayBuffer = new Uint8Array(buffer)
        const bufferCopy = Buffer.from(arrayBuffer);
        const pdf = await unpdf.getDocumentProxy(arrayBuffer);

        let { totalPages, text } = await unpdf.extractText(pdf, { mergePages: true });
        let images = [];

        const extractionSucceded = (!text || text === "\n" || text === "" || text.length === 1)

        for (let i = 1; i <= totalPages; i++) {
            console.log("Rendering page", i);
            const originalConsoleLog = console.log;
            console.log = function (...args) {
                if (typeof args[0] === "string" && args[0].includes("decodeScan - unexpected MCU data, current marker is: ffff")) {
                    return;
                }
                originalConsoleLog.apply(console, args);
            };

            const image = await unpdf.renderPageAsImage(new Uint8Array(Buffer.from(bufferCopy)), i, {
                canvas: () => require("canvas"),
            });

            console.log = originalConsoleLog;
            const imageBuffer = Buffer.from(image);
            images.push(imageBuffer);
            if (extractionSucceded) {
                text += await extractTextFromImage(imageBuffer);
            }
        }

        return { text, images };
    }
    catch (e) {
        console.log(e);
        return {text: "Could not extract text from PDF", images: []};
    }
}

async function extractTextFromImage(image) {
    try {
        const { data: { text } } = await tesseract.recognize(image);
        return text;
    }
    catch (e) {
        console.log(e);
        return "Could not extract text from image";
    }
}

async function extractText(file) {
    try {
        if (file.mimetype === "application/pdf") {
            return await extractTextFromPDF(await file.buffer());
        }
        if (file.mimetype === "text/plain") {
            return { text: await fs.promises.readFile(file.path, "utf-8"), images: [] };
        }
        if (file.mimetype === "image/png" || file.mimetype === "image/jpeg" || file.mimetype === "image/jpg" || file.mimetype === "image/webp" || file.mimetype === "image/gif") {
            return { text: await extractTextFromImage(await file.buffer()), images: [Buffer.from(await file.buffer())] };
        }
        return { text: "Could not extract text from file", images: [] };
    }
    catch (e) {
        console.log(e);
        return { text: "Could not extract text from file", images: [] };
    }
}

module.exports = {
    extractText,
    extractTextFromPDF,
};