import { elements } from '../dom.js';

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
const modeLabels = {
  clock: '实时',
  pomodoro: '专注 25:00',
  stopwatch: '正计时',
  countdown: '倒计时'
};
const presetSeconds = {
  pomodoro: 25 * 60,
  countdown: 10 * 60
};
const digitSegments = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'],
  '1': ['b', 'c'],
  '2': ['a', 'b', 'g', 'e', 'd'],
  '3': ['a', 'b', 'c', 'd', 'g'],
  '4': ['f', 'g', 'b', 'c'],
  '5': ['a', 'f', 'g', 'c', 'd'],
  '6': ['a', 'f', 'e', 'd', 'c', 'g'],
  '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  '9': ['a', 'b', 'c', 'd', 'f', 'g']
};
const timerState = {
  mode: 'clock',
  running: false,
  elapsed: 0,
  remaining: presetSeconds.pomodoro,
  lastTick: null
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function renderSevenSegment(value) {
  elements.time.setAttribute('aria-label', value);
  elements.time.dataset.value = value;
  elements.time.innerHTML = [...value].map((character) => {
    if (character === ':') {
      return '<span class="seg-colon" aria-hidden="true"><i></i><i></i></span>';
    }
    const activeSegments = digitSegments[character] || [];
    const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((segment) => {
      const activeClass = activeSegments.includes(segment) ? ' active' : '';
      return `<i class="seg seg-${segment}${activeClass}"></i>`;
    }).join('');
    return `<span class="seg-digit" aria-hidden="true">${segments}</span>`;
  }).join('');
}

function getInputSeconds(fallbackMinutes) {
  const value = Number.parseInt(elements.timerMinutes?.value, 10);
  const minutes = Number.isFinite(value) ? Math.min(Math.max(value, 1), 999) : fallbackMinutes;
  if (elements.timerMinutes) elements.timerMinutes.value = minutes;
  return minutes * 60;
}

function setMode(mode) {
  timerState.mode = mode;
  timerState.running = false;
  timerState.elapsed = 0;
  timerState.lastTick = null;

  if (mode === 'pomodoro') {
    if (elements.timerMinutes) elements.timerMinutes.value = 25;
    timerState.remaining = presetSeconds.pomodoro;
  } else if (mode === 'countdown') {
    if (elements.timerMinutes) elements.timerMinutes.value = 10;
    timerState.remaining = presetSeconds.countdown;
  } else {
    timerState.remaining = 0;
  }

  elements.clockModeButtons?.forEach((button) => {
    const isActive = button.dataset.clockMode === mode;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });
  if (elements.clockModeLabel) elements.clockModeLabel.textContent = modeLabels[mode];
  if (elements.timerSetup) elements.timerSetup.hidden = !['pomodoro', 'countdown'].includes(mode);
  renderClock();
}

function updateCalendarMeta(now) {
  const dayText = weekdays[(now.getDay() + 6) % 7];
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const nextYear = new Date(now.getFullYear() + 1, 0, 1);
  const yearProgress = ((now - yearStart) / (nextYear - yearStart)) * 100;

  elements.date.textContent = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} 周${dayText}`;
  elements.yearPercent.textContent = `${yearProgress.toFixed(1)}%`;
  elements.yearBar.style.width = `${yearProgress}%`;

  const hour = now.getHours();
  if (hour < 6) elements.greeting.textContent = 'Silent Night';
  else if (hour < 11) elements.greeting.textContent = 'Morning Light';
  else if (hour < 14) elements.greeting.textContent = 'Noon Breeze';
  else if (hour < 18) elements.greeting.textContent = 'Soft Afternoon';
  else elements.greeting.textContent = 'Starlit Evening';
}

function renderClock() {
  const now = new Date();
  updateCalendarMeta(now);

  if (timerState.mode === 'clock') {
    renderSevenSegment(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
  } else if (timerState.mode === 'stopwatch') {
    renderSevenSegment(formatTime(timerState.elapsed));
  } else {
    renderSevenSegment(formatTime(timerState.remaining));
  }
}

function tick() {
  const now = Date.now();
  if (timerState.running && timerState.mode !== 'clock') {
    const delta = timerState.lastTick ? Math.floor((now - timerState.lastTick) / 1000) : 0;
    if (delta > 0) {
      timerState.lastTick += delta * 1000;
      if (timerState.mode === 'stopwatch') {
        timerState.elapsed += delta;
      } else {
        timerState.remaining = Math.max(0, timerState.remaining - delta);
        if (timerState.remaining === 0) timerState.running = false;
      }
    }
  }
  renderClock();
}

export function updateClock() {
  tick();
}

export function initClockControls() {
  elements.clockModeButtons?.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      setMode(button.dataset.clockMode || 'clock');
    });
  });

  elements.timerStart?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (timerState.mode === 'clock') setMode('pomodoro');
    if (['pomodoro', 'countdown'].includes(timerState.mode) && timerState.remaining <= 0) {
      timerState.remaining = getInputSeconds(timerState.mode === 'pomodoro' ? 25 : 10);
    }
    timerState.running = true;
    timerState.lastTick = Date.now();
    renderClock();
  });

  elements.timerPause?.addEventListener('click', (event) => {
    event.stopPropagation();
    timerState.running = false;
    timerState.lastTick = null;
    renderClock();
  });

  elements.timerReset?.addEventListener('click', (event) => {
    event.stopPropagation();
    timerState.running = false;
    timerState.elapsed = 0;
    timerState.lastTick = null;
    timerState.remaining = ['pomodoro', 'countdown'].includes(timerState.mode)
      ? getInputSeconds(timerState.mode === 'pomodoro' ? 25 : 10)
      : 0;
    renderClock();
  });

  elements.timerMinutes?.addEventListener('change', () => {
    if (['pomodoro', 'countdown'].includes(timerState.mode) && !timerState.running) {
      timerState.remaining = getInputSeconds(timerState.mode === 'pomodoro' ? 25 : 10);
      renderClock();
    }
  });

  setMode('clock');
  window.setInterval(tick, 1000);
}

export function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const firstOffset = (firstDay.getDay() + 6) % 7;
  const cells = weekdays.map((day) => `<span class="weekday">${day}</span>`);

  for (let index = 0; index < firstOffset; index += 1) cells.push('<span></span>');
  for (let date = 1; date <= lastDate; date += 1) {
    cells.push(`<span class="${date === now.getDate() ? 'today' : ''}">${date}</span>`);
  }

  elements.calendarGrid.innerHTML = cells.join('');
}
