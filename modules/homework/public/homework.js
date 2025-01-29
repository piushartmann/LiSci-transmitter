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

    let taskCount = 0;
    homeworks.forEach(homework => {
      const until = new Date(homework.until.untilStart);
      if (until.toDateString() == day.toDateString()) {
        taskCount++;
      }
    });

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

    if (taskCount > 0) {
      const taskCountElement = document.createElement('div');
      taskCountElement.classList.add('dayTaskCount');
      taskCountElement.innerHTML = taskCount;
      dayElement.appendChild(taskCountElement);
    }

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

  const taskView = document.getElementById('taskView');
  taskView.innerHTML = '';
  let taskCount = 0;
  homeworks.forEach(homework => {
    if (new Date(homework.until.untilStart).getDate() == day.getDate()) {
      taskView.appendChild(buildTaskElement(homework));
      taskCount++;
    }
  })
  loadLanguage(true);

  const dayTaskCount = document.getElementById('dayTaskCount');
  dayTaskCount.innerHTML = taskCount;

}

function untisPreviousWeek() {
  weekOffset--;
  displayTimetable();
}

function untisNextWeek() {
  weekOffset++;
  displayTimetable();
}

function thisWeek() {
  weekOffset = 0;
  displayTimetable();
}

function onLessonClick(lesson) {
  selectedLesson = lesson.id;
  hideModal('timeTableModal');
  const modal = getModal('taskModal');
  modal.querySelector('#selector_other').innerHTML = "Andere (" + lesson.name + ")";
  onClassSelect(modal.querySelector('#classSelector'), modal, true);
}

function displayTimetable() {
  const modal = getModal('timeTableModal');
  showUntisTimetable(modal.querySelector('.timetable'), weekOffset, onLessonClick);
}

function showUntisModal() {
  weekOffset = 0;
  const modal = openModal('timeTableModal');
  displayTimetable(modal);
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
    onClassSelect(classSelector, taskModal, true);
  });

  classSelector.onchange = () => {
    onClassSelect(classSelector, taskModal);
  };
}

function onClassSelect(classSelector, taskModal, first = false) {

  if (classSelector.value == 'other') {
    taskModal.querySelector('#other_select_button').style.display = 'block';
  }
  else {
    taskModal.querySelector('#other_select_button').style.display = 'none';
    selectedLesson = Number(classSelector.value);
  }


  if (selectedLesson == null) {
    if (!first) timeTableModal = showUntisModal();
  } else {
    const until = taskModal.querySelector('#untilSelector');
    until.innerHTML = '';
    appendOption(until, 'Am selben Tag', 0);
    appendOption(until, 'Nächsten Sitzung', 1, true);
    appendOption(until, 'Übernächste Sitzung', 2);
    until.disabled = false;
  }
}

function appendOption(until, text, offset, selected = false) {
  if (offset < 0) return;

  if (offset == 0) {
    const option = document.createElement('option')
    const date = new Date();
    let days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (languageFile && languageFile.days) {
      days = Object.values(languageFile.days);
    }
    option.appendChild(document.createTextNode(`${text} (${days[date.getDay()]} ${date.getDate()}.${(date.getMonth() + 1)})`));
    option.value = selectedLesson;
    option.selected = selected;
    until.appendChild(option);
    return;
  }

  fetch('/homework/internal/getNextLesson', {
    body: JSON.stringify({
      id: selectedLesson,
      offset: offset - 1
    }),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(res => res.json()).then(lesson => {
    if (lesson) {
      const option = document.createElement('option')
      const date = new Date(lesson.start);
      let days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      if (languageFile && languageFile.days) {
        days = Object.values(languageFile.days);
      }
      option.appendChild(document.createTextNode(`${text} (${days[date.getDay()]} ${date.getDate()}.${(date.getMonth() + 1)})`));
      option.value = lesson.id;
      option.selected = selected;
      until.appendChild(option);
    }
  });
}

async function populateNextLesson(offset) {
  if (!selectedLesson) {
    return;
  }
  const res = await fetch('/homework/internal/getNextLesson', {
    body: JSON.stringify({
      id: selectedLesson,
      offset: offset
    }),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(res => res.json())
  return res;
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
        window.navigation.reload();
      }
    }
  }

  console.log(uploadedFiles);

  const modal = getModal('taskModal');
  let data = {};
  data.lesson = Number(selectedLesson);
  data.until = Number(modal.querySelector('#untilSelector').value);
  data.content = modal.querySelector('#content').value;
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

let homeworks = [];
async function fetchHomeworks() {
  await fetch('/homework/internal/getHomeworks').then(res => res.json()).then(data => {
    console.log(data);
    homeworks = data;
    const taskView = document.getElementById('taskView');
    homeworks.forEach(homework => {
      if (new Date(homework.until.untilStart).getDate() == new Date().getDate()) {
        taskView.appendChild(buildTaskElement(homework));
      }
    })
    loadLanguage(true);
  });
}

function buildTaskElement(task) {
  const taskElement = document.createElement('div');
  taskElement.classList.add('taskElement');

  const taskHeader = document.createElement('div');
  taskHeader.classList.add('header');

  const headerTitle = document.createElement('p');
  headerTitle.classList.add('title')
  headerTitle.innerHTML = `${task.lesson.longName} bei ${task.lesson.teacher}`;


  taskHeader.appendChild(headerTitle);

  const profilePic = buildProfilePic(task.userID.profilePic, task.userID.username);
  taskHeader.appendChild(profilePic);

  taskElement.appendChild(taskHeader);

  taskElement.appendChild(document.createElement('hr'));

  const taskContent = document.createElement('div');
  taskContent.classList.add('content');
  taskContent.innerHTML = task.content;

  taskElement.appendChild(taskContent);

  const taskFooter = document.createElement('div')
  taskFooter.appendChild(buildButton('/icons/delete.svg', "delete", () => {
    console.log("Delete")
  }, "interaction delete", ""))

  //taskElement.appendChild(taskFooter)

  return taskElement;
}

fetchHomeworks().then(() => {
  displayCalender();
  const today = new Date();
  today.setDate(today.getDate() - 1)
  loadDayView(today);
})
