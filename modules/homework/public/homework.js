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
let selectedLesson = null;
function openCreateTask() {
  selectedLesson = null;
  openModal('', 'selectorModal');
  weekOffset = 0;
  fetchUntisTable();
}

function untisPreviousWeek() {
  weekOffset--;
  fetchUntisTable();
}

function untisNextWeek() {
  weekOffset++;
  fetchUntisTable();
}

function thisWeek() {
  weekOffset = 0;
  fetchUntisTable();
}

function fetchUntisTable() {
  fetch('/homework/internal/getTimetable', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ weekOffset: weekOffset })
  }).then(res => res.json()).then(timetable => {
    buildUntisTable(timetable, document.querySelector('#modal .timetable'), untisClasses, onLessonClick);
  });
}

function onLessonClick(lesson) {
  selectedLesson = lesson;
  hideModal();
  openModal('', 'taskModal');
  addFileEventListerners();
}

function addFileEventListerners() {
  document.querySelectorAll('#modal #files .file_upload').forEach(file => {
    file.onchange = (event) => {
      let newInput = document.createElement('input')
      const index = Array.from(document.querySelectorAll('#modal #files .file_upload')).indexOf(file);
      newInput = document.getElementById('files').appendChild(newInput);
      newInput.id = 'file' + (index + 1);
      newInput.classList.add('online-only');
      newInput.classList.add('file_upload');
      newInput.type = 'file';
      newInput.name = 'file';
      newInput.accept = '*';
      newInput.multiple = true;
      addFileEventListerners();
    };
  });
}

async function submitTask() {
  if (!selectedLesson) {
    return;
  }

  //get all files and upload them to the server
  const files = Array.from(document.querySelectorAll('#modal #files .file_upload'));
  let uploadedFiles = []
  for (const file of files) {
    if (file.files.length > 0) {
      let formData = new FormData();
      formData.append('upload', file.files[0]);

      const res = await fetch('/internal/uploadHomework', {
        method: 'POST',
        body: formData,
        enctype: 'multipart/form-data',
      });
      if (res.ok) {
        const data = await res.text();
        uploadedFiles.push(data);
      }
    }
  }

  console.log(uploadedFiles);

  let data = {};
  data.lesson = selectedLesson.id;
  data.weekOffset = weekOffset;
  data.title = document.querySelector('#modal #title').value;
  data.content = document.querySelector('#modal #content').value;
  data.files = uploadedFiles;

  fetch('/homework/internal/createTask', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json'
    }
  }).then((res) => {
    if (res.status == 200) {
      console.log("Task created");
      hideModal();
    }
    else {
      console.error("Error creating task:", res);
    }
  }).catch((error) => {
    console.error("Error while creating task:", error);
  });
}


const today = displayCalender();
loadDayView(today);