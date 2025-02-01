const { Router } = require('express');
const router = Router();
const sanitizeHtml = require('sanitize-html');

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


    /**
     * Determines if a lesson is canceled based on its state, location, and teacher's availability.
     *
     * @param {Object} lesson - The lesson object to check.
     * @returns {boolean} - Returns true if the lesson is canceled, otherwise false.
     */
    function lessonIsCanceled(lesson) {
        if (lesson.cellState === "CANCEL" || lesson.cellState === "FREE") return true; //filter out canceled and free lessons
        if (lesson.rooms[0].element.displayname === "z.H.") return true; //filter out lessons that are at home
        if (lesson.teachers[0].state === "ABSENT" || lesson.teachers[0].element.name === "---") return true; //filter out lessons where the teacher is absent
        return false;
    }

    /**
    * Get the next lesson of a specific lesson.
    *
    * @param {number} id - The id of the lesson.
    * @param {number} offset - The offset of the lesson.
    * @returns {object} The next lesson.
    */
    router.post('/internal/getNextLesson', async (req, res) => {
        //parse parameters and check if they are valid
        const id = req.body.id;
        const offset = req.body.offset || 0;
        if (typeof id !== "number" || typeof offset !== "number") return res.status(400).send("Invalid parameters");
        //get the timetable and the selected lesson
        const timetable = await untis.getTimetable(0, "all");
        const selectedLesson = timetable.find(l => l.id === id);
        if (!selectedLesson) return res.status(400).send("Invalid lesson");
        //filter the timetable to only include relevant lessons
        const nextLesson = timetable.filter(l => {
            if (!(l.subjects && l.subjects[0])) return false; //filter out events (no subjects)
            if (!(l.subjects[0].element.displayname === selectedLesson.subjects[0].element.displayname)) return false; //filter lessons that have the same subject
            if (lessonIsCanceled(l)) return false; //filter out canceled lessons
            if (!(l.start.getTime() > selectedLesson.end.getTime())) return false; //filter out lessons that are before the selected lesson
            return true;
        });
        //sort the lessons by start time and remove duplicates
        const uniqueLessons = [...new Set(nextLesson.map(l => l.start.getDate()))].map(date => nextLesson.find(l => l.start.getDate() === date));
        //return the lesson at the offset
        return res.json(uniqueLessons[offset]);
    });

    router.post('/internal/createTask', async (req, res) => {
        //parse parameters and check if they are valid
        let { lesson, until, content, files } = req.body;
        if (typeof lesson !== "number" || typeof content !== "string" || typeof until !== "number") return res.status(400).send("Invalid parameters");
        lesson = sanitizeHtml(lesson);

        if (typeof files !== "object") return res.status(400).send("files must be a list");
        files.forEach(file => {
            if (typeof file !== "string") return res.status(400).send("files must be a list of strings");
        });

        //get the timetable and the selected lesson
        const timetable = await untis.getTimetable(0, "all");
        const selectedLesson = timetable.find(l => l.id == lesson);
        if (!selectedLesson) return res.status(400).send("Invalid lesson");

        const untilLesson = timetable.find(l => l.id === until);
        if (!untilLesson) return res.status(400).send("Invalid until lesson");

        //create the homework and check if it was successful
        const homework = await db.createHomework(req.session.userID, selectedLesson, untilLesson, content, files);
        if (!homework) return res.status(500).send("Internal server error");
        //return success
        return res.status(200).send("Success");
    });

    //get all homeworks
    router.get('/internal/getHomeworks', async (req, res) => {
        const homeworks = await db.getHomeworks();
        return res.json(homeworks);
    })

    return router;
};