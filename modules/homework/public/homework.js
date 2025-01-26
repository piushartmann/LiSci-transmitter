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

function onLessonClick(lesson) {
  selectedLesson = lesson.id;
  hideModal('timeTableModal');
  const modal = getModal('taskModal');
  modal.querySelector('#selector_other').innerHTML = "Andere (" + lesson.name+")";

}

function fetchUntisTable(modal) {
  if (!modal) modal = getModal('timeTableModal');
  fetch('/homework/internal/getTimetable', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ weekOffset: weekOffset })
  }).then(res => res.json()).then(timetable => {
    buildUntisTable(timetable, modal.querySelector('.timetable'), untisClasses, onLessonClick);
  });
}

function showUntisModal(){
  weekOffset = 0;
  const modal = openModal('timeTableModal');
  fetchUntisTable(modal);
  return modal;
}

function addFileEventListerners(modal) {
  modal.querySelectorAll('#files .file_upload').forEach(file => {
    file.onchange = (event) => {
      let newInput = document.createElement('input')
      const index = Array.from(modal.querySelectorAll('#files .file_upload')).indexOf(file);
      newInput = modal.querySelector('#files').appendChild(newInput);
      newInput.id = 'file' + (index + 1);
      newInput.classList.add('online-only');
      newInput.classList.add('file_upload');
      newInput.type = 'file';
      newInput.name = 'file';
      newInput.accept = '*';
      newInput.multiple = true;
      addFileEventListerners(modal);
    };
  });
}

let weekOffset = 0;
let selectedLesson = null;
function openCreateTask() {
  selectedLesson = null;
  const taskModal = openModal('taskModal');
  addFileEventListerners(taskModal);
  const classSelector = taskModal.querySelector('#classSelector');

  function makeLessonContent(lesson) {
    return `${lesson.subjects[0].element.longName} bei ${lesson.teachers[0].element.name}`;
  }

  fetch('/homework/internal/getCloseLessons').then(res => res.json()).then(data => {
    classSelector.innerHTML = '';
    data.beforeLessons.forEach(lesson => {
      let option = document.createElement('option');
      option.value = lesson.id;
      option.innerHTML = makeLessonContent(lesson);
      classSelector.appendChild(option);
    });
    if (data.currentLesson) {
      let lesson = document.createElement('option');
      lesson.value = data.currentLesson.id;
      lesson.innerHTML = makeLessonContent(data.currentLesson);
      lesson.selected = true;
      classSelector.appendChild(lesson);
    }
    data.afterLessons.forEach(lesson => {
      let option = document.createElement('option');
      option.value = lesson.id;
      option.innerHTML = makeLessonContent(lesson);
      classSelector.appendChild(option);
    });
    let other = document.createElement('option');
    other.id = 'selector_other';
    other.value = 'other';
    other.innerHTML = 'Andere';
    classSelector.appendChild(other);
    selectedLesson = Number(classSelector.value);
  });

  classSelector.onchange = () => {
    if (classSelector.value == 'other') {
      timeTableModal = showUntisModal();
      taskModal.querySelector('#other_select_button').style.display = 'block';
    }else{
      taskModal.querySelector('#other_select_button').style.display = 'none';
      selectedLesson = Number(classSelector.value);
    }
  };
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

openCreateTask();