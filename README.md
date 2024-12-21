# Life-Science Transmitter

This is the repository for the Life Science Transmitter Website.

## User section

### Description

This is the Website of the Life Science Profile.
The site is hosted [here](https://liscitransmitter.live)

### Login

The Username is your name
I sent you the password.
If you forgot your password: Ask me irl or <a href="mailto:admin@liscitransmitter.live">send an Email</a>

### Sign-up

**You can’t.**
Ask me irl or <a href="mailto:admin@liscitransmitter.live">send an Email</a>

### Privacy

Everything is accessible [here](https://liscitransmitter.live/about)

### TODO

- website redesign
- Add more Sections:
  - Tierlists
  - Voting
- add memes to posts

## Developer section

- [API](#api)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [server JS](#server-js)
- [EJS structure](#ejs-structure)
- [Custom Snippets](#custom-snippets)
- [TODO tracking](#todo-tracking)
- [Client side JavaScript](#client-side-javascript)
  - [Examples](#examples)
- [Testing](#testing)
- [File Uploads](#file-uploads)

### API

there is an API on /api with an OpenAPI spec on /.
You will need an API-Key findable in the settings Menu when logged in.

The Website will make requests that are not on the public API using an internal api on /internal. I do not recommend to use as it uses your session to authenticate which is unreliable when not used in the Browser. If you want to make API requests that aren’t supported yet:

- Ask me (easy)
- Make a new issue on GitHub (medium)
- Add it yourself and make a pull request. (expert)

### Getting started

#### Prerequisites

- Node.js
- npm
- git
- mongodb (for local testing, as the real database can only be accessed from the deployed server)
- mongodb compass (for local testing, optional)
- VSCode (recommended)
- recommended Extensions for VSCode (should get recommended automatically)

#### Installation

After cloning the repository you need to install the dependencies with `npm install` <br>
Then you will need an .env file with the API keys for testing. You will have to ask me for that or create your own. <br>
Then you can start the server for local testing `npm start`.
As soon as you commit your changes the code will get deployed to the server. <br>
If there are critical errors during deployment the server will automatically roll back to the last working version. <br>

### server JS

The JavaScript on the site is minified to optimize speed using terser but the source maps are available at filepath/filename.js.map but they should be found automatically by the browser.

### EJS structure

#### Head

  `<%- include("partials/baseHead.ejs") %>` -> some of the basic Head Elements, like Viewport settings but also basic imports and automatic prefetches <br>
  The Custom Head Elements like the Page title and Page imports

#### Body

  `<%- include('./partials/base.ejs') %>` -> Some HTML elements that should be present on every document, like the header and the base Modal structure <br>
  The Custom body Elements that make the Page

### Custom Snippets

- newPage -> creates a new Page with the basic structure
- newRouter -> creates a new Router with the basic structure
- newRoute (or: nr) -> creates a new Route. Used in the Router
- data-lang-content (or: lang) -> adds a language content tag at the coursor position. Used to add localizations to an element
- data-lang-content-value (or: langv) -> similar to data-lang-content but for the value attribute
- data-lang-content-placeholder (or: langp) -> similar to data-lang-content but for the placeholder attribute
- data-lang-arguments (or: langarg) -> adds arguments to be resolved during localization

### TODO tracking

I use the TODO tree extension. You can find all the TODOs in the TODO tree view.

### Client side JavaScript

Some JS are loaded per default in the baseHead like the Header.js and the Base.js file <br>

Important functions in the [base.js](./public/js/base.js) file:

- `buildButton(icon, fallback, onclick, languageContent, languageContentShort, counter = false)`: Creates a button element with an optional icon, label, and click event.
- `buildProfilePic(profilePic, username, short = false)`: Generates a profile picture element with the user's name and picture and returns the html element that can be added to the DOM.
- `buildLikeButton(route, id, liked, likes)`: Creates a like button that can toggle between liked and unliked states.
- `hideModal()`: Hides the active modal element.
- `openModal(content, id = "modal")`: Opens a modal with the specified content. OR if content is "" it will open the modal with the id.
- `loadLanguage(update = false)`: Call this whenever you add some html with a language key to the DOM.
- `updateCache(url, callbackType)`: Sends a message to the service worker to update the cache for the specified URL. Call this whenever you change Content that is also changed on the Server. e.g. when liking a post. callbackType can be `reloadSite` or `reloadContent`. When calling `reloadContent` you need to specify a `reloadContent` function in your client side JS. That reloads the server loaded Content. e.g: [index.js](./public/js/index.js#L14)
- `toggleVisibility(id, setVis = null)`: Toggles the visibility of an element by its ID. Optionally, you can set the visibility to a specific value.

In the [base.js](./public/js/base.js) are also explanations for the functions.

#### Examples

```javascript
let editButton = buildButton("/icons/edit.svg", "Edit", () => window.location.href = `/edit/${post._id}`, "interaction edit");
let likeButton = buildLikeButton("/internal/likePost", post._id, post.liked, post.likes.length);
let profilePic = buildProfilePic(profilePic, post.userID.username)
```

### Testing

I use the Jest testing framework for testing the JavaScript. You can run the tests with `npm test` or in the recommended Extension in VSCode. <br>
Special Cases: A test in langContent.test.js fails if not all the elements, in the specified .ejs file somewhere in the workspace, have a language-content attribute, OR if manually translated language files (en or de) have a mismatch in thier keys.
The test `should apply teacher filter correctly` can fail sometimes. I dont know why... ignore that or run it individually then it should work.

### File Uploads

File Uploads are handled in the /internal/uploads route defined in [this](./routes/internal/uploads.js) file. If you want to let the user upload a file create a route there. There you can use the `uploadFile` function to upload the file. The function returns the path to the file. You can then save the path in the database. The function will also genereate its its own db entry to keep track of the file and to delete it with the `deleteFile` function, but you should keep track of the file in your own db entry.
