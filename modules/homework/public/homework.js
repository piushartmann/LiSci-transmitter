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

let weekOffset = 0;
function openCreateTask() {
  openModal('', 'taskModal');
  weekOffset = 0;
  fetchUntisTable();
}

function untisPreviousWeek(){
  weekOffset--;
  fetchUntisTable();
}

function untisNextWeek(){
  weekOffset++;
  fetchUntisTable();
}

function thisWeek(){
  weekOffset = 0;
  fetchUntisTable();
}

function fetchUntisTable(){
  fetch('/homework/internal/getTimetable', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({weekOffset: weekOffset})
  }).then(res => res.json()).then(timetable => {
    buildUntisTable(timetable, document.querySelector('#modal .timetable'), untisClasses);
  });
}

const today = displayCalender();
loadDayView(today);

openCreateTask(); //for testing