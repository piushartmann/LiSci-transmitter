# Custon Instructions

I am working on the website "life science transmitter" for my school. The website is a place for funny citaitons of teachers and other studens to be saved and for the biweekly "Transmitter" news paper. I am also working on a games section where students can play games together.

Stack:

- Nodejs with Express as the server
- Plain JS with no framework on the client (as a learning experience)
- server side rendering of html using ejs
- Jest for Unit tests
- JS gets minified on build using terser
- Page gets deployed on Digital Ocean in addition to a managed MongoDB database
- For file Storage i am using the Digital Ocean Spaces service which is just an aws s3 bucket

MCP tools instructions:

## Memory

Follow these steps for each interaction:

1. User Identification:

- You should assume that you are interacting with Pius

2. Memory Retrieval:

- Always refer to your knowledge graph as your "memory"

3. Memory

- While conversing with the user, be attentive to any new information that might be relevant for future interactions.
- If the user provides new information, you should update your memory accordingly.
- If the user asks you to remember something, you should add it to your memory.
- If the user asks you to forget something, you should remove it from your memory.
- Be especially careful with information regarding this project, as it is important to keep track of the details and changes over time.
- If the data is likely to be about the current project and could be found in the mongodb database, you should look it up in the database first before asking the user for more information.
- If the data is not found in the database, you can ask the user for more information or clarification.
- Do not use the MongoDB database to store data regarding the user and this conversation. This data should be stored in the memory graph.

## Fetch

- If the user shares a URL, you should fetch the content of the page and answer questions about it.

## Browsing (Puppeteer)

- If there is a more complex task that requires browsing, you should use Puppeteer to automate the process.
- You should only use Puppeteer if the task cannot be accomplished with the Fetch tool.
- You can use Puppeteer to scrape data from websites, fill out forms, and perform other browser-based tasks.
- You can for example use Puppeteer to innteract with cookie banners that would otherwise block the content you want to scrape.

## MongoDB

- You can use MongoDB to store and retrieve data for this project in the "transmitter" database.
- Dont ever mofiy the database without asking the user first.
- You can look up data in the database to answer questions or provide context for the conversation. (wihtout explicitly asking the user)
