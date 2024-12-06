const path = require('path');
const fs = require('fs');
const jsdom = require("jsdom");
const config = require('./config.json');

//get all ejs file
function scanDirForEjsFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            scanDirForEjsFiles(filePath, fileList);
        } else if (path.extname(file) === '.ejs') {
            fileList.push(filePath);
        }
    });
    return fileList;
}

const currentDir = __dirname;
const ejsFiles = scanDirForEjsFiles(currentDir);
filterTags = ["script", "image", "style"]

//scan ejs files for missing langContent on all text elements
console.groupCollapsed("Scanning files for missing langContent");
for (const file of ejsFiles) {
    if (file.includes("about") || file.includes("chat")) continue;
    const data = fs.readFileSync(file, 'utf8');
    const parsedHtml = new jsdom.JSDOM(data).window.document;
    let elements = Array.from(parsedHtml.querySelectorAll('*'));
    let filteredElements = [];
    for (const el of elements) {
        if (filterTags.includes(el.tagName.toLowerCase())) continue;
        if (el.children.length !== 0) continue;
        if (el.textContent.trim().length <= 0) continue;
        if (el.textContent === "×") continue;
        if (el.getAttribute(`data-lang-content`) !== null || el.getAttribute(`data-lang-content-value`) !== null || el.getAttribute(`data-lang-content-placeholder`) !== null) continue;
        filteredElements.push(el);
    }
    if (filteredElements.length === 0) continue;
    console.groupCollapsed("Scanning file: " + file);
    filteredElements.map(function (el, i) { console.log(el.innerHTML.trim()) });
    console.groupEnd();
}
console.groupEnd();

//scan manually translated languages for missing keys
const mainLanguage = config.languages.manuallyTranslated[0];
const mainLanguageFile = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'languages', `${mainLanguage}.json`)));
const mainKeys = Object.keys(mainLanguageFile);

const checkLanguages = config.languages.manuallyTranslated.slice(1);

console.groupCollapsed("Scanning manually translated languages for deviating content");

for (const lang of checkLanguages) {
    const checkLanguageFile = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'languages', `${lang}.json`)));
    const checkKeys = Object.keys(checkLanguageFile);
    const missingKeys = mainKeys.filter(key => !checkKeys.includes(key));
    if (missingKeys.length > 0) {
        console.groupCollapsed(`Missing keys in language: ${lang}`);
        missingKeys.forEach(key => console.warn(`Missing keys in ${lang}: ${key}`));
        console.groupEnd();
    }

    function findMissingNestedKeys(mainObj, checkObj, parentKey = '') {
        let missingKeys = [];
        for (const key in mainObj) {
            const fullKey = parentKey ? `${parentKey}.${key}` : key;
            if (!checkObj.hasOwnProperty(key)) {
                missingKeys.push(fullKey);
            } else if (typeof mainObj[key] === 'object' && !Array.isArray(mainObj[key])) {
                missingKeys = missingKeys.concat(findMissingNestedKeys(mainObj[key], checkObj[key], fullKey));
            }
        }
        return missingKeys;
    }

    const nestedMissingKeys = findMissingNestedKeys(mainLanguageFile, checkLanguageFile);
    if (nestedMissingKeys.length > 0) {
        nestedMissingKeys.forEach(key => console.log(`Missing keys in ${lang}: ${key}`));
    }
}
console.groupEnd();