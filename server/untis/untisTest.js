const { WebUntisAnonymousAuth, WebUntisElementType } = require('webuntis');
const fs = require('fs');
const config = require('../../config.json');

async function untisTest() {
    const untis = new WebUntisAnonymousAuth(config.untis.schoolID, config.untis.url);

    await untis.login();
    const classes = await untis.getClasses();
    const classId = classes.find(cls => cls.name === config.untis.className).id;
    const timetable = await untis.getTimetableForWeek(new Date(), classId, WebUntisElementType.CLASS, formatId=1);

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

    fs.writeFileSync('./server/untis/timetable.json', JSON.stringify(timetable, null, 2));
    
}

untisTest();