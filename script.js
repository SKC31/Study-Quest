// =====================================================
// STUDY QUEST - script.js  (JavaScript = behaviour)
// =====================================================

// ---------- 1. VARIABLES (our app's data) ----------
let tasks = [];
let studentName = "";
let totalXP = 0;
let currentStreak = 0;
let longestStreak = 0;
let lastCompletedDate = "";   // e.g. "2026-10-02"
let theme = "light";
let currentFilter = "all";

// XP given for each priority
const XP_BY_PRIORITY = { low: 10, medium: 20, high: 30 };
const SUBJECTS = ["Mathematics", "Computer Science", "Programming", "Artificial Intelligence",
                  "Databases", "Physics", "Chemistry", "English", "Other"];

// ---------- 2. SMALL HELPER FUNCTIONS ----------

// Select an element by its id
function $(id) {
  return document.getElementById(id);
}

// Turn a Date into text like "2026-10-02" (using the student's local time)
function getDateString(date) {
  let year = date.getFullYear();
  let month = String(date.getMonth() + 1).padStart(2, "0");
  let day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function getToday() {
  return getDateString(new Date());
}

function getYesterday() {
  let date = new Date();
  date.setDate(date.getDate() - 1);
  return getDateString(date);
}

// Every 100 XP = one level
function getLevel() {
  return Math.floor(totalXP / 100) + 1;
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Make text safe to put inside HTML
function safeText(text) {
  let div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ---------- 3. SAVING AND LOADING (localStorage) ----------

function saveData() {
  localStorage.setItem("sq-tasks", JSON.stringify(tasks));
  localStorage.setItem("sq-name", studentName);
  localStorage.setItem("sq-xp", totalXP);
  localStorage.setItem("sq-streak", currentStreak);
  localStorage.setItem("sq-longest", longestStreak);
  localStorage.setItem("sq-lastDate", lastCompletedDate);
  localStorage.setItem("sq-theme", theme);
}

function loadData() {
  let savedTasks = localStorage.getItem("sq-tasks");
  if (savedTasks) {
    tasks = JSON.parse(savedTasks);
  }
  studentName = localStorage.getItem("sq-name") || "";
  totalXP = Number(localStorage.getItem("sq-xp")) || 0;
  currentStreak = Number(localStorage.getItem("sq-streak")) || 0;
  longestStreak = Number(localStorage.getItem("sq-longest")) || 0;
  lastCompletedDate = localStorage.getItem("sq-lastDate") || "";
  theme = localStorage.getItem("sq-theme") || "light";

  // If the student missed a whole day, the streak is gone
  if (lastCompletedDate !== getToday() && lastCompletedDate !== getYesterday()) {
    currentStreak = 0;
  }
}

// ---------- 4. TASK FUNCTIONS ----------

function addTask() {
  let newTask = {
    id: Date.now(),                       // a unique number
    title: $("task-title").value.trim(),
    subject: $("task-subject").value,
    priority: $("task-priority").value,
    dueDate: $("task-date").value,
    estimatedMinutes: Number($("task-minutes").value),
    completed: false,
    xp: XP_BY_PRIORITY[$("task-priority").value],   // XP is chosen automatically
    completedAt: null
  };
  if (newTask.title === "") {
    return;
  }
  tasks.push(newTask);
  saveData();
  closeModal("task-modal");
  updateScreen();
}

function deleteTask(taskId) {
  // Keep every task except the one we want to delete
  let remainingTasks = [];
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].id !== taskId) {
      remainingTasks.push(tasks[i]);
    }
  }
  tasks = remainingTasks;
  saveData();
  updateScreen();
}

function completeTask(taskId) {
  for (let i = 0; i < tasks.length; i++) {
    let task = tasks[i];
    if (task.id === taskId && task.completed === false) {
      let levelBefore = getLevel();

      task.completed = true;                 // 1. mark as completed
      task.completedAt = getToday();
      totalXP = totalXP + task.xp;           // 2. award XP (level is calculated from it)
      updateStreak();                        // 3. update streak
      saveData();                            // 4. save
      updateScreen();                        // 5. update the screen

      showToast("+" + task.xp + " XP");
      if (getLevel() > levelBefore) {
        $("levelup-text").textContent = "You reached Level " + getLevel() + "!";
        openModal("levelup-modal");
      }
    }
  }
}

// ---------- 5. STREAK LOGIC ----------
function updateStreak() {
  let today = getToday();
  if (lastCompletedDate === today) {
    return;                                  // already counted today
  } else if (lastCompletedDate === getYesterday()) {
    currentStreak = currentStreak + 1;       // studied yesterday too: keep going!
  } else {
    currentStreak = 1;                       // missed a day: start again
  }
  lastCompletedDate = today;
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }
}

// ---------- 6. SHOWING THINGS ON THE PAGE ----------

// Build the HTML for ONE task card
function makeTaskCard(task) {
  let doneClass = task.completed ? " done" : "";
  let checked = task.completed ? "checked disabled" : "";
  let status = task.completed ? "Completed" : capitalize(task.priority) + " • " + task.estimatedMinutes + " minutes";
  return '<div class="card task priority-' + task.priority + doneClass + '">' +
    '<input type="checkbox" ' + checked + ' onchange="completeTask(' + task.id + ')" aria-label="Complete task">' +
    '<div class="task-info">' +
      '<div class="task-title">' + safeText(task.title) + '</div>' +
      '<div class="task-meta">' + safeText(task.subject) + '</div>' +
      '<div class="task-meta">' + status + ' • Due ' + task.dueDate + '</div>' +
      '<div class="task-xp">+' + task.xp + ' XP</div>' +
    '</div>' +
    '<button class="delete-btn" onclick="deleteTask(' + task.id + ')" aria-label="Delete task">🗑️</button>' +
  '</div>';
}

function showEmptyQuest() {
  return '<div class="card empty"><div class="big">📚</div><h2>Your study quest is empty.</h2>' +
    '<p class="muted">Add your first study task and start earning XP.</p>' +
    '<button class="btn primary add-task-btn" onclick="openTaskModal()">+ Add Task</button></div>';
}

function showTodayTasks() {
  let html = "";
  let todayCount = 0;
  let todayDone = 0;
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].dueDate === getToday()) {
      html = html + makeTaskCard(tasks[i]);
      todayCount++;
      if (tasks[i].completed) { todayDone++; }
    }
  }
  if (tasks.length === 0) {
    html = showEmptyQuest();
  } else if (todayCount === 0) {
    html = '<div class="card empty"><div class="big">🗓️</div><h2>Nothing due today</h2>' +
      '<p class="muted">Add a task or check your upcoming tasks.</p></div>';
  } else if (todayDone === todayCount) {
    html = '<div class="card empty"><div class="big">🎉</div><h2>All caught up!</h2>' +
      '<p class="muted">You\'ve completed everything for today.</p></div>' + html;
  }
  $("today-list").innerHTML = html;
}

function showTaskList() {
  let html = "";
  let today = getToday();
  for (let i = 0; i < tasks.length; i++) {
    let task = tasks[i];
    let show = false;
    if (currentFilter === "all") { show = true; }
    if (currentFilter === "today" && task.dueDate === today) { show = true; }
    if (currentFilter === "upcoming" && task.dueDate > today && !task.completed) { show = true; }
    if (currentFilter === "completed" && task.completed) { show = true; }
    if (show) { html = html + makeTaskCard(task); }
  }
  if (tasks.length === 0) {
    html = showEmptyQuest();
  } else if (html === "") {
    html = '<div class="card empty"><p class="muted">No tasks in this list.</p></div>';
  }
  $("task-list").innerHTML = html;
}

function showStats() {
  let completedCount = 0;
  let minutesDone = 0;
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].completed) {
      completedCount++;
      minutesDone = minutesDone + tasks[i].estimatedMinutes;
    }
  }
  let level = getLevel();
  let xpInLevel = totalXP % 100;
  let percent = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  // Dashboard
  $("stat-completed").textContent = completedCount;
  $("stat-xp").textContent = totalXP + " XP";
  $("stat-level").textContent = "Level " + level;
  $("stat-streak").textContent = "🔥 " + currentStreak + (currentStreak === 1 ? " Day" : " Days");
  $("xp-level-text").textContent = "Level " + level;
  $("xp-text").textContent = totalXP + " / " + (level * 100) + " XP";
  $("xp-bar").style.width = xpInLevel + "%";

  // Progress page
  $("p-xp").textContent = totalXP;
  $("p-level").textContent = level;
  $("p-streak").textContent = currentStreak;
  $("p-longest").textContent = longestStreak;
  $("p-total").textContent = tasks.length;
  $("p-done").textContent = completedCount;
  $("p-percent").textContent = percent + "%";
  $("p-minutes").textContent = minutesDone;
  $("p-xp-bar").style.width = xpInLevel + "%";
  $("p-xp-text").textContent = (100 - xpInLevel) + " XP to reach Level " + (level + 1);

  // Subject bars
  let subjectHtml = "";
  for (let i = 0; i < SUBJECTS.length; i++) {
    let total = 0;
    let done = 0;
    for (let j = 0; j < tasks.length; j++) {
      if (tasks[j].subject === SUBJECTS[i]) {
        total++;
        if (tasks[j].completed) { done++; }
      }
    }
    if (total > 0) {
      subjectHtml = subjectHtml + '<div class="subject-row"><div class="row-between"><span>' + SUBJECTS[i] +
        '</span><span class="muted">' + done + ' / ' + total + '</span></div>' +
        '<div class="bar"><div class="bar-fill green" style="width:' + (done / total * 100) + '%"></div></div></div>';
    }
  }
  $("subject-progress").innerHTML = subjectHtml || '<p class="muted">Complete tasks to see progress by subject.</p>';
}

function showGreeting() {
  let hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) { greeting = "Good morning"; }
  else if (hour < 18) { greeting = "Good afternoon"; }
  $("greeting").textContent = greeting + ", " + studentName + " 👋";
  $("today-date").textContent = new Date().toLocaleDateString("en-GB",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// Redraw everything. We call this after every change.
function updateScreen() {
  showGreeting();
  showStats();
  showTodayTasks();
  showTaskList();
  document.body.className = theme === "dark" ? "dark" : "";
  $("theme-select").value = theme;
  $("settings-name").value = studentName;
}

// ---------- 7. PAGES, MODALS, NOTIFICATIONS ----------

function showPage(pageName) {
  let pages = document.querySelectorAll(".page");
  for (let i = 0; i < pages.length; i++) {
    pages[i].classList.add("hidden");
  }
  $(pageName).classList.remove("hidden");

  let navButtons = document.querySelectorAll(".nav-btn");
  for (let i = 0; i < navButtons.length; i++) {
    navButtons[i].classList.toggle("active", navButtons[i].dataset.page === pageName);
  }
}

function openModal(id) { $(id).classList.remove("hidden"); }
function closeModal(id) { $(id).classList.add("hidden"); }

function openTaskModal() {
  $("task-form").reset();
  $("task-date").value = getToday();   // default due date = today
  openModal("task-modal");
  $("task-title").focus();
}

function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");
  setTimeout(function () { $("toast").classList.add("hidden"); }, 1800);
}

function resetEverything() {
  localStorage.clear();
  location.reload();
}

// ---------- 8. EVENT LISTENERS (connect buttons to functions) ----------

// Navigation buttons
let navButtons = document.querySelectorAll(".nav-btn");
for (let i = 0; i < navButtons.length; i++) {
  navButtons[i].addEventListener("click", function () {
    showPage(navButtons[i].dataset.page);
  });
}

// Filter buttons
let filterButtons = document.querySelectorAll(".filter-btn");
for (let i = 0; i < filterButtons.length; i++) {
  filterButtons[i].addEventListener("click", function () {
    currentFilter = filterButtons[i].dataset.filter;
    for (let j = 0; j < filterButtons.length; j++) {
      filterButtons[j].classList.remove("active");
    }
    filterButtons[i].classList.add("active");
    showTaskList();
  });
}

// "+ Add Task" buttons
let addButtons = document.querySelectorAll(".add-task-btn");
for (let i = 0; i < addButtons.length; i++) {
  addButtons[i].addEventListener("click", openTaskModal);
}

$("task-form").addEventListener("submit", function (event) {
  event.preventDefault();      // stop the page from reloading
  addTask();
});
$("cancel-task-btn").addEventListener("click", function () { closeModal("task-modal"); });

// First-time welcome
$("start-btn").addEventListener("click", function () {
  let name = $("name-input").value.trim();
  if (name === "") {
    $("name-input").focus();
    return;
  }
  studentName = name;
  saveData();
  closeModal("welcome-screen");
  updateScreen();
});

// Settings
$("save-name-btn").addEventListener("click", function () {
  let name = $("settings-name").value.trim();
  if (name !== "") {
    studentName = name;
    saveData();
    updateScreen();
    showToast("Name saved");
  }
});
$("theme-select").addEventListener("change", function () {
  theme = $("theme-select").value;
  saveData();
  updateScreen();
});
$("reset-btn").addEventListener("click", function () { openModal("confirm-modal"); });
$("cancel-reset-btn").addEventListener("click", function () { closeModal("confirm-modal"); });
$("confirm-reset-btn").addEventListener("click", resetEverything);
$("levelup-close-btn").addEventListener("click", function () { closeModal("levelup-modal"); });

// ---------- 9. START THE APP ----------
loadData();
updateScreen();
if (studentName === "") {
  openModal("welcome-screen");   // first time: ask for a name
}
