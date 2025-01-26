/**
 * Builds a timetable table and appends it to the provided table element.
 *
 * @param {Array} timetable - An array of lesson objects, each containing details about the lesson.
 * @param {HTMLElement} tableElement - The HTML element where the timetable will be appended.
 * @param {Array} filter - An array of subject names to filter the lessons by.
 * @param {Function} onClickCallback - A callback function to be called when a lesson is clicked.
 * @param {Object} onClickCallback.lesson - The lesson object passed to the callback function.
 * @param {string} onClickCallback.lesson.id - The ID of the lesson.
 * @param {string} onClickCallback.lesson.name - The name of the lesson or event.
 * @param {string} onClickCallback.lesson.room - The room where the lesson takes place.
 * @param {string} onClickCallback.lesson.teacher - The name of the teacher for the lesson.
 * @param {string} onClickCallback.lesson.time - The time when the lesson starts.
 */
function buildUntisTable(timetable, tableElement, filter, onClickCallback) {
  const dates = [...new Set(timetable.map(lesson => lesson.start.split('T')[0]))];
  tableElement.innerHTML = '';

  const MiPaHour = 6;

  //find the max number of timeslots in a day to later fill up the days with empty timeslots
  let mostTimeslots = 0;
  dates.forEach(date => {
    let i = [...new Set(timetable.filter(lesson => lesson.start.split('T')[0] === date).map(lesson => lesson.start.split('T')[1]))]
    if (i.length > mostTimeslots) mostTimeslots = i.length;
  });

  dates.forEach(date => {
    const dateElement = document.createElement('div');
    dateElement.classList.add('day');
    dateElement.innerHTML = date;
    tableElement.appendChild(dateElement);

    timeslotStarts = [...new Set(timetable.filter(lesson => lesson.start.split('T')[0] === date).map(lesson => lesson.start.split('T')[1]))];
    let localTimeSlotStarts = timeslotStarts.map(timeslot => { return new Date(date + "T" + timeslot).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' }) });

    localTimeSlotStarts.forEach((time, index) => {

      //insert an empty timeslot for Mittags Pause
      if (index == MiPaHour) {
        const mipa = document.createElement('div');
        mipa.classList.add('time');
        dateElement.appendChild(mipa);
      }

      const timeElement = document.createElement('div');
      timeElement.classList.add('time');
      dateElement.appendChild(timeElement);

      let lessons = timetable.filter(lesson => lesson.start.split('T')[0] === date && lesson.start.split('T')[1] === timeslotStarts[index]); //find all lessons, that start in this timeslot
      if (filter.length > 1 || (filter.length == 1 && filter[0] != "")) lessons = lessons.filter(lesson => lesson.subjects.length == 0 || filter.includes(lesson.subjects[0].element.displayname)); //only allow lessons with the right subjects or no subjects (likely an event) only run this step, when the filter is not empty
      lessons.forEach((lesson, index) => {

        const lessonElement = document.createElement('div');
        lessonElement.classList.add('lesson');
        lessonElement.classList.add('lesson-' + lesson.cellState);
        lessonElement.dataset.id = lesson.id;

        const lessonSubject = document.createElement('p');
        lessonSubject.classList.add('lessonSubject');
        lesson.subjects.length > 0 ? lessonSubject.innerHTML = lesson.subjects[0].element.displayname : lessonSubject.innerHTML = lesson.lessonText;
        lessonSubject.style.backgroundColor = lesson.subjects.length > 0 ? lesson.subjects[0].element.backColor : 'grey';
        lessonElement.appendChild(lessonSubject);

        const lessonData = document.createElement('div');
        lessonData.classList.add('lessonData');

        if (lesson.rooms.length > 0) {
          const lessonRoom = document.createElement('p');
          lessonRoom.classList.add('lessonRoom');
          lessonRoom.classList.add('room-' + lesson.rooms[0].state);
          lesson.rooms.length > 0 ? lessonRoom.innerHTML = lesson.rooms[0].element.displayname : lessonRoom.innerHTML = '';
          lessonData.appendChild(lessonRoom);
        }

        if (lesson.teachers.length > 0) {
          const lessonTeacher = document.createElement('p');
          lessonTeacher.classList.add('lessonTeacher');
          lessonTeacher.classList.add('teacher-' + lesson.teachers[0].state);
          lesson.teachers.length > 0 ? lessonTeacher.innerHTML = lesson.teachers[0].element.name : lessonTeacher.innerHTML = '';
          lessonData.appendChild(lessonTeacher);
        }

        lessonElement.appendChild(lessonData);

        if (onClickCallback) {
          timeElement.addEventListener('click', () => onClickCallback({
            id: lesson.id,
            name: lesson.subjects.length > 0 ? lesson.subjects[0].element.longName : lesson.lessonText,
            room: lesson.rooms.length > 0 ? lesson.rooms[0].element.displayname : '',
            teacher: lesson.teachers.length > 0 ? lesson.teachers[0].element.name : '',
            time: time
          }));
        }
        timeElement.appendChild(lessonElement);
      });
    });

    //fill up the timeslots with empty timeslots, so that all days have the same amount of timeslots
    if (timeslotStarts.length < mostTimeslots) {
      for (let i = timeslotStarts.length; i < mostTimeslots; i++) {
        const timeElement = document.createElement('div');
        timeElement.classList.add('time');
        dateElement.appendChild(timeElement);
      }
    }

  });
}