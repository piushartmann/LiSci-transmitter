const path = require('path');
const fs = require('fs');

const subdomains = fs.readdirSync( path.join(__dirname, "subdomains")).filter(file => fs.statSync(path.join( path.join(__dirname, "subdomains"), file)).isDirectory());

function subdomainMiddleware(req, res, next) {
    if (req.subdomains.length > 0) {
        const subdomain = req.subdomains[0];
        console.log(subdomain);
        if (subdomains.includes(subdomain)) {
            const router = require(path.join(__dirname, "subdomains", subdomain, "router.js"));
            console.log("Loaded subdomain router");
            if (typeof router === 'function') {
                router(req, res, next);
            } else if (typeof router.handle === 'function') {
                router.handle(req, res, next);
            } else {
                next(new Error('Router is not a function'));
            }
        } else {
            next();
        }
    }
    else{
        next();
    }
}

module.exports = subdomainMiddleware;