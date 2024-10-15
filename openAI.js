const OpenAI = require("openai");
const { extractText, getDocumentProxy } = require("unpdf");

//for .env file in development
const dotenv = require('dotenv');
dotenv.config({ path: (__dirname + '.env') });

const openAI = new OpenAI(process.env.OPENAI_API_KEY);

const config = require('./config.json');

async function summarizeText(text) {
    const completion = await openAI.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: config.openAISummarizeTextPrompt },
            {
                role: "user",
                content: String(text),
            },
        ],
    });

    const summary = completion.choices[0].message.content;
    return summary;
}

async function createTitle(text) {
    const completion = await openAI.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: config.openAICreateTitlePrompt },
            {
                role: "user",
                content: String(text),
            },
        ],
    });

    const title = completion.choices[0].message.content;
    return title;
}

async function summarizePDF(pdfURL) {
    const text = await extractTextFromPDF(pdfURL);
    return await summarizeText(text);
}

async function extractTextFromPDF(pdfURL) {
    const buffer = await fetch(pdfURL).then((res) => res.arrayBuffer());

    const pdf = await getDocumentProxy(new Uint8Array(buffer));

    const { pages, text } = await extractText(pdf, { mergePages: true });

    return text;
}

module.exports = {
    summarizeText,
    extractTextFromPDF,
    createTitle,
};