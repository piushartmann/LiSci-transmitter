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

    router.get('/internal/getCloseLessons', async (req, res) => {
        const filter = await db.getPreference(req.session.userID, 'untisClasses');

        const timetable = await untis.getTimetable(0, "day");
        const now = Date.now();
        //const now = new Date("2025-01-22T09:00:00.000Z").getTime();
        let closeLessons = timetable.filter(l => {
            if (!(l.subjects && l.subjects[0])) return false;
            return (Math.abs(l.start.getTime() - now) < 1000 * 60 * 60 || Math.abs(l.end.getTime() - now) < 1000 * 60 * 60)
                && (!filter || filter.includes(l.subjects[0].element.displayname))
        }); //filter lessons that are within an hour of now and match the filter

        closeLessons = [...new Set(closeLessons.map(l => l.subjects[0].element.displayname))].map(name => closeLessons.find(l => l.subjects[0].element.displayname === name)); //remove duplicates

        const currentLesson = closeLessons.find(l => l.start.getTime() < now && l.end.getTime() > now);
        let beforeLessons = closeLessons.filter(l => l.end.getTime() < now);
        let afterLessons = closeLessons.filter(l => l.start.getTime() > now);

        let response = {
            beforeLessons,
            afterLessons
        }
        if (currentLesson) {
            response.currentLesson = currentLesson;
        }
        return res.json(response);
    });

    router.post('/internal/getNextLesson', async (req, res) => {
        const id = req.body.id;
        const offset = req.body.offset || 0;
        if (typeof id !== "number" || typeof offset !== "number") return res.status(400).send("Invalid parameters");
        const timetable = await untis.getTimetable(0, "all");
        const selectedLesson = timetable.find(l => l.id === id);
        if (!selectedLesson) return res.status(400).send("Invalid lesson");
        const nextLesson = timetable.filter(l => {
            if (!(l.subjects && l.subjects[0])) return false;
            return l.subjects[0].element.displayname === selectedLesson.subjects[0].element.displayname && l.start.getTime() > selectedLesson.end.getTime();
        });
        const uniqueLessons = [...new Set(nextLesson.map(l => l.start.getDate()))].map(date => nextLesson.find(l => l.start.getDate() === date));
        return res.json(uniqueLessons[offset]);
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