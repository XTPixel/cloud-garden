import { elements } from '../dom.js';

export function initTheme() {
  const storageKey = 'dashboard.theme';
  const root = document.documentElement;
  const toggle = elements?.themeToggle || document.querySelector('#themeToggle');

  function readTheme() {
    try {
      return localStorage.getItem(storageKey) === 'night' ? 'night' : 'day';
    } catch (error) {
      return root.dataset.theme === 'night' ? 'night' : 'day';
    }
  }

  function writeTheme(theme) {
    try { localStorage.setItem(storageKey, theme); } catch (e) { /* ignore */ }
  }

  function applyTheme(theme) {
    const isNight = theme === 'night';
    root.dataset.theme = isNight ? 'night' : 'day';
    if (!toggle) return;
    toggle.setAttribute('aria-pressed', String(isNight));
    toggle.setAttribute('aria-label', isNight ? '切换日间模式' : '切换夜间模式');
    toggle.querySelector('span').textContent = isNight ? '☀' : '☾';
    toggle.querySelector('b').textContent = isNight ? '日间' : '夜间';
  }

  applyTheme(readTheme());

  toggle?.addEventListener('click', () => {
    const nextTheme = root.dataset.theme === 'night' ? 'day' : 'night';
    applyTheme(nextTheme);
    writeTheme(nextTheme);
  });
}
