const { Router } = require('express');
const router = Router();
const dotenv = require('dotenv');
const path = require('path');
const webpush = require('web-push')
const MongoConnector = require('../../../server/MongoConnector').MongoConnector;

dotenv.config({ path: ".env" });

let db;
if (router.db === undefined) {
    let dbname = process.env.DB_NAME || "transmitter";
    const connectionString = process.env.DATABASE_URL || "mongodb://localhost:27017";
    webpush.setVapidDetails(
        'mailto:admin@liscitransmitter.live',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
    db = new MongoConnector(dbname, connectionString, webpush);
    db.connectPromise.then(() => {
        console.log("Connected to database");
    });
}
else {
    db = router.db;
}

function makeCitationsXML(req, citations) {
    // Ensure the self reference matches the actual document location
    // by hardcoding the citations feed URL.
    const selfUrl = `${req.protocol}://${req.get('host')}`;
    const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Transmitter Zitat</title>
<link>${selfUrl}</link>
<description>Latest citations</description>
<atom:link href="${selfUrl}" rel="self"></atom:link>
<language>de</language>
${citations.map(citation => {
        let item = '';
        if (Array.isArray(citation.context) && citation.context.length > 0) {
            if (citation.context.length === 1) {
                item = `
                    <item>
                        <title>${citation.context[0].content}</title>
                        <description>${citation.context[0].author}</description>
                        <link>https://liscitransmitter/citations?citationID=${citation._id}</link>
                        <guid isPermaLink="false">${citation._id}</guid>
                        <pubDate>${new Date(citation.timestamp).toUTCString()}</pubDate>
                    </item>`;
            }
            else {
                item = `<item>
                    <title>${citation.context[0].content} von ${citation.context[0].author}</title>
                    <description>${citation.context.slice(1).map(contextItem => `${contextItem.content} von ${contextItem.author}`).join('\n')}</description>
                    <link>https://liscitransmitter/citations?citationID=${citation._id}</link>
                    <guid isPermaLink="false">${citation._id}</guid>
                    <pubDate>${new Date(citation.timestamp).toUTCString()}</pubDate>
                </item>`;
            }
        } else {
            item = `
            <item>
                <title>${citation.content}</title>
                <description>${citation.author}</description>
                <link>https://liscitransmitter/citations?citationID=${citation._id}</link>
                <guid isPermaLink="false">${citation._id}</guid>
                <pubDate>${new Date(citation.timestamp).toUTCString()}</pubDate>
            </item>`;
        }
        return item;
    }).join('')}
</channel>
</rss>`;
    return xml;
}

function makePostsXML(req, posts) {
    // Ensure the self reference matches the actual document location
    // by hardcoding the citations feed URL.
    const selfUrl = `${req.protocol}://${req.get('host')}`;
    const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Transmitter Post</title>
    <link>${selfUrl}</link>
    <description>Latest posts</description>
    <language>de</language>
    ${posts.map(post => {
        const fileSection = post.sections.find(section => section.type === 'file');
        // Add both enclosure and link elements for better compatibility
        let fileLink = `<link>https://liscitransmitter?post=${post._id}</link>`;
        if (fileSection) {
            // Ensure URL is properly formed with full https:// prefix
            const fileUrl = `https://storage.liscitransmitter.live/${fileSection.content}`;
            fileLink = `<enclosure url="${fileUrl}" type="application/pdf" />
        <link>${fileUrl}</link>`;
        }
        return `
      <item>
        <title>${post.title}</title>
        <description>Post</description>
        ${fileLink}
        <guid isPermaLink="false">${post._id}</guid>
        <pubDate>${new Date(post.timestamp).toUTCString()}</pubDate>
      </item>`;
    }).join('')}
  </channel>
</rss>`;
    return xml;
};

async function authenticate(req) {
    keyHeader = req.query.key;
    if (!keyHeader) {
        return null;
    }
    const user = await db.getUserByAPIKey(keyHeader);
    if (!user) {
        return null;
    }
    if (user.permissions.includes("apiAccess")) {
        return user;
    }
    return null;
}


module.exports = () => {

    router.get('/citations', async (req, res) => {
        if (!authenticate(req)) {
            return res.status(401).send("Unauthorized");
        }

        res.set('Content-Type', 'application/xml; charset=utf-8');

        const citations = await db.getCitations(10, 0);
        console.log("Citation feed requested");
        const xml = makeCitationsXML(req, citations.citations);
        return res.send(xml);
    });

    router.get('/posts', async (req, res) => {
        if (!authenticate(req)) {
            return res.status(401).send("Unauthorized");
        }

        res.set('Content-Type', 'application/xml; charset=utf-8');

        const posts = await db.getPosts(false, 10, 0);
        console.log("Posts feed requested");
        const xml = makePostsXML(req, posts.posts);
        return res.send(xml);
    });

    return router;
};