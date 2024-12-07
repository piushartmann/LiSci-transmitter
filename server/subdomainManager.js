const path = require('path');
const fs = require('fs');

const subdomainsDir = path.join(__dirname, "subdomains");
let subdomains = [];

if (fs.existsSync(subdomainsDir) && fs.statSync(subdomainsDir).isDirectory()) {
    subdomains = fs.readdirSync(subdomainsDir)
        .filter(file => fs.statSync(path.join(subdomainsDir, file)).isDirectory());
}

function subdomainMiddleware(req, res, next) {
    if (req.subdomains.length > 0) {
        const subdomain = req.subdomains[0];
        if (subdomains.includes(subdomain)) {
            const routerModule = require(path.join(__dirname, "subdomains", subdomain, "router.js"));
            const router = routerModule();
            return router(req, res, next);
        } else {
            return res.status(404).send("Subdomain not found");
        }
    } else {
        next();
    }
}

module.exports = subdomainMiddleware;