const path = require('path');
const fs = require('fs');


const root = path.join(__dirname, "..");

const gamesDirectory = path.join(root, "games")


//load game config from manifest files
let gameConfigs = [];

const games = fs.readdirSync(gamesDirectory);
games.forEach(function (file) {
    const fileDir = path.join(gamesDirectory, file);
    const stat = fs.statSync(fileDir);

    if (stat.isDirectory()) {
        const gameFiles = fs.readdirSync(fileDir);
        gameFiles.forEach(function (gameFile) {
            if (gameFile === "manifest.json") {
                const manifest = JSON.parse(fs.readFileSync(path.join(fileDir, gameFile)));
                //console.log(manifest);
                if (!(manifest.enabled == false) || (manifest.enabled == false && manifest.preview && manifest.preview == true)) { //if manifest.enabled exists and is true or if preview is enabled
                    gameConfigs.push(manifest);
                }
            }
        });
    }
});

gameConfigs.sort((a, b) => a.priority - b.priority)
gameConfigs.reverse()

console.log("Loaded games:", gameConfigs.map(config => "'" + config.name + "'").join(", "));

let views = [path.join(root, 'views'), path.join(root, 'views', 'partials')]
let publicDirs = [path.join(root, 'public')];
gameConfigs.forEach(config => {
    const publicDir = path.join(root, 'games', config.url, (config.public || 'public'))

    config.publicDir = publicDir;
    views.push(path.join(root, 'games', config.url, (config.views || 'views')));
})

//load module config from manifest files
let moduleConfigs = [];

const modules = fs.readdirSync(path.join(root, 'modules'));
modules.forEach(function (file) {
    const fileDir = path.join(root, 'modules', file);
    const stat = fs.statSync(fileDir);

    if (stat.isDirectory()) {
        const moduleFiles = fs.readdirSync(fileDir);
        moduleFiles.forEach(function (moduleFile) {
            if (moduleFile === "manifest.json") {
                const manifest = JSON.parse(fs.readFileSync(path.join(fileDir, moduleFile)));
                //console.log(manifest);
                if (!(manifest.enabled == false)) {
                    manifest.url = file;
                    moduleConfigs.push(manifest);
                }
            }
        });
    }
});

moduleConfigs.forEach(config => {
    const publicDir = path.join(root, 'modules', config.url, (config.public || 'public'))
    publicDirs.push(publicDir);

    config.publicDir = publicDir;
    views.push(path.join(root, 'modules', config.url, (config.views || 'views')));

    config.router = path.join(root, 'modules', config.url, config.router ? config.router : 'router.js');
});

console.log("Loaded modules:", moduleConfigs.map(config => "'" + config.url + "'").join(", "));


module.exports = {
    gameConfigs,
    moduleConfigs,
    publicDirs,
    views,
};