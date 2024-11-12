// Sample JavaScript code for use in the browser

// Function to change the text of an HTML element
function changeText() {
    document.getElementById("myText").innerHTML = "Hello, World!";
}

// Function to change the background color of the page
function changeBackgroundColor(color) {
    document.body.style.backgroundColor = color;
}

// Event listener to change text when a button is clicked
document.getElementById("changeTextButton").addEventListener("click", changeText);

// Event listener to change background color when a button is clicked
document.getElementById("changeColorButton").addEventListener("click", function() {
    changeBackgroundColor("lightblue");
});