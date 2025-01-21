const { WebUntisAnonymousAuth, WebUntisElementType, WebUntisLoginFromSessionId, WebUntis } = require('webuntis');
const config = require('../config.json');
const fs = require('fs');
const path = require('path');


async function getTimetable(weekOffset) {
    const untis = new WebUntisAnonymousAuth(config.untis.schoolID, config.untis.url);
    console.log(untis);

    try {
        await untis.login();
        const classes = await untis.getClasses();
        const classId = classes.find(cls => cls.name === config.untis.className).id;
        const timetable = await untis.getTimetableForWeek(new Date(new Date().getTime() + (weekOffset * 1000 * 60 * 60 * 24 * 7)), classId, WebUntisElementType.CLASS, formatId = 1);

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

        return timetable;
    } catch (error) {
        console.error(error);
        return [];
    }

}

async function getPersonalTimetable(weekOffset, JSESSIONID) {
    const untis = new WebUntisLoginFromSessionId(config.untis.schoolID, config.untis.url, JSESSIONID);
    console.log(await untis.login());
    untis.sessionInformation.sessionId = JSESSIONID;
    untis.anonymous = false;

    const timetable = await untis.getOwnTimetableForToday();

    console.log(timetable);
}


module.exports = {
    getTimetable,
    getPersonalTimetable
}