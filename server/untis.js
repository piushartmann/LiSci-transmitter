const { WebUntisAnonymousAuth, WebUntisElementType, WebUntisLoginFromSessionId, WebUntis } = require('webuntis');
const config = require('../config.json');
const fs = require('fs');
const path = require('path');

const untis = new WebUntisAnonymousAuth(config.untis.schoolID, config.untis.url);

let timetableCache = null;

fetchTimetable();
setInterval(async () => {
    try {
        fetchTimetable();

    } catch (error) {
        console.error(error);
    }


}, config.untis.cacheTime || 1000 * 60 * 5);

async function fetchTimetable() {
    try {
        await untis.login();
        const classes = await untis.getClasses();
        const classId = classes.find(cls => cls.name === config.untis.className).id;

        const lookAhead = config.untis.cacheLookAhead || 7;
        const lookBack = config.untis.cacheLookBack || 1;

        let timetable = []

        for (let i = -lookBack; i <= lookAhead; i++) {
            try {
                const date = new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 7 * i));
                const lessons = await untis.getTimetableForWeek(date, classId, WebUntisElementType.CLASS, formatId = 1);
                timetable = timetable.concat(lessons);
            } catch (error) {
            }
        }

        //fs.writeFileSync(path.join(__dirname, 'timetable.json'), JSON.stringify(timetable, null, 2));
        timetable.forEach(lesson => {
            const date = lesson.date.toString();
            let startTime = lesson.startTime.toString();
            if (startTime.length === 3) startTime = '0' + startTime;
            lesson.start = new Date(new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${startTime.slice(0, 2)}:${startTime.slice(2, 4)}:00`))

            let endTime = lesson.endTime.toString();
            if (endTime.length === 3) endTime = '0' + endTime;
            lesson.end = new Date(new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${endTime.slice(0, 2)}:${endTime.slice(2, 4)}:00`))
        });

        timetable.sort((a, b) => a.start - b.start);

        untis.logout();

        timetableCache = timetable;
        return;
    } catch (error) {
        console.error(error.message);
        return;
    }
}

Date.prototype.getWeek = function () {
    var onejan = new Date(this.getFullYear(), 0, 1);
    var dayOfWeek = onejan.getDay(); // Get the day of the week for January 1st
    var dayOffset = (dayOfWeek <= 4 ? dayOfWeek : dayOfWeek - 7); // Adjust the offset to start the week on Monday
    var onejanAdjusted = new Date(onejan.setDate(onejan.getDate() - dayOffset)); // Adjust January 1st to the start of the week
    var today = new Date(this.getFullYear(), this.getMonth(), this.getDate());
    var dayOfYear = ((today - onejanAdjusted + 86400000) / 86400000);
    return Math.ceil(dayOfYear / 7);
};

async function getTimetable(offset, timeSpan = "week") {
    if (!timetableCache) {
        await fetchTimetable()
        if (!timetableCache) {
            console.error("Error while fetching timetable")
            return [];
        }
    }
    const now = Date.now();
    // const now = new Date("2025-01-22T09:00:00.000Z").getTime();
    const day = 1000 * 60 * 60 * 24;
    const currentWeek = new Date(now).getWeek();
    const filteredTimetable = timetableCache.filter(lesson => {
        if (timeSpan === "day") {
            const targetDate = new Date(now + offset * day);
            return lesson.start.toDateString() === targetDate.toDateString();
        }
        if (timeSpan === "week") {
            return lesson.start.getWeek() === currentWeek + offset;
        }
        if (timeSpan === "all") {
            return true;
        }
    });
    return filteredTimetable;

}

async function getUntisClassesForUser(username, password) {
    try {
        const untis = new WebUntis(config.untis.schoolID, username, password, config.untis.url);

        const today = new Date();
        // Calculate Monday of the current week (assuming week starts on Monday)
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;  // Adjust if today is Sunday
        const rangeStart = new Date(today);
        rangeStart.setDate(today.getDate() - diff);

        // Calculate Sunday of the next week: Monday + 13 days
        const rangeEnd = new Date(rangeStart);
        rangeEnd.setDate(rangeStart.getDate() + 13);

        await untis.login();
        const classes = await untis.getOwnTimetableForRange(rangeStart, rangeEnd);
        await untis.logout();

        const classNames = classes.filter(cls => cls.su && cls.su[0] && cls.su[0].name).map(cls => cls.su[0].name);
        const uniqueClassNames = [...new Set(classNames)];

        return uniqueClassNames;
    }
    catch (error) {
        if (error.message.split('{')[0] === 'Failed to login. ')
        {
            console.error("Someone tried to login with invalid untis credentials");
            return null;
        }
        console.error(error.message);
        return null;
    }
}


module.exports = {
    getTimetable,
    getUntisClassesForUser
}