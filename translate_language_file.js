const { translate } = require('bing-translate-api');
const fs = require('fs');
const path = require('path');

const baseLanguageFile = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'languages', 'en.json')));
const targetLanguages = ["tlh-Latn", "pl"];

async function translateObject(obj, fromLanguage, toLanguage) {
    if (obj) {
        const keys = Object.keys(obj);
        for (const key of keys) {
            if (typeof obj[key] === 'string') {
                const translation = await translate(obj[key], fromLanguage, toLanguage);
                obj[key] = translation.translation;
            } else if (typeof obj[key] === 'object') {
                obj[key] = await translateObject(obj[key], fromLanguage, toLanguage);
            }
        }
        return obj;
    } else {
        return obj;
    }
}

function translateFiles(targetLanguage) {
    // Clone the baseLanguageFile to avoid modifying the original object
    const languageFileCopy = JSON.parse(JSON.stringify(baseLanguageFile));
    
    translateObject(languageFileCopy, 'en', targetLanguage).then(translation => {
        if (targetLanguage === 'tlh-Latn') {
            targetLanguage = 'tlh';
        }
        console.log(`Writing ${targetLanguage} translation file`);
        fs.writeFileSync(path.join(__dirname, 'public', 'languages', targetLanguage + '.json'), JSON.stringify(translation, null, 4));
    });
}

targetLanguages.forEach(translateFiles);