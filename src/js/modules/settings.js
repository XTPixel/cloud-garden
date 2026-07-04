import { elements } from '../dom.js';
import { resetLayout } from './drag.js';

/* ============================================
   设置面板模块
   控制设置面板的打开/关闭、推送/回归动画、
   配色主题切换、日夜切换
   ============================================ */

const PALETTE_KEY = 'dashboard.palette';
const PALETTES = ['garden', 'ocean', 'cherry'];
const PALETTE_NAMES = { garden: '空中花园', ocean: '沧海月明', cherry: '落樱缤纷' };

let isOpen = false;
let currentPalette = 'garden';

/* ---- 读取/写入 palette ---- */
function readPalette() {
  try { return localStorage.getItem(PALETTE_KEY) || 'garden'; } catch (e) { return 'garden'; }
}

function writePalette(palette) {
  try { localStorage.setItem(PALETTE_KEY, palette); } catch (e) { /* ignore */ }
}

function applyPalette(palette) {
  const root = document.documentElement;
  currentPalette = palette;

  if (palette === 'garden') {
    root.removeAttribute('data-palette');
  } else {
    root.setAttribute('data-palette', palette);
  }

  writePalette(palette);
  updatePaletteUI();
}

/* ---- 日夜切换 ---- */
function applyNightMode(isNight) {
  const root = document.documentElement;
  root.dataset.theme = isNight ? 'night' : '';
  try { localStorage.setItem('dashboard.theme', isNight ? 'night' : 'day'); } catch (e) { /* ignore */ }
  if (elements.settingsNightToggle) {
    elements.settingsNightToggle.checked = isNight;
  }
}

/* ---- UI 同步 ---- */
function updatePaletteUI() {
  if (!elements.themeGallery) return;
  const cards = elements.themeGallery.querySelectorAll('.palette-card');
  cards.forEach((card) => {
    const p = card.dataset.palette;
    card.classList.toggle('active', p === currentPalette);
  });
}

function syncNightUI() {
  const isNight = document.documentElement.dataset.theme === 'night';
  if (elements.settingsNightToggle) {
    elements.settingsNightToggle.checked = isNight;
  }
}

/* ---- 面板开关 ---- */
function toggleSettings() {
  if (isOpen) {
    closeSettings();
  } else {
    openSettings();
  }
}

function openSettings() {
  if (isOpen) return;
  isOpen = true;
  document.documentElement.classList.add('settings-open');
  elements.settingsPanel.setAttribute('aria-hidden', 'false');
  elements.settingsToggle.setAttribute('aria-label', '关闭设置');
  updatePaletteUI();
  syncNightUI();
}

function closeSettings() {
  if (!isOpen) return;
  isOpen = false;
  document.documentElement.classList.remove('settings-open');
  elements.settingsPanel.setAttribute('aria-hidden', 'true');
  elements.settingsToggle.setAttribute('aria-label', '开启设置');
}

/* ---- 初始化 ---- */
function initSettings() {
  if (!elements.settingsToggle || !elements.settingsPanel) {
    console.warn('[设置] DOM 元素未找到，跳过初始化');
    return;
  }

  // 读取已保存的 palette
  currentPalette = readPalette();
  applyPalette(currentPalette);
  syncNightUI();

  // 设置开关
  elements.settingsToggle.addEventListener('click', toggleSettings);

  // 关闭按钮
  if (elements.settingsClose) {
    elements.settingsClose.addEventListener('click', closeSettings);
  }

  // 点击面板外部关闭
  document.addEventListener('pointerdown', (event) => {
    if (!isOpen) return;
    const panel = elements.settingsPanel;
    const toggle = elements.settingsToggle;
    if (!panel || !toggle) return;
    if (panel.contains(event.target) || toggle.contains(event.target)) return;
    closeSettings();
  });

  // ESC 关闭
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen) closeSettings();
  });

  // 配色卡片点击
  if (elements.themeGallery) {
    elements.themeGallery.addEventListener('click', (event) => {
      const card = event.target.closest('.palette-card');
      if (!card) return;
      const palette = card.dataset.palette;
      if (!palette) return;
      applyPalette(palette);
    });
  }

  // 夜间模式开关
  if (elements.settingsNightToggle) {
    elements.settingsNightToggle.addEventListener('change', () => {
      applyNightMode(elements.settingsNightToggle.checked);
    });
  }

  // 重置布局
  if (elements.settingsResetLayout) {
    elements.settingsResetLayout.addEventListener('click', resetLayout);
  }

  // aria-hidden 初始状态
  elements.settingsPanel.setAttribute('aria-hidden', 'true');
}

export { initSettings, openSettings, closeSettings, toggleSettings };
