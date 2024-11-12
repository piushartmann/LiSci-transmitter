const path = require('path');
const fs = require('fs');

function ejs(viewDirs, publicDirs) {
    console.log(viewDirs);

    return middleware;


    function middleware(req, res, next) {
        res.render = (function (render) {
            return function (view, options, callback) {
                render.call(this, view, options, (err, html) => {
                    if (err) {
                        return callback ? callback(err) : next(err);
                    }
                    versioningCalc(res, html, view, (transformedView) => {
                        callback ? callback(null, transformedView) : res.send(transformedView);
                    });
                });
            };
        })(res.render);
        next();
    }

    function versioningCalc(res, html, view, send) {
        function versionPrefetches(prefetches) {
            const versionedPrefetches = [];
            prefetches.forEach(prefetchURL => {

                let file;
                for (const viewPath of publicDirs) {
                    file = path.join(viewPath, prefetchURL);
                    if (fs.existsSync(file)) {
                        break;
                    }
                }

                if (!fs.existsSync(file)) {
                    versionedPrefetches.push(prefetchURL);
                    return;
                }
                const fileHash = require('crypto').createHash('md5').update(fs.readFileSync(file)).digest('hex');
                versionedPrefetches.push(`${prefetchURL}?v=${fileHash}`);
            });
            return versionedPrefetches;
        }

        function extractLinks(view) {
            let indexFilePath;
            for (const viewPath of viewDirs) {
                indexFilePath = path.join(viewPath, view + '.ejs');
                if (fs.existsSync(indexFilePath)) {
                    break;
                }
            }
            
            let indexFileContent = fs.readFileSync(indexFilePath, 'utf-8');

            // Resolve dependencies
            const includeRegex = /<%- include\((.*?)\) %>/g;
            let includeMatch;
            while ((includeMatch = includeRegex.exec(indexFileContent)) !== null) {
                let includePath;
                for (const viewPath of viewDirs) {
                    includePath = path.join(viewPath, includeMatch[1].replace(/['"]/g, ''));
                    if (!includePath.endsWith('.ejs')) {
                        includePath += '.ejs';
                    }
                    if (fs.existsSync(includePath)) {
                        break;
                    }
                }
                if (!fs.existsSync(includePath)) {
                    continue;
                }
                const includeContent = fs.readFileSync(includePath, 'utf-8');
                indexFileContent = indexFileContent.replace(includeMatch[0], includeContent);
            }

            // Extract srcs
            const srcRegex = /<script.*?src="(.*?)"/g;
            const imgRegex = /<img.*?src="(.*?)"/g;
            const hrefRegex = /<link(?!.*rel="prefetch").*?href="(.*?)"/g;
            const srcs = [];
            let match;

            while ((match = srcRegex.exec(indexFileContent)) !== null) {
                srcs.push(match[1]);
            }

            while ((match = hrefRegex.exec(indexFileContent)) !== null) {
                srcs.push(match[1]);
            }

            while ((match = imgRegex.exec(indexFileContent)) !== null) {
                srcs.push(match[1]);
            }

            return srcs;
        }

        function makePrefetches(view, additionalPrefetches = []) {
            const srcs = extractLinks(view);
            const prefetches = srcs.concat(additionalPrefetches);
            const versionedPrefetches = versionPrefetches(prefetches)
            const fetches = {};
            prefetches.forEach((prefetch, index) => {
                fetches[prefetch] = versionedPrefetches[index];
            });
            return { prefetches, fetches };
        }

        const additionalPrefetches = res.locals.additionalPrefetches || [];

        const { prefetches, fetches } = makePrefetches(view, additionalPrefetches);

        prefetches.forEach(prefetch => {
            html = html.replace(prefetch, fetches[prefetch]);
        });

        send(html);
    }
}

module.exports = ejs