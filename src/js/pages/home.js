import { elements } from '../dom.js';
import { initTheme } from '../modules/theme.js';
import { initClockControls, renderCalendar } from '../modules/clock.js';
import { loadBookmarks } from '../modules/bookmarks.js';
import { loadQuotes, nextQuote } from '../modules/quotes.js';
import { renderNotes, updateNoteText, startNoteDrag, enableNoteDragging } from '../modules/notes.js';
import { applySavedLayout, resetLayout, enableDragging } from '../modules/drag.js';
import { loadWeather } from '../modules/weather.js';
import { initMusicPlayer } from '../modules/music.js';
import { initPageTransitions } from '../modules/pageTransitions.js';
import { initCursorTrail } from '../modules/cursorTrail.js';

function bindEvents() {
  elements.quoteCard.addEventListener('click', (event) => {
    if (event.target.closest('.drag-handle')) return;
    nextQuote();
  });
  elements.quoteCard.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') nextQuote();
  });
  elements.noteWall.addEventListener('pointerdown', startNoteDrag);
  elements.noteWall.addEventListener('input', updateNoteText);
  elements.resetLayout.addEventListener('click', resetLayout);
  elements.refreshWeather.addEventListener('click', () => loadWeather());
}

async function init() {
  initTheme();
  applySavedLayout();
  initClockControls();
  renderCalendar();
  await loadQuotes();
  await loadBookmarks();
  renderNotes();
  initMusicPlayer();
  loadWeather();
  initCursorTrail();
  initPageTransitions({ homeEntry: true });
  enableDragging({});
  enableNoteDragging();
  bindEvents();
}

init();
