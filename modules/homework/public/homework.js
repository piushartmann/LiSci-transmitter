function weekdayIndex(day) {
  let weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let index = weekdays.indexOf(day.toLocaleDateString('en-US', { weekday: 'short' }));
  return index;
}

function displayCalender(weeks = 2) {
  const calendarElement = document.getElementById('calendar');
  calendarElement.innerHTML = '';
  const today = new Date();
  const todayWeekdayIndex = weekdayIndex(today)

  for (let i = 0; i < 7*weeks; i++) {
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
  parent.location.hash = day.toISOString().split('T')[0];

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
  selectedLessonId = lesson.id;
  selectedLesson = lesson;
  hideModal('timeTableModal');
  const modal = getModal('taskModal');
  modal.querySelector('#classSelector option[value=other]').innerHTML = "Andere (" + lesson.name + ")";
  getUntilOptions(modal.querySelector('#classSelector'), modal, true);
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
let selectedLessonId = null;
let selectedLesson = null;
let files = [];
let editingTask = null;

function openCreateTask(task) {
  const edit = task != null;
  if (edit) editingTask = task;
  else editingTask = null;
  selectedLessonId = edit ? task.lesson.id : null;
  const taskModal = openModal('taskModal');
  addFileEventListerners(taskModal);
  const classSelector = taskModal.querySelector('#classSelector');
  edit ? files = task.files : files = [];

  if (edit) {
    if (editingTask.isAuthor) taskModal.querySelector('#deleteTaskButton').style.display = 'block';
  }

  function makeLessonContent(lesson) {
    return `${lesson.subjects[0].element.longName} bei ${lesson.teachers[0].element.name}`;
  }

  fetch('/homework/internal/getCloseLessons').then(res => res.json()).then(data => {
    classSelector.innerHTML = '';
    if (edit) {
      let lesson = document.createElement('option');
      lesson.value = task.lesson.lessonID;
      lesson.innerHTML = `${task.lesson.longName} bei ${task.lesson.teacher} (aktuell)`;
      lesson.selected = true;
      classSelector.appendChild(lesson);
    }
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
      lesson.selected = edit ? false : true;
      classSelector.appendChild(lesson);
    }
    data.afterLessons.forEach(lesson => {
      let option = document.createElement('option');
      option.value = lesson.id;
      option.innerHTML = makeLessonContent(lesson);
      classSelector.appendChild(option);
    });
    let other = document.createElement('option');
    other.value = 'other';
    other.innerHTML = "Andere";
    classSelector.appendChild(other);

    const until = taskModal.querySelector('#untilSelector');
    until.innerHTML = '';

    if (edit) {
      const option = document.createElement('option')
      const date = new Date(task.until.untilStart);
      let days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; //fallback days
      if (languageFile && languageFile.days) {
        days = Object.values(languageFile.days);
      }
      option.appendChild(document.createTextNode(`Ausgewählt: (${days[date.getDay()]} ${date.getDate()}.${(date.getMonth() + 1)})`));
      option.value = task.until.untilID;
      option.selected = true;
      until.appendChild(option);
    }

    getUntilOptions(classSelector, taskModal, true, edit);
  });

  classSelector.onchange = () => {
    getUntilOptions(classSelector, taskModal);
  };

  return taskModal;
}

function getRandomId() {
  return Math.random().toString(36).substring(7);
}

function addFileInput() {
  const input = document.createElement('input');
  input.type = 'file';
  input.name = 'file';
  input.accept = '*';
  input.classList.add('hiddenInput');
  input.classList.add('file_upload');
  input.onchange = (event) => {
    const file = event.target.files[0];
    const newFile = { new: true, id: getRandomId(), name: file.name, file: file }
    files.push(newFile);
    appendFile(file.name, newFile);
  };
  input.click();
}

function appendFile(filename, file) {
  const modal = getModal('taskModal');
  const filesElement = modal.querySelector('#files');

  const fileElement = document.createElement('div');
  fileElement.classList.add('file');

  const fileButton = buildButton('/icons/file.svg', filename, () => {
    if (!file.new) {
      const url = "https://storage.liscitransmitter.de/transmitterstorage/" + file;
      window.open(url, '_blank');
    }
    else {
      const url = URL.createObjectURL(file.file);
      const newWindow = window.open();
      newWindow.document.write(`<iframe src="${url}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen sandbox=""></iframe>`);
      newWindow.document.close();
    }
  })
  fileElement.appendChild(fileButton);

  const deleteButton = buildButton('/icons/delete.svg', "", () => {
    filesElement.removeChild(fileElement);
    console.log(files);
    console.log(file);
    files = files.filter(f => f.id != file.id);
  });
  fileElement.appendChild(deleteButton);

  filesElement.insertBefore(fileElement, filesElement.querySelector('#newFile'));
}

function getUntilOptions(classSelector, taskModal, first = false, edit = false) {

  if (classSelector.value == 'other') {
    taskModal.querySelector('#other_select_button').style.display = 'block';
  }
  else {
    taskModal.querySelector('#other_select_button').style.display = 'none';
    selectedLessonId = Number(classSelector.value);
  }


  if (selectedLessonId == null) {
    if (!first) timeTableModal = showUntisModal();
  } else {
    const until = taskModal.querySelector('#untilSelector');
    appendOption(until, 'Heute', 0);
    appendOption(until, 'Nächsten Sitzung', 1, !edit);
    appendOption(until, 'Übernächste Sitzung', 2);
    until.disabled = false;
  }
}

function appendOption(until, text, offset, selected = false) {
  if (offset < 0) return;

  if (offset == 0) {
    const option = document.createElement('option')
    const date = new Date();
    let days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; //fallback days
    if (languageFile && languageFile.days) {
      days = Object.values(languageFile.days);
    }
    option.appendChild(document.createTextNode(`${text} (${days[date.getDay()]} ${date.getDate()}.${(date.getMonth() + 1)})`));
    option.value = selectedLessonId;
    option.selected = selected;
    until.appendChild(option);
    return;
  }

  fetch('/homework/internal/getNextLesson', {
    body: JSON.stringify({
      id: selectedLessonId,
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
  if (!selectedLessonId) {
    return;
  }
  const res = await fetch('/homework/internal/getNextLesson', {
    body: JSON.stringify({
      id: selectedLessonId,
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
  if (!selectedLessonId) {
    alert("No lesson selected");
    return;
  }

  const modal = getModal('taskModal');

  if (modal.querySelector('#content').value == "") {
    alert("No content");
    return;
  }

  //get all files and upload them to the server
  let uploadedFiles = []
  for (const file of files) {
    if (!file.new) {
      uploadedFiles.push(file.path);
      continue;
    }

    if (file.file) {
      let formData = new FormData();
      formData.append('upload', file.file);

      const res = await fetch('/internal/uploadHomework?filename=' + file.name, {
        method: 'POST',
        body: formData,
        enctype: 'multipart/form-data'
      });
      if (res.ok) {
        const data = await res.text();
        uploadedFiles.push(data);
      }
      else {
        console.error("Error uploading file:", res);
        return;
      }
    }
  }

  console.log(uploadedFiles);

  let data = {};
  data.lesson = Number(selectedLessonId);
  data.until = Number(modal.querySelector('#untilSelector').value);
  data.content = modal.querySelector('#content').value;
  data.files = uploadedFiles;
  if (editingTask) data.edit = true;
  if (editingTask) data.id = editingTask._id;

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
      navigation.reload()
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
      homework.files = homework.files.map(file => { return { new: false, id: getRandomId(), name: file.filename, path: file.path } });
      if (new Date(homework.until.untilStart).getDate() == new Date().getDate()) {
        taskView.appendChild(buildTaskElement(homework));
      }
    })
    loadLanguage(true);
  });
}

async function download(dataurl, fileName) {
  const response = await fetch(dataurl);
  const blob = await response.blob();

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
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

  const rightHeader = document.createElement('div');
  rightHeader.classList.add('rightHeader');

  if (task.aiAnswer) {
    const ai = buildButton('/icons/ai.svg', "", () => {
      const aiModal = openModal('aiModal');
      aiModal.querySelector('#aiContent').innerHTML = marked.parse(task.aiAnswer);
    }, "", "");
    ai.style.height = "40px";
    ai.style.width = "40px";
    rightHeader.appendChild(ai);
  }

  const edit = buildButton('/icons/edit.svg', "", () => {
    const editModal = openCreateTask(task);
    editModal.querySelector('#taskTitle').innerHTML = "Aufgabe bearbeiten";
    editModal.querySelector('#content').value = task.content;
    task.files.forEach(file => {
      appendFile(file.name, file);
    });
  }, "", "");
  edit.style.height = "40px";
  edit.style.width = "40px";
  rightHeader.appendChild(edit);

  const profilePic = buildProfilePic(task.userID.profilePic, task.userID.username);
  rightHeader.appendChild(profilePic);

  taskHeader.appendChild(rightHeader);
  taskElement.appendChild(taskHeader);

  taskElement.appendChild(document.createElement('hr'));

  const taskContent = document.createElement('div');
  taskContent.classList.add('content');
  taskContent.innerHTML = task.content;

  taskElement.appendChild(taskContent);

  if (task.files.length > 0) {
    taskElement.appendChild(document.createElement('hr'));

    const taskFiles = document.createElement('div');
    taskFiles.classList.add('files');
    task.files.forEach(file => {
      taskFiles.appendChild(buildButton('/icons/view.svg', file.name, () => {
        const url = "https://storage.liscitransmitter.de/transmitterstorage/" + file.path;
        download(url, file.name);
      }))
    });

    taskElement.appendChild(taskFiles);
  }

  return taskElement;
}

function deleteTask() {
  if (!editingTask) return;
  if (!confirm("Are you sure you want to delete this task?")) return;
  fetch('/homework/internal/deleteTask', {
    method: 'POST',
    body: JSON.stringify({ id: editingTask._id }),
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(res => {
    if (res.ok) {
      console.log("Task deleted");
      hideModal();
      navigation.reload()
    }
    else {
      console.error("Error deleting task:", res);
    }
  }).catch(error => {
    console.error("Error while deleting task:", error);
  });
}

let expanded = false;
function expandCalendar() {
  const expandCalendarIndicator = document.getElementById('expandCalendarIndicator');
  const expandCalendarLabel = document.getElementById('expandCalendarLabel');
  expandCalendarIndicator.classList.toggle('expanded');
  expanded ? displayCalender() : displayCalender(4);
  expanded ? expandCalendarLabel.innerHTML = "Mehr anzeigen" : expandCalendarLabel.innerHTML = "Weniger anzeigen";
  expanded = !expanded;
}

fetchHomeworks().then(() => {
  const today = displayCalender();
  if (parent.location.hash) {
    const date = new Date(parent.location.hash.substring(1));
    if (!isNaN(date.getTime())) {
      loadDayView(date);
      return;
    }
  }
  loadDayView(today);
});