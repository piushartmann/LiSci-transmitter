const { translate: bingTranslate } = require('bing-translate-api');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const targetLanguages = config.languages.aiTranslated;
const mainLanguage = config.languages.manuallyTranslated[0];
const baseLanguageFile = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'languages', `${mainLanguage}.json`)));

async function translate(text, fromLanguage, toLanguage) {

    if (toLanguage === 'elv'){
        return { translation: transcribeElvish(text) };
    }
    else if (toLanguage === 'dwa'){
        return { translation: transcribeDwarvish(text) };
    }
    else if (toLanguage === 'wurstwasser') {
        return { translation: "wurstwasser"};
    }

    const translation = await bingTranslate(text, fromLanguage, toLanguage);
    return translation;
}

function transcribeElvish(text) {
    let output = " " + text;
    output = output.replace(/\n/g, "\n ")
        .replace(/ a/g, " A")
        .replace(/ e/g, " E")
        .replace(/ i/g, " I")
        .replace(/ o/g, " O")
        .replace(/ u/g, " U")
        .replace(/aa/g, "aA")
        .replace(/ae/g, "aE")
        .replace(/ai/g, "aI")
        .replace(/ao/g, "aO")
        .replace(/au/g, "aU")
        .replace(/ea/g, "eA")
        .replace(/ee/g, "eE")
        .replace(/ei/g, "eI")
        .replace(/eo/g, "eO")
        .replace(/eu/g, "eU")
        .replace(/ia/g, "iA")
        .replace(/ie/g, "iE")
        .replace(/ii/g, "iI")
        .replace(/io/g, "iO")
        .replace(/iu/g, "iU")
        .replace(/oa/g, "oA")
        .replace(/oe/g, "oE")
        .replace(/oi/g, "oI")
        .replace(/oo/g, "eO")
        .replace(/ou/g, "oU")
        .replace(/ua/g, "uA")
        .replace(/ue/g, "uE")
        .replace(/ui/g, "uI")
        .replace(/uo/g, "uO")
        .replace(/uu/g, "uU")
        .replace(/ck/g, "c")
        .replace(/Aa/g, "AA")
        .replace(/Ae/g, "AE")
        .replace(/Ai/g, "AI")
        .replace(/Ao/g, "AO")
        .replace(/Au/g, "AU")
        .replace(/Ea/g, "EA")
        .replace(/Ee/g, "EE")
        .replace(/Ei/g, "EI")
        .replace(/Eo/g, "EO")
        .replace(/Eu/g, "EU")
        .replace(/Ia/g, "IA")
        .replace(/Ie/g, "IE")
        .replace(/Ii/g, "II")
        .replace(/Io/g, "IO")
        .replace(/Iu/g, "IU")
        .replace(/Oa/g, "OA")
        .replace(/Oe/g, "OE")
        .replace(/Oi/g, "OI")
        .replace(/Oo/g, "OO")
        .replace(/Ou/g, "OU")
        .replace(/Ua/g, "UA")
        .replace(/Ue/g, "UE")
        .replace(/Ui/g, "UI")
        .replace(/Uo/g, "UO")
        .replace(/Uu/g, "UU");

    return output;
}

function transcribeDwarvish(input) {
    let output = input;

    if (input !== "") {
        // Perform the transcription logic here
        output = input.replace(/a/g, "A")
                      .replace(/e/g, "E")
                      .replace(/i/g, "I")
                      .replace(/o/g, "O")
                      .replace(/u/g, "U");
    }

    return output;
}

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
    
    translateObject(languageFileCopy, mainLanguage, targetLanguage).then(translation => {
        if (targetLanguage === 'tlh-Latn') {
            targetLanguage = 'tlh';
        }
        console.log(`Writing ${targetLanguage} translation file`);
        fs.writeFileSync(path.join(__dirname, 'public', 'languages', targetLanguage + '.json'), JSON.stringify(translation, null, 4));
    });
}

targetLanguages.forEach(translateFiles);