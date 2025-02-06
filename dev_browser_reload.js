const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');

// Convert paths to absolute paths and verify they exist
const basePath = process.cwd();
let directories = ['public', 'views', 'games', 'modules'];

const moduleConfigs = require('./server/loadModules').moduleConfigs;
directories = directories.map(dir => path.join(basePath, dir))
directories.push(...moduleConfigs.map(config => config.publicDir));

const watch = directories
    .filter(dir => {
        const exists = fs.existsSync(dir);
        return exists;
    });

if (watch.length === 0) {
    console.error('No valid directories to watch!');
    process.exit(1);
}

const watcher = chokidar.watch(watch, {
    persistent: true,
    ignoreInitial: false,
    usePolling: true,
    interval: 100,
    binaryInterval: 300,
    ignored: /(^|[\/\\])\../,
    depth: 99,
    alwaysStat: true
});

// Wait for watcher to be ready
watcher.on('ready', () => {
    console.log('Initial scan complete, watching for changes');
});

watcher.on('change', path => {
    reload();
});

// Handle watcher errors
watcher.on('error', error => {
    console.error(`Watcher error: ${error}`);
});

function reload() {
    reloadCallbacks.forEach(callback => callback());
}

const reloadCallbacks = [];
function addReloadCallback(callback) {
    reloadCallbacks.push(callback);
}

// Export for use in other files
module.exports = addReloadCallback;