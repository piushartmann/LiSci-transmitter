const { translate } = require('bing-translate-api');
const fs = require('fs');
const path = require('path');

const baseLanguageFile = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'languages', 'en.json')));
const targetLanguage = 'tlh-Latn';

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

translateObject(baseLanguageFile, 'en', targetLanguage).then(translation => {
    console.log(translation);
    if(!fs.existsSync(path.join(__dirname, 'public', 'languages', targetLanguage + '.json'))) {
        fs.writeFileSync(path.join(__dirname, 'public', 'languages', targetLanguage + '.json'), JSON.stringify(translation, null, 4));
    } else {
        console.error(`File ${targetLanguage}.json already exists`);
    }
});