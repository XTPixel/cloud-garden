import { elements } from '../dom.js';
import { initTheme } from '../modules/theme.js';
import { initClockControls, renderCalendar } from '../modules/clock.js';
import { loadBookmarks } from '../modules/bookmarks.js';
import { loadQuotes, nextQuote } from '../modules/quotes.js';
import { renderNotes, updateNoteText, startNoteDrag, enableNoteDragging } from '../modules/notes.js';
import { applySavedLayout, resetLayout, enableDragging, initResizeHandler } from '../modules/drag.js';
import { loadWeather } from '../modules/weather.js';
import { initMusicPlayer } from '../modules/music.js';
import { initPageTransitions } from '../modules/pageTransitions.js';
import { initCursorTrail } from '../modules/cursorTrail.js';
import { initSettings } from '../modules/settings.js';

/* ============================================
   电子宠物 · 庭中黑猫（默认关闭）
   如需启用，取消下方 import 注释，并在 init()
   中取消 initCat() 及相关 catReact() 调用的注释
   资源文件：src/assets/cat/*.gif
   控制模块：src/js/modules/cat.js
   样式：    src/css/cat.css
   ============================================ */
// import { initCat, catReact } from '../modules/cat.js';

function bindEvents() {
  elements.quoteCard.addEventListener('click', (event) => {
    if (event.target.closest('.drag-handle')) return;
    nextQuote();
    // catReact('quoteClick');
  });
  elements.quoteCard.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      nextQuote();
      // catReact('quoteClick');
    }
  });
  elements.noteWall.addEventListener('pointerdown', startNoteDrag);
  elements.noteWall.addEventListener('input', updateNoteText);
  elements.refreshWeather.addEventListener('click', () => {
    loadWeather();
    // catReact('weatherChange');
  });
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
    // 如需启用电子宠物，在此处取消注释：
    // const audio = elements.musicAudio;
    // if (audio) {
    //   audio.addEventListener('play', () => { try { catReact('musicPlay'); } catch (e) {} });
    //   audio.addEventListener('pause', () => { try { catReact('musicPause'); } catch (e) {} });
    // }
  } catch (e) { console.warn('[首页] 猫音乐连接:', e); }
  try {
    loadWeather();
  } catch (e) { console.warn('[首页] loadWeather:', e); }
  try {
    initCursorTrail();
  } catch (e) { console.warn('[首页] initCursorTrail:', e); }
  try {
    // initCat();  /* 启用电子宠物 */
  } catch (e) { console.warn('[首页] initCat:', e); }
  try {
    initPageTransitions({ homeEntry: true });
  } catch (e) { console.warn('[首页] initPageTransitions:', e); }
  try {
    initResizeHandler();
  } catch (e) { console.warn('[首页] initResizeHandler:', e); }
  try {
    enableDragging({});
  } catch (e) { console.warn('[首页] enableDragging:', e); }
  try {
    enableNoteDragging();
  } catch (e) { console.warn('[首页] enableNoteDragging:', e); }
  try {
    initSettings();
  } catch (e) { console.warn('[首页] initSettings:', e); }
  try {
    bindEvents();
  } catch (e) { console.warn('[首页] bindEvents:', e); }
}

init();
