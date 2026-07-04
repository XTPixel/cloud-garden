import { elements } from '../dom.js';
import { resetLayout } from './drag.js';
import { stopCursorTrail, restartCursorTrail } from './cursorTrail.js';

/* ============================================
   设置面板模块
   控制设置面板的打开/关闭、推送/回归动画、
   配色主题切换、日夜切换、模块可见性、
   光标尾迹、重置等
   ============================================ */

const PALETTE_KEY = 'dashboard.palette';
const WIDGET_VIS_KEY = 'dashboard.widgetVisibility';
const CURSOR_KEY = 'dashboard.cursorTrail';

let isOpen = false;
let currentPalette = 'garden';

/* ---- Palette ---- */
function readPalette() {
  try { return localStorage.getItem(PALETTE_KEY) || 'garden'; } catch (e) { return 'garden'; }
}
function writePalette(v) {
  try { localStorage.setItem(PALETTE_KEY, v); } catch (e) {}
}
function applyPalette(palette) {
  const root = document.documentElement;
  currentPalette = palette;
  if (palette === 'garden') root.removeAttribute('data-palette');
  else root.setAttribute('data-palette', palette);
  writePalette(palette);
  updatePaletteUI();
}

/* ---- Night mode ---- */
function applyNightMode(on) {
  const root = document.documentElement;
  root.dataset.theme = on ? 'night' : '';
  try { localStorage.setItem('dashboard.theme', on ? 'night' : 'day'); } catch (e) {}
  if (elements.settingsNightToggle) elements.settingsNightToggle.checked = on;
}

/* ---- Widget visibility ---- */
function loadWidgetVisibility() {
  try {
    const raw = localStorage.getItem(WIDGET_VIS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}
function saveWidgetVisibility(state) {
  try { localStorage.setItem(WIDGET_VIS_KEY, JSON.stringify(state)); } catch (e) {}
}
function applyWidgetVisibility() {
  const state = loadWidgetVisibility();
  // 只隐藏真正的 widget 元素，不影响设置面板内的开关
  document.querySelectorAll('[data-widget]:not(.vis-row)').forEach((el) => {
    const name = el.dataset.widget;
    if (name in state && !state[name]) {
      el.dataset.hidden = 'true';
      el.style.display = 'none';
    } else {
      delete el.dataset.hidden;
      el.style.display = '';
    }
  });
  // 同步设置面板内的开关状态
  if (elements.widgetVisibility) {
    elements.widgetVisibility.querySelectorAll('.vis-row').forEach((row) => {
      const name = row.dataset.widget;
      const cb = row.querySelector('input');
      if (cb) cb.checked = name in state ? state[name] : true;
    });
  }
}
function handleWidgetToggle(name, visible) {
  const state = loadWidgetVisibility();
  state[name] = visible;
  saveWidgetVisibility(state);
  applyWidgetVisibility();
}

/* ---- Cursor trail ---- */
function loadCursorPref() {
  try { return localStorage.getItem(CURSOR_KEY) !== 'off'; } catch (e) { return true; }
}
function saveCursorPref(on) {
  try { localStorage.setItem(CURSOR_KEY, on ? 'on' : 'off'); } catch (e) {}
  // cursorTrail 只在页面加载时初始化，切换需要刷新生效
}

/* ---- Reset all ---- */
function resetAllSettings() {
  if (!confirm('确定重置所有设置？页面将重新加载。')) return;
  const keys = [
    'dashboard.theme', PALETTE_KEY, WIDGET_VIS_KEY, CURSOR_KEY,
    'dashboard.widgetLayout', 'dashboard.notes',
    'dashboard.quoteIndex', 'dashboard.weather'
  ];
  keys.forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} });
  window.location.reload();
}

/* ---- UI sync ---- */
function updatePaletteUI() {
  if (!elements.themeGallery) return;
  elements.themeGallery.querySelectorAll('.palette-card').forEach((c) => {
    c.classList.toggle('active', c.dataset.palette === currentPalette);
  });
}
function syncNightUI() {
  const isNight = document.documentElement.dataset.theme === 'night';
  if (elements.settingsNightToggle) elements.settingsNightToggle.checked = isNight;
}
function syncCursorUI() {
  if (elements.settingsCursorTrail) elements.settingsCursorTrail.checked = loadCursorPref();
}

/* ---- Panel open/close ---- */
function toggleSettings() { isOpen ? closeSettings() : openSettings(); }
function openSettings() {
  if (isOpen) return;
  isOpen = true;
  document.documentElement.classList.add('settings-open');
  elements.settingsPanel.setAttribute('aria-hidden', 'false');
  elements.settingsToggle.setAttribute('aria-label', '关闭设置');
  updatePaletteUI();
  syncNightUI();
  syncCursorUI();
}
function closeSettings() {
  if (!isOpen) return;
  isOpen = false;
  document.documentElement.classList.remove('settings-open');
  elements.settingsPanel.setAttribute('aria-hidden', 'true');
  elements.settingsToggle.setAttribute('aria-label', '开启设置');
}

/* ---- Init ---- */
function initSettings() {
  if (!elements.settingsToggle || !elements.settingsPanel) {
    console.warn('[设置] DOM 未找到');
    return;
  }

  // 恢复已保存的配置
  currentPalette = readPalette();
  applyPalette(currentPalette);
  applyWidgetVisibility();
  syncNightUI();

  // 开关
  elements.settingsToggle.addEventListener('click', toggleSettings);
  if (elements.settingsClose) elements.settingsClose.addEventListener('click', closeSettings);

  // 点击外部关闭
  document.addEventListener('pointerdown', (e) => {
    if (!isOpen) return;
    if (!elements.settingsPanel.contains(e.target) && !elements.settingsToggle.contains(e.target)) closeSettings();
  });
  // ESC 关闭
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) closeSettings(); });

  // 配色卡片点击
  if (elements.themeGallery) {
    elements.themeGallery.addEventListener('click', (e) => {
      const card = e.target.closest('.palette-card');
      if (card) applyPalette(card.dataset.palette);
    });
  }

  // 夜间模式
  if (elements.settingsNightToggle) {
    elements.settingsNightToggle.addEventListener('change', () => applyNightMode(elements.settingsNightToggle.checked));
  }

  // 模块可见性
  if (elements.widgetVisibility) {
    elements.widgetVisibility.addEventListener('change', (e) => {
      const row = e.target.closest('.vis-row');
      if (row) handleWidgetToggle(row.dataset.widget, e.target.checked);
    });
  }

  // 光标尾迹 — 即时生效
  if (elements.settingsCursorTrail) {
    elements.settingsCursorTrail.addEventListener('change', () => {
      const on = elements.settingsCursorTrail.checked;
      saveCursorPref(on);
      if (on) restartCursorTrail();
      else stopCursorTrail();
    });
  }

  // 重置布局
  if (elements.settingsResetLayout) elements.settingsResetLayout.addEventListener('click', resetLayout);

  // 重置所有设置
  if (elements.settingsResetAll) elements.settingsResetAll.addEventListener('click', resetAllSettings);

  elements.settingsPanel.setAttribute('aria-hidden', 'true');
}

export { initSettings, openSettings, closeSettings, toggleSettings };
