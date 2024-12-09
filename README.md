# Life-Science Transmitter

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

### Help

If you want to help making the Website you are welcome to do that!
Simply pull the code, add your changes and make Pull request.

### API

there is an API on /api with an OpenAPI spec on /.
You will need an API-Key findable in the settings Menu when logged in.

The Website will make requests that are not on the public API using an internal api on /internal. I do not recommend to use as it uses your session to authenticate which is unreliable when not used in the Browser. If you want to make API requests that aren’t supported yet:
- Ask me (easy)
- Make a new issue on GitHub (medium)
- Add it yourself and make a pull request. (expert)

### javascript

The JavaScript on the site is minified to optimize speed using terser but the source maps are available at filepath/filename.js.map

### EJS structure
Head: <br>
  <%- include("partials/baseHead.ejs") %> -> some of the basic Head Elements, like Viewport settings but also basic imports and automatic prefetches <br>
  The Custom Head Elements like the Page title and Page imports

Body: <br>
  <%- include("./partials/header.ejs") %>
<%- include('./partials/base.ejs') %> -> Some HTML elements that should be present on every document, like the header and the base Modal structure <br>
  The Custom body Elements that make the Page

### Standard js
Some JS are loaded per default in the baseHead like the Header.js and the Base.js file <br>
The Base.js file has some standard function for every page to access like the code to connect to the websocket and to load a language file. Also Modal and Button Builders are here.