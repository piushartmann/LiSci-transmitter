const { scanDirForEjsFiles, scanFileForMissingLangContent, scanLanguageFileForMissingKeys } = require('../langContentScan.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

process.env.NODE_ENV === 'test';
const currentDir = __dirname + "/../";

describe('scan files for missing lang content', () => {

    let fileList = scanDirForEjsFiles(currentDir);

    it("should contain .ejs files", () => {
        expect(fileList.length).toBeGreaterThan(0);
    });

    fileList.forEach(file => {
        const filename = path.basename(file);
        it(`should have no missing Language Content in: ${filename}`, () => {
            const missingLangContent = scanFileForMissingLangContent(file);
            if (missingLangContent.length > 0) {
                console.log(missingLangContent);
            }
            expect(missingLangContent.length).toBe(0);
        });
    });
});

describe('check for missing keys in language file', () => {
    const mainLanguage = config.languages.manuallyTranslated[0];
    const mainLanguageFile = JSON.parse(fs.readFileSync(path.join(currentDir, 'public', 'languages', `${mainLanguage}.json`)));
    const mainKeys = Object.keys(mainLanguageFile);

    const checkLanguages = config.languages.manuallyTranslated.slice(1);

    checkLanguages.forEach(lang => {
        it(`should have no missing keys in ${lang} language file`, () => {
            const missingKeysThisFile = scanLanguageFileForMissingKeys(lang, mainLanguageFile, mainKeys);
            if (missingKeysThisFile.length > 0) {
                console.log(missingKeysThisFile);
            }
            expect(missingKeysThisFile.length).toBe(0);
        });
    });
})