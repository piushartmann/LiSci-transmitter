const timetable = document.querySelector('.timetable');
let weekOffset = 0;

showUntisTimetable(timetable, weekOffset)

function untisPreviousWeek() {
    weekOffset--;
    showUntisTimetable(timetable, weekOffset)
  }
  
  function untisNextWeek() {
    weekOffset++;
    showUntisTimetable(timetable, weekOffset)
  }
  
  function thisWeek() {
    weekOffset = 0;
    showUntisTimetable(timetable, weekOffset)
  }