const { WebUntisAnonymousAuth, WebUntisElementType, WebUntisLoginFromSessionId, WebUntis } = require('webuntis');
const config = require('../config.json');


async function getTimetable(weekOffset) {
    const untis = new WebUntisAnonymousAuth(config.untis.schoolID, config.untis.url);

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

async function attachmentStorageUrl(messageId, username, password) {
    const untis = new WebUntis("hh5810", "Pius.Hartmann", "Asg.9344", "ikarus.webuntis.com");
    await untis.login();
    const JSESSIONID = untis.sessionInformation.sessionId;
    console.log(JSESSIONID);
    const url = `https://storage.webuntis.com/untis-sts-prod/2272700/28a01719-e079-461e-9e1e-3d633c3c87d8?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20250121T170003Z&X-Amz-SignedHeaders=host%3Bx-amz-server-side-encryption-customer-algorithm%3Bx-amz-server-side-encryption-customer-key%3Bx-amz-server-side-encryption-customer-key-md5&X-Amz-Credential=X17QCZ27OUXDS5TWGSK7%2F20250121%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Expires=600&X-Amz-Signature=5ba3ad49882e11ced9fb06c35451ce7d0c3367e12aa16083640676a1174de0c7`
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            //'Cookie': `JSESSIONID=${JSESSIONID}`,
            'x-amz-server-side-encryption-customer-algorithm': 'AES256',
            'x-amz-server-side-encryption-customer-key': 'hxiZuLjx5fCgQbZqSjChqnyfioZdE82Lv1rpSsEhi10=',
            'x-amz-server-side-encryption-customer-key-md5': 'AuLSh50OwceseFmNCdtZHQ=='
        }
    });
    const json = await response.json();
    return json;

}


module.exports = {
    getTimetable,
    getPersonalTimetable,
    attachmentStorageUrl
}