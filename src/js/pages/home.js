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
  try {
    initTheme();
  } catch (e) { console.warn('[首页] initTheme:', e); }
  try {
    applySavedLayout();
  } catch (e) { console.warn('[首页] applySavedLayout:', e); }
  try {
    initClockControls();
  } catch (e) { console.warn('[首页] initClockControls:', e); }
  try {
    renderCalendar();
  } catch (e) { console.warn('[首页] renderCalendar:', e); }
  try {
    await loadQuotes();
  } catch (e) { console.warn('[首页] loadQuotes:', e); }
  try {
    await loadBookmarks();
  } catch (e) { console.warn('[首页] loadBookmarks:', e); }
  try {
    renderNotes();
  } catch (e) { console.warn('[首页] renderNotes:', e); }
  try {
    initMusicPlayer();
  } catch (e) { console.warn('[首页] initMusicPlayer:', e); }
  try {
    loadWeather();
  } catch (e) { console.warn('[首页] loadWeather:', e); }
  try {
    initCursorTrail();
  } catch (e) { console.warn('[首页] initCursorTrail:', e); }
  try {
    initPageTransitions({ homeEntry: true });
  } catch (e) { console.warn('[首页] initPageTransitions:', e); }
  try {
    enableDragging({});
  } catch (e) { console.warn('[首页] enableDragging:', e); }
  try {
    enableNoteDragging();
  } catch (e) { console.warn('[首页] enableNoteDragging:', e); }
  try {
    bindEvents();
  } catch (e) { console.warn('[首页] bindEvents:', e); }
}

init();
