const path = require('path');
const fs = require('fs');
const jsdom = require("jsdom");
const config = require('./config.json');


const filterTags = ["script", "image", "style"]

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

function scanFileForMissingLangContent(file) {
    missingLangContent = [];

    if (file.includes("about") || file.includes("chat") || file.includes("swaggerui") || file.includes("invitePage")) return missingLangContent; //skip these files

    //parse html file
    const data = fs.readFileSync(file, 'utf8');
    const parsedHtml = new jsdom.JSDOM(data).window.document;
    let elements = Array.from(parsedHtml.querySelectorAll('*'));

    let filteredElements = [];

    const mainLanguageFile = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'languages', `${config.languages.manuallyTranslated[0]}.json`)));

    //filter out all elements that dont need a langContent tag
    for (const el of elements) {
        if (filterTags.includes(el.tagName.toLowerCase())) continue; //filter out all tags defined in filterTags
        if (el.textContent.includes("<%")) continue; //filter out ejs render things
        if (el.children.length !== 0) continue; //filter out elements with children
        if (el.textContent.trim().length <= 0) continue; //filter out empty elements
        if (el.textContent === "×") continue; //filter out the close button
        if (el.getAttribute(`data-lang-content`) !== null || el.getAttribute(`data-lang-content-value`) !== null || el.getAttribute(`data-lang-content-placeholder`) !== null) {
            const content = el.getAttribute(`data-lang-content`) || el.getAttribute(`data-lang-content-value`) || el.getAttribute(`data-lang-content-placeholder`);
            if (content === "") continue; //filter out empty langContent tags
            if (content === "none") continue; //filter out langContent tags with value none

            //check if content is a key in the language file
            let languageFileJson = mainLanguageFile;
            try {
                content.split(" ").forEach(function (key) {
                    languageFileJson = languageFileJson[key];
                });
                continue;
            } catch (e) {
                filteredElements.push(el);
                continue;
            }
        };
        filteredElements.push(el);
    }

    //extract content from filtered elements
    if (filteredElements.length === 0) return missingLangContent;
    filteredElements.map(function (el, i) {
        missingLangContent.push(el.innerHTML.trim());
    });

    return missingLangContent;
}

function scanLanguageFileForMissingKeys(lang, mainLanguageFile, mainKeys) {
    //load language file
    const checkLanguageFile = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'languages', `${lang}.json`)));
    let missingKeys = [];

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

    //check for missing keys in nested objects
    const nestedMissingKeys = findMissingNestedKeys(mainLanguageFile, checkLanguageFile);
    if (nestedMissingKeys.length > 0) {
        nestedMissingKeys.forEach(function (key) {
            missingKeys.push(key);
        });
    }

    return missingKeys;
}

function scan() {
    const currentDir = __dirname;
    const ejsFiles = scanDirForEjsFiles(currentDir);


    let missingLangContent = {};

    //scan ejs files for missing langContent on all text elements
    console.groupCollapsed("Scanning files for missing langContent");
    for (const file of ejsFiles) {
        const missingLangContent = scanFileForMissingLangContent(file);
        console.groupCollapsed(file);
        missingLangContent.forEach(function (content) {
            console.log(content);
        });
        console.groupEnd();
    }

    //scan manually translated languages for missing keys
    const mainLanguage = config.languages.manuallyTranslated[0];
    const mainLanguageFile = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'languages', `${mainLanguage}.json`)));
    const mainKeys = Object.keys(mainLanguageFile);

    const checkLanguages = config.languages.manuallyTranslated.slice(1);

    let missingKeys = {};

    console.groupCollapsed("Scanning language files for missing keys");

    for (const lang of checkLanguages) {
        const missingKeysThisFile = scanLanguageFileForMissingKeys(lang, mainLanguageFile, mainKeys);
        if (missingKeysThisFile.length > 0) {
            console.groupCollapsed(lang);
            missingKeysThisFile.forEach(function (key) {
                console.log(key);
            });
            console.groupEnd();
        }
        missingKeys[lang] = missingKeysThisFile;
    }

    console.groupEnd();

    return {
        missingLangContent,
        missingKeys
    };
}

const isTest = process.env.NODE_ENV === 'test';

if (!isTest) scan();

module.exports = {
    scanDirForEjsFiles,
    scanFileForMissingLangContent,
    scanLanguageFileForMissingKeys
};