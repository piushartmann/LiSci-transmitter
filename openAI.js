const OpenAI = require("openai");
const { extractText, getDocumentProxy } = require("unpdf");
const dotenv = require('dotenv');
dotenv.config({ path: (__dirname + '.env') });
const openAI = new OpenAI(process.env.OPENAI_API_KEY);

async function summarizeText(text) {
    const completion = await openAI.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "Gebe eine kurze zusammenfassung auf Deutsch, was in dem Text enhalten ist. Der Text stammt aus einer PDF die zu lang ist um sie in einer Chat app direkt einzubetten. Stattdessen wir sie hinter einem Knop gezeigt, der Benutzer solle aber schon einmal eine Zusammenfassung des Dokumentes bekommen. Fasse den Text also kurz zusammen." },
            {
                role: "user",
                content: text,
            },
        ],
    });
    
    const summary = completion.choices[0].message.content;
    console.log(summary);
    return summary;
}

async function summarizePDF(pdfURL) {
    const buffer = await fetch(pdfURL).then((res) => res.arrayBuffer());

    const pdf = await getDocumentProxy(new Uint8Array(buffer));

    const { pages, text } = await extractText(pdf, { mergePages: true });

    return await summarizeText(text);
}

module.exports = {
    summarizeText,
    summarizePDF
};