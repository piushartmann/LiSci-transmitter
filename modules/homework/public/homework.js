function weekdayIndex(day) {
  let weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let index = weekdays.indexOf(day.toLocaleDateString('en-US', { weekday: 'short' }));
  return index;
}

function displayCalender() {
  const calendarElement = document.getElementById('calendar');
  const today = new Date();
  const todayWeekdayIndex = weekdayIndex(today)

  for (let i = 0; i < 14; i++) {
    const day = new Date();
    day.setDate(today.getDate() - todayWeekdayIndex + i);

    const dayElement = document.createElement('div');
    dayElement.classList.add('day');

    if (i % 7 == 5 || i % 7 == 6) {
      dayElement.classList.add('day-weekend');
    }
    if (i == todayWeekdayIndex) {
      dayElement.classList.add('day-today');
    }
    if (i < todayWeekdayIndex) {
      dayElement.classList.add('day-pastDay');
    }

    dayElement.innerHTML = `
          <div class="day-header">${day.toLocaleDateString('de', { weekday: 'short' })}</div>
          <div class="day-number">${day.toLocaleDateString('de', { month: 'short', day: 'numeric' })}</div>
      `;

    dayElement.onclick = () => loadDayView(day);

    calendarElement.appendChild(dayElement);
  }
  return today;
}

function loadDayView(day) {
  const title = document.getElementById("dayView-Date");
  title.innerHTML = day.toLocaleDateString('de', { weekday: 'long', month: 'short', day: 'numeric' });
  const today = new Date();
  const count = Math.round
    ((day.getTime() - today.getTime()) / (1000 * 3600 * 24));
  const dayCount = document.getElementById("dayView-dayCount");
  if (count == 0) {
    dayCount.innerHTML = `(heute)`
  }
  if (count == 1) {
    dayCount.innerHTML = `(morgen)`
  }
  if (count == -1) {
    dayCount.innerHTML = `(gestern)`
  }
  if (count > 1) {
    dayCount.innerHTML = `(in ${count} Tagen)`
  }
  if (count < -1) {
    dayCount.innerHTML = `(vor ${count * -1} Tagen)`
  }

}

function openCreateTask() {
  openModal('', 'taskModal');
  fetch('/homework/internal/getTimetable').then(res => res.json()).then(uniqueSubjects => {
    buildTimeTable(uniqueSubjects);
  });
}

function buildTimeTable(timetable) {
  const table = document.querySelector('#modal .timetable');
  const dates = [...new Set(timetable.map(lesson => lesson.start.split('T')[0]))];
  console.log(dates);
  table.innerHTML = '';

  //makes all the seperate date elements
  dates.forEach(date => {
    const dateElement = document.createElement('div');
    dateElement.classList.add('day');
    dateElement.innerHTML = date;
    table.appendChild(dateElement);

    timeslotStarts = [...new Set(timetable.filter(lesson => lesson.start.split('T')[0] === date).map(lesson => lesson.start.split('T')[1]))];
    timeslotEnds = [...new Set(timetable.filter(lesson => lesson.start.split('T')[0] === date).map(lesson => lesson.end.split('T')[1]))];
    let startElements = timeslotStarts.map(timeslot => { return new Date(date + "T" + timeslot).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' }) });
    let endElements = timeslotEnds.map(timeslot => { return new Date(date + "T" + timeslot).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' }) });

    startElements.forEach((start, index) => {
      const timeElement = document.createElement('div');
      timeElement.classList.add('time');
      dateElement.appendChild(timeElement);

      const lessons = timetable.filter(lesson => lesson.start.split('T')[0] === date && lesson.start.split('T')[1] === timeslotStarts[index]);
      lessons.forEach(lesson => {
        const lessonElement = document.createElement('div');
        lessonElement.classList.add('lesson');
        lesson.subjects.length > 0 ? lessonElement.innerHTML = lesson.subjects[0].element.longName : lessonElement.innerHTML = lesson.lessonText;
        timeElement.appendChild(lessonElement);
      });
    });
  });
}

const today = displayCalender();
loadDayView(today);

openCreateTask();