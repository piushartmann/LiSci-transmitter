const OpenAI = require("openai");
const z = require("zod");
const { zodResponseFormat } = require("openai/helpers/zod");
//for .env file in development
const dotenv = require('dotenv');
dotenv.config({ path: ".env" });
const { extractTextFromPDF, extractText } = require('./extractText');

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const config = require('../config.json');


async function summarizeText(text) {
    const completion = await openai.chat.completions.create({
        model: "o3-mini",
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
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
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
    const completion = await openai.chat.completions.create({
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

async function doHomework(content, files, lessonName) {
    
    console.log("Starting AI Response... " + content);
    //make files objects
    files = await Promise.all(files.map(async file => {
        const response = await fetch("https://storage.liscitransmitter.live/" + file.path);
        return {
            filename: file.filename,
            mimetype: response.headers.get("content-type"),
            path: file.path,
            blob: () => {
                return response.blob();
            },
            buffer: () => {
                return response.clone().arrayBuffer();
            }
        };
    }));

    //extract text from files
    files = await Promise.all(files.map(async files => await extractText(files)));
    const texts = files.map(file => file.text);
    const images = files.map(file => file.images);

    //craft prompt
    let prompt = `You are a student doing Homework for the lesson "${lessonName}".\n
    The Task is: ${content}\n
    Refer the required language from the Lesson Name and the language of the content you have provided and answer with that language.\n
    There may be files attached to this message. Please refer to them if necessary.\n
    If there are any here is a text transcription of the files, but Images are additionally appended to the message for you to view:\n
    ${texts.join("\n")}
    Please complete the task.
    Dont repeat the task in your answer.
    Dont mention that you are an AI but try to complete the task as a student would.
    You cannot ask for help from the teacher or other students.
    If you have not enough information to complete the task, you can say so, but try to complete it as much as possible.
    Format your answer using Markdown.
    Strictly adhere to the instructions given in the task.`;

    let imageContent = [];

    images.forEach(imageFile => {
        imageFile.forEach(image => {
            imageContent.push({
                "type": "image_url",
                "image_url": {
                    "url": `data:image/png;base64,${image.toString("base64")}`
                }
            });
        });
    });

    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "user", content: [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    ...imageContent
                ]
            },
        ],
    });

    const response = completion.choices[0].message.content;
    console.log("AI Response done.");
    return response;
}

module.exports = {
    summarizeText,
    createTitle,
    extractTextFromAllNewsArticles,
    generateCrosswordWords,
    doHomework
};