function buildUntisTable(timetable, tableElement, filter) {
  const dates = [...new Set(timetable.map(lesson => lesson.start.split('T')[0]))];
  tableElement.innerHTML = '';

  const MiPaHour = 7;

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

        if (lesson.rooms.length > 1) {
          const lessonRoom = document.createElement('p');
          lessonRoom.classList.add('lessonRoom');
          lessonRoom.classList.add('room-' + lesson.rooms[0].state);
          lesson.rooms.length > 0 ? lessonRoom.innerHTML = lesson.rooms[0].element.displayname : lessonRoom.innerHTML = '';
          lessonData.appendChild(lessonRoom);
        }

        if (lesson.teachers.length > 1) {
          const lessonTeacher = document.createElement('p');
          lessonTeacher.classList.add('lessonTeacher');
          lessonTeacher.classList.add('teacher-' + lesson.teachers[0].state);
          lesson.teachers.length > 0 ? lessonTeacher.innerHTML = lesson.teachers[0].element.name : lessonTeacher.innerHTML = '';
          lessonData.appendChild(lessonTeacher);
        }

        lessonElement.appendChild(lessonData);
        timeElement.appendChild(lessonElement);
      });
    });
  });
}