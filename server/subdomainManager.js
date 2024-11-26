const path = require('path');
const fs = require('fs');

const subdomains = fs.readdirSync(path.join(__dirname, "subdomains"))
    .filter(file => fs.statSync(path.join(path.join(__dirname, "subdomains"), file)).isDirectory());

function subdomainMiddleware(req, res, next) {
    if (req.subdomains.length > 0) {
        const subdomain = req.subdomains[0];
        console.log(subdomain);
        if (subdomains.includes(subdomain)) {
            const routerModule = require(path.join(__dirname, "subdomains", subdomain, "router.js"));
            const router = routerModule();
            return router(req, res, next);
        } else {
            next();
        }
    } else {
        next();
    }
}

module.exports = subdomainMiddleware;