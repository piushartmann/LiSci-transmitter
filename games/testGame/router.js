const { Router } = require('express');
const router = Router();
const logic = require('./logic.js');
const path = require('path');

const viewsDir = path.join(__dirname, 'views')

module.exports = (db) => {

    return router
}