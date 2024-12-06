const OpenAI = require("openai");
const { extractText, getDocumentProxy } = require("unpdf");
const z = require("zod");
const { zodResponseFormat } = require("openai/helpers/zod");

//for .env file in development
const dotenv = require('dotenv');
dotenv.config({ path: ".env" });

const openAI = new OpenAI(process.env.OPENAI_API_KEY);

const config = require('../config.json');

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

async function extractTextFromAllNewsArticles(db) {
    const news = await db.getPosts(false, -1, 0, { type: "news" });
    const text = (await Promise.all(news.posts.map(async (article) => (await Promise.all(article.sections.map(async (section) => {
        if (section.type === "file") {
            try {
                return await extractTextFromPDF("https://storage.liscitransmitter.live/" + section.content);
            }
            catch (error) {
                console.error(error);
                return "";
            }
        }
        return section.content;
    }))).join("\n")))).join("\n");
    return text;
}

const CrosswordReturn = z.object({
    qaPairs: z.array(z.object({
        question: z.string(),
        answer: z.string(),
        clue: z.string(),
    })),
    final_answer: z.string(),
});

async function generateCrosswordWords(newsText) {
    const completion = await openAI.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: config.openAIGenerateCrosswordWordsPrompt },
            {
                role: "user",
                content: String(newsText),
            },
        ],
        response_format: zodResponseFormat(CrosswordReturn, "crossword_words"),
    });

    const words = completion.choices[0].message.content;
    return words;
}

module.exports = {
    summarizeText,
    extractTextFromPDF,
    createTitle,
    extractTextFromAllNewsArticles,
    generateCrosswordWords
};