let quotes = [];

const fallbackQuotes = [
  { text: '风从很远的地方来，也会在你手边停一会儿。', source: '云外庭院' },
  { text: '慢慢来，比较快。', source: '个人语录' }
];

const bookmarks = [
  { title: 'Github', url: 'https://github.com', icon: '⚒' },
  { title: 'Bilibili', url: 'https://www.bilibili.com', icon: '◈' },
  { title: 'Notion', url: 'https://www.notion.so', icon: '✧' },
  { title: 'Mail', url: 'https://mail.google.com', icon: '✉' }
];

const storageKeys = {
  notes: 'dashboard.notes',
  quoteIndex: 'dashboard.quoteIndex',
  layout: 'dashboard.widgetLayout',
  sparks: 'dashboard.sparks',
  weather: 'dashboard.weather'
};

const elements = {
  desktop: document.querySelector('#desktop'),
  greeting: document.querySelector('#greeting'),
  time: document.querySelector('#time'),
  date: document.querySelector('#date'),
  calendarGrid: document.querySelector('#calendarGrid'),
  yearPercent: document.querySelector('#yearPercent'),
  yearBar: document.querySelector('#yearBar'),
  quoteCard: document.querySelector('#quoteCard'),
  quoteText: document.querySelector('#quoteText'),
  quoteSource: document.querySelector('#quoteSource'),
  bookmarkGrid: document.querySelector('#bookmarkGrid'),
  notesToggle: document.querySelector('#notesToggle'),
  notesPanel: document.querySelector('#notesPanel'),
  closeNotes: document.querySelector('#closeNotes'),
  noteInput: document.querySelector('#noteInput'),
  addNote: document.querySelector('#addNote'),
  noteWall: document.querySelector('#noteWall'),
  resetLayout: document.querySelector('#resetLayout'),
  sparkButton: document.querySelector('#sparkButton'),
  sparkCount: document.querySelector('#sparkCount'),
  refreshWeather: document.querySelector('#refreshWeather'),
  weatherIcon: document.querySelector('#weatherIcon'),
  weatherTemp: document.querySelector('#weatherTemp'),
  weatherText: document.querySelector('#weatherText'),
  weatherPlace: document.querySelector('#weatherPlace')
};

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

function readStorage(key, fallback) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const dayText = weekdays[(now.getDay() + 6) % 7];
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const nextYear = new Date(now.getFullYear() + 1, 0, 1);
  const yearProgress = ((now - yearStart) / (nextYear - yearStart)) * 100;

  elements.time.textContent = `${hours}:${minutes}`;
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

function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const firstOffset = (firstDay.getDay() + 6) % 7;
  const cells = weekdays.map((day) => `<span class="weekday">${day}</span>`);

  for (let index = 0; index < firstOffset; index += 1) {
    cells.push('<span></span>');
  }

  for (let date = 1; date <= lastDate; date += 1) {
    const isToday = date === now.getDate();
    cells.push(`<span class="${isToday ? 'today' : ''}">${date}</span>`);
  }

  elements.calendarGrid.innerHTML = cells.join('');
}

function renderBookmarks() {
  elements.bookmarkGrid.innerHTML = bookmarks.map((bookmark) => `
    <a class="quick-link" href="${bookmark.url}" target="_blank" rel="noreferrer">
      <span class="quick-link-icon">${bookmark.icon}</span>
      <span>${bookmark.title}</span>
    </a>
  `).join('');
}


async function loadQuotes() {
  try {
    const response = await fetch('src/data/quotes.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('quotes request failed');
    const data = await response.json();
    quotes = normalizeQuotes(data);
  } catch {
    quotes = fallbackQuotes;
    elements.quoteSource.textContent = '读取本地 JSON 失败，已使用兜底语录';
  }

  renderQuote();
}

function normalizeQuotes(data) {
  if (!Array.isArray(data)) return fallbackQuotes;

  const normalized = data
    .map((item) => ({
      text: String(item?.text || '').trim(),
      source: String(item?.source || '自定义语录').trim()
    }))
    .filter((item) => item.text);

  return normalized.length > 0 ? normalized : fallbackQuotes;
}
function getQuoteIndex() {
  const quoteCount = Math.max(quotes.length, 1);
  return readStorage(storageKeys.quoteIndex, 0) % quoteCount;
}

function renderQuote(index = getQuoteIndex()) {
  const quote = quotes[index] || fallbackQuotes[0];
  elements.quoteText.textContent = quote.text;
  elements.quoteSource.textContent = quote.source || '自定义语录';
  writeStorage(storageKeys.quoteIndex, index);
}

function nextQuote() {
  if (quotes.length <= 1) {
    renderQuote(0);
    return;
  }

  const currentIndex = getQuoteIndex();
  const nextIndex = (currentIndex + 1 + Math.floor(Math.random() * (quotes.length - 1))) % quotes.length;
  renderQuote(nextIndex);
}

function getNotes() {
  return readStorage(storageKeys.notes, []);
}

function saveNotes(notes) {
  writeStorage(storageKeys.notes, notes);
}

function renderNotes() {
  const notes = getNotes();

  if (notes.length === 0) {
    elements.noteWall.innerHTML = '<p class="empty">还没有便签。写下一个小念头吧。</p>';
    return;
  }

  elements.noteWall.innerHTML = notes.map((note) => `
    <article class="note">
      <p>${escapeHtml(note.text)}</p>
      <time>${note.createdAt}</time>
      <button class="delete-note" type="button" data-note-id="${note.id}" aria-label="删除便签">×</button>
    </article>
  `).join('');
}

function addNote() {
  const text = elements.noteInput.value.trim();
  if (!text) return;

  const note = {
    id: createId(),
    text,
    createdAt: new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date())
  };

  saveNotes([note, ...getNotes()].slice(0, 10));
  elements.noteInput.value = '';
  addSparks(20);
  createSparkBurst(elements.addNote.getBoundingClientRect());
  renderNotes();
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function deleteNote(id) {
  saveNotes(getNotes().filter((note) => note.id !== id));
  renderNotes();
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toggleNotes(forceOpen) {
  const shouldOpen = forceOpen ?? elements.notesPanel.hidden;
  elements.notesPanel.hidden = !shouldOpen;
  if (shouldOpen) {
    addSparks(3);
    createSparkBurst(elements.notesToggle.getBoundingClientRect());
    elements.noteInput.focus();
  }
}

function getLayout() {
  return readStorage(storageKeys.layout, {});
}

function saveWidgetPosition(widget) {
  const name = widget.dataset.widget;
  if (!name) return;

  const layout = getLayout();
  layout[name] = {
    x: widget.style.left,
    y: widget.style.top
  };
  writeStorage(storageKeys.layout, layout);
  addSparks(1);
}

function applySavedLayout() {
  const layout = getLayout();
  document.querySelectorAll('[data-widget]').forEach((widget) => {
    const saved = layout[widget.dataset.widget];
    if (!saved) return;
    widget.style.left = saved.x;
    widget.style.top = saved.y;
  });
}

function resetLayout() {
  localStorage.removeItem(storageKeys.layout);
  window.location.reload();
}

function enableDragging() {
  document.querySelectorAll('[data-widget]').forEach((widget) => {
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;
    let didMove = false;

    widget.addEventListener('pointerdown', (event) => {
      const interactive = event.target.closest('a, button, textarea, input');
      const isFab = widget.classList.contains('notes-fab');
      if (interactive && !(isFab && interactive === widget)) return;
      if (window.matchMedia('(max-width: 900px)').matches) return;

      const rect = widget.getBoundingClientRect();
      startX = event.clientX;
      startY = event.clientY;
      originX = rect.left;
      originY = rect.top;
      didMove = false;
      widget.classList.add('dragging');
      widget.setPointerCapture(event.pointerId);
    });

    widget.addEventListener('pointermove', (event) => {
      if (!widget.classList.contains('dragging')) return;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      if (Math.abs(deltaX) + Math.abs(deltaY) > 4) didMove = true;

      const maxX = window.innerWidth - widget.offsetWidth - 8;
      const maxY = window.innerHeight - widget.offsetHeight - 8;
      const nextX = clamp(originX + deltaX, 8, maxX);
      const nextY = clamp(originY + deltaY, 8, maxY);

      widget.style.left = `${nextX}px`;
      widget.style.top = `${nextY}px`;
      widget.style.setProperty('--x', `${nextX}px`);
      widget.style.setProperty('--y', `${nextY}px`);
    });

    widget.addEventListener('pointerup', (event) => {
      if (!widget.classList.contains('dragging')) return;
      widget.classList.remove('dragging');
      widget.releasePointerCapture(event.pointerId);
      saveWidgetPosition(widget);

      if (widget.classList.contains('notes-fab') && !didMove) {
        toggleNotes(true);
      }
    });

    widget.addEventListener('pointercancel', () => {
      widget.classList.remove('dragging');
    });
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}


function loadWeather() {
  const cached = readStorage(storageKeys.weather, null);
  if (cached) renderWeather(cached);

  if (!navigator.geolocation) {
    renderWeatherError('浏览器不支持定位');
    return;
  }

  elements.weatherText.textContent = '正在定位...';
  elements.weatherPlace.textContent = '请求当前位置';

  navigator.geolocation.getCurrentPosition(
    (position) => fetchWeather(position.coords.latitude, position.coords.longitude),
    () => renderWeatherError('定位被拒绝或失败'),
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 1000 * 60 * 30 }
  );
}

async function fetchWeather(latitude, longitude) {
  try {
    elements.weatherText.textContent = '正在获取天气...';
    const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
    weatherUrl.search = new URLSearchParams({
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
      timezone: 'auto'
    });

    const response = await fetch(weatherUrl);
    if (!response.ok) throw new Error('weather request failed');
    const data = await response.json();
    const weather = normalizeWeather(data, latitude, longitude);
    writeStorage(storageKeys.weather, weather);
    renderWeather(weather);
    addSparks(5);
  } catch {
    renderWeatherError('天气获取失败');
  }
}

function normalizeWeather(data, latitude, longitude) {
  const current = data.current || {};
  const weatherInfo = getWeatherInfo(current.weather_code);
  return {
    temperature: Math.round(current.temperature_2m),
    apparent: Math.round(current.apparent_temperature),
    humidity: current.relative_humidity_2m,
    wind: Math.round(current.wind_speed_10m),
    code: current.weather_code,
    text: weatherInfo.text,
    icon: weatherInfo.icon,
    latitude,
    longitude,
    updatedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  };
}

function renderWeather(weather) {
  elements.weatherIcon.textContent = weather.icon;
  elements.weatherTemp.textContent = `${weather.temperature}°`;
  elements.weatherText.textContent = `${weather.text} · 体感 ${weather.apparent}°`;
  elements.weatherPlace.textContent = `湿度 ${weather.humidity}% · 风速 ${weather.wind}km/h · ${weather.updatedAt}`;
  const weatherWidget = document.querySelector('.weather-widget');
  if (weatherWidget) weatherWidget.dataset.weather = weatherTheme(weather.code);
}

function renderWeatherError(message) {
  elements.weatherIcon.textContent = '◌';
  elements.weatherTemp.textContent = '--°';
  elements.weatherText.textContent = message;
  elements.weatherPlace.textContent = '点击 ↻ 重试';
}

function getWeatherInfo(code = 0) {
  if (code === 0) return { text: '晴朗', icon: '☀' };
  if ([1, 2].includes(code)) return { text: '少云', icon: '⛅' };
  if (code === 3) return { text: '多云', icon: '☁' };
  if ([45, 48].includes(code)) return { text: '有雾', icon: '≋' };
  if ([51, 53, 55, 56, 57].includes(code)) return { text: '毛毛雨', icon: '☂' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { text: '下雨', icon: '☔' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { text: '下雪', icon: '❄' };
  if ([95, 96, 99].includes(code)) return { text: '雷雨', icon: 'ϟ' };
  return { text: '天气', icon: '◌' };
}

function weatherTheme(code = 0) {
  if (code === 0 || [1, 2].includes(code)) return 'sunny';
  if ([61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return 'rainy';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snowy';
  if ([45, 48].includes(code)) return 'foggy';
  return 'cloudy';
}
function getSparks() {
  return readStorage(storageKeys.sparks, 0);
}

function renderSparks() {
  elements.sparkCount.textContent = getSparks();
}

function addSparks(amount) {
  writeStorage(storageKeys.sparks, getSparks() + amount);
  renderSparks();
}

function createSparkBurst(rect) {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  for (let index = 0; index < 10; index += 1) {
    const spark = document.createElement('span');
    const angle = (Math.PI * 2 * index) / 10;
    const distance = 28 + Math.random() * 34;
    spark.className = 'spark-particle';
    spark.textContent = index % 2 === 0 ? '✦' : '·';
    spark.style.left = `${centerX}px`;
    spark.style.top = `${centerY}px`;
    spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    spark.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
    document.body.append(spark);
    window.setTimeout(() => spark.remove(), 850);
  }
}

function bindEvents() {
  elements.quoteCard.addEventListener('click', (event) => {
    if (event.target.closest('.drag-handle')) return;
    nextQuote();
  });
  elements.quoteCard.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') nextQuote();
  });

  elements.closeNotes.addEventListener('click', () => toggleNotes(false));
  elements.addNote.addEventListener('click', addNote);
  elements.noteInput.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') addNote();
  });
  elements.noteWall.addEventListener('click', (event) => {
    const button = event.target.closest('[data-note-id]');
    if (!button) return;
    deleteNote(button.dataset.noteId);
  });
  elements.resetLayout.addEventListener('click', resetLayout);
  elements.refreshWeather.addEventListener('click', loadWeather);
  elements.sparkButton.addEventListener('click', (event) => {
    addSparks(7);
    createSparkBurst(event.currentTarget.getBoundingClientRect());
  });
}

async function init() {
  applySavedLayout();
  updateClock();
  renderCalendar();
  window.setInterval(updateClock, 1000 * 20);
  await loadQuotes();
  renderBookmarks();
  renderNotes();
  renderSparks();
  loadWeather();
  enableDragging();
  bindEvents();
}

init();




