function selectChat(i, id) {
    i = parseInt(i) - 1;
    id = parseInt(id);
    const elements = document.getElementsByClassName("chat-selector-element");
    for (let j = 0; j < elements.length; j++) {
        elements[j].classList.remove("active");
    }
    elements[i].classList.add("active");
    loadChat(id);
}

const sampleResponse = {
    "memebers": [
        { "userID": "60b6b1b1b3b3b3b3b3b3b3", "username": "Merlin", "profilePic": "test" },
        { "userID": "adfgadfgadfgadsfgadf", "username": "Pius", "profilePic": "test" },
        { "userID": "juASHFLDKJösalkfdjh", "username": "test", "profilePic": "test" },
    ],
    "messages": [
        { "content": "Hello \n whats up? \n this \n is \n a \n long \n message", "timestamp": "2021-06-01T00:00:00.000Z", "userID": "60b6b1b1b3b3b3b3b3b3b3b3", "username": "Admin", "profilePic": {"type": "default", "content":"#cbcbcb"}, "me": false},
        { "content": "Hello!", "timestamp": "2021-06-02T00:00:00.000Z", "userID": "adfgadfgadfgadsfgadf", "username": "Pius", "profilePic": {"type": "default", "content":"#3b7ea0"}, "me": true },
        { "content": "Hi", "timestamp": "2021-06-01T00:00:00.000Z", "userID": "60b6b1b1b3b3b3b3b3b3b3", "username": "Admin", "profilePic": {"type": "default", "content":"#cbcbcb"}, "me": false },
        { "content": "Hello!", "timestamp": "2021-06-02T00:00:00.000Z", "userID": "adfgadfgadfgadsfgadf", "username": "Test", "profilePic": {"type": "default", "content":"#b13939"}, "me": false },
    ]
};

function loadChat(i) {
    const chatContainer = document.getElementById("chat-container");
    chatContainer.innerHTML = "";

    const messages = document.createElement("div");
    messages.id = "messages";
    chatContainer.appendChild(messages);

    sampleResponse.messages.forEach(message => {
        addMessageToChat(message);
    });

}

function addMessageToChat({username, timestamp, content, me, profilePic}) {
    const messages = document.getElementById("messages");

    const messageDiv = document.createElement("div");
    messageDiv.className = me ? "message me" : "message";

    const meta = document.createElement("div");
    meta.className = "meta";

    const timestampDiv = document.createElement("div");
    const date = new Date(timestamp);
    timestampDiv.className = "timestamp";
    timestampDiv.innerText = date.toLocaleString();

    const profilePicDiv = document.createElement("div");
    profilePicDiv.className = "profile-pic";
    profilePicDiv.appendChild(buildProfilePic(profilePic, username, true));

    meta.appendChild(profilePicDiv);
    //meta.appendChild(timestampDiv);

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    contentDiv.innerText = content;

    messageDiv.appendChild(meta);
    messageDiv.appendChild(contentDiv);

    messages.appendChild(messageDiv);
}

document.addEventListener("DOMContentLoaded", () => {
    loadChat(1);
});