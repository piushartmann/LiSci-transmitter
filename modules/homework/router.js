const { Router } = require('express');
const router = Router();

/**
 * @param {MongoConnector} db - The MongoDB connector instance.
 * @returns {Router} The router instance.
 */


module.exports = (db) => {
    const config = require('../../config.json');
    const untis = require('../../server/untis');

    router.get('/', async (req, res) => {
        const untisClasses = await db.getPreference(req.session.userID, 'untisClasses');

        return res.render('homework', {
            untisClasses: untisClasses
        });
    });

    router.post('/internal/getTimetable', async (req, res) => {
        let { weekOffset } = req.body;
        if (!weekOffset) weekOffset = 0;
        if (typeof weekOffset !== "number") return res.status(400).send("Invalid parameters");
        const timetable = await untis.getTimetable(weekOffset);
        return res.json(timetable);
    });

    router.post('/internal/createTask', async (req, res) => {
        const { lesson, weekOffset, title, content, files } = req.body;
        if (typeof lesson !== "number" || typeof title !== "string" || typeof content !== "string" || typeof weekOffset !== "number") return res.status(400).send("Invalid parameters");

        if (typeof files !== "object") return res.status(400).send("files must be a list");
        files.forEach(file => {
            if (typeof file !== "string") return res.status(400).send("files must be a list of strings");
            if (!file.startsWith("https://liscitransmitter.live")) return res.status(400).send("files must originate from this server");
        });

        const timetable = await untis.getTimetable(weekOffset);
        const selectedLesson = timetable.find(l => l.id === Number(lesson));
        if (!selectedLesson) return res.status(400).send("Invalid lesson");

        const homework = await db.createHomework(req.session.userID, selectedLesson, content, title, files);
        if (!homework) return res.status(500).send("Internal server error");
        return res.status(200).send("Success");
    });

    return router;
};