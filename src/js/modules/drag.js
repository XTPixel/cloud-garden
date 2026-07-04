import { elements } from '../dom.js';
import { storageKeys } from '../config.js';
import { readStorage, writeStorage } from '../utils/storage.js';
import { clamp } from '../utils/format.js';
import { addNote } from './notes.js';

const defaultLayout = [
  ['profile', 0, 0],
  ['quote', 0, 500],
  ['portal', 345, 0],
  ['greeting', 360, 252],
  ['music', 392, 580],
  ['links', 340, 710],
  ['clock', 764, -20],
  ['calendar', 800, 250],
  ['weather', 890, 633],
  ['notesButton', 800, 636]
];

const defaultCanvas = { width: 1100, height: 720 };
const RESIZE_MARGIN = 8;
const RESIZE_TRANSITION_MS = 300;

// --- 窗口缩放平滑调整 ---
const savedDesktop = { width: 0, height: 0 };
let resizeRAF = null;

function syncDesktopSize() {
  const desktop = document.querySelector('.desktop');
  if (desktop) {
    savedDesktop.width = desktop.offsetWidth;
    savedDesktop.height = desktop.offsetHeight;
  }
}

/** 保存当前所有 widget 的位置到 localStorage */
function persistAllPositions() {
  const layout = getLayout();
  document.querySelectorAll('[data-widget]:not(.vis-row)').forEach((widget) => {
    const name = widget.dataset.widget;
    if (!name) return;
    layout[name] = { x: widget.style.left, y: widget.style.top };
  });
  layout._meta = { desktopWidth: savedDesktop.width, desktopHeight: savedDesktop.height };
  writeStorage(storageKeys.layout, layout);
}

function handleResize() {
  const currentWidth = window.innerWidth;
  const currentHeight = window.innerHeight;

  if (currentWidth === savedDesktop.width && currentHeight === savedDesktop.height) return;

  const scaleX = currentWidth / savedDesktop.width;
  const scaleY = currentHeight / savedDesktop.height;

  const widgets = document.querySelectorAll('[data-widget]:not(.vis-row)');

  // 临时 transition 实现平滑动画
  widgets.forEach((w) => {
    w.style.transition = `left ${RESIZE_TRANSITION_MS}ms ease, top ${RESIZE_TRANSITION_MS}ms ease`;
  });

  widgets.forEach((widget) => {
    const left = parseFloat(widget.style.left) || 0;
    const top = parseFloat(widget.style.top) || 0;
    const w = widget.offsetWidth;
    const h = widget.offsetHeight;

    let newLeft = Math.round(left * scaleX);
    let newTop = Math.round(top * scaleY);

    // Clamp 保证不溢出视口
    const maxX = currentWidth - w - RESIZE_MARGIN;
    const maxY = currentHeight - h - RESIZE_MARGIN;
    if (maxX >= RESIZE_MARGIN) newLeft = Math.min(newLeft, maxX);
    if (maxY >= RESIZE_MARGIN) newTop = Math.min(newTop, maxY);
    newLeft = Math.max(RESIZE_MARGIN, newLeft);
    newTop = Math.max(RESIZE_MARGIN, newTop);

    widget.style.left = `${newLeft}px`;
    widget.style.top = `${newTop}px`;
    widget.style.setProperty('--x', widget.style.left);
    widget.style.setProperty('--y', widget.style.top);
  });

  // 动画完成后移除 transition，恢复拖拽即时响应
  setTimeout(() => {
    widgets.forEach((w) => {
      w.style.transition = '';
    });
  }, RESIZE_TRANSITION_MS + 50);

  savedDesktop.width = currentWidth;
  savedDesktop.height = currentHeight;

  // ★ 关键修复：缩放后立即保存位置，避免切页后恢复缩放前的旧值
  persistAllPositions();
}

export function initResizeHandler() {
  syncDesktopSize();
  window.addEventListener('resize', () => {
    if (resizeRAF) return;
    resizeRAF = requestAnimationFrame(() => {
      resizeRAF = null;
      handleResize();
    });
  });
}

function getWidgetSize(widget) {
  const styles = getComputedStyle(widget);
  return {
    width: widget.offsetWidth || parseFloat(styles.getPropertyValue('--w')) || 0,
    height: widget.offsetHeight || parseFloat(styles.getPropertyValue('--h')) || 0
  };
}

function applyPosition(widget, x, y) {
  const nextX = Math.round(x);
  const nextY = Math.round(y);
  widget.style.left = `${nextX}px`;
  widget.style.top = `${nextY}px`;
  widget.style.setProperty('--x', `${nextX}px`);
  widget.style.setProperty('--y', `${nextY}px`);
}

function applyDefaultLayout() {
  const widgets = new Map(
    [...document.querySelectorAll('[data-widget]:not(.vis-row)')].map((widget) => [widget.dataset.widget, widget])
  );
  const viewportWidth = Math.max(document.documentElement.clientWidth, 1100);
  const viewportHeight = Math.max(document.documentElement.clientHeight, 720);
  const margin = 0;
  const offsetX = Math.max(0, (viewportWidth - defaultCanvas.width) / 2);
  const offsetY = Math.max(0, (viewportHeight - defaultCanvas.height) / 2);

  defaultLayout.forEach(([name, baseX, baseY]) => {
    const widget = widgets.get(name);
    if (!widget) return;
    const { width, height } = getWidgetSize(widget);
    const maxX = viewportWidth - width - margin;
    const maxY = viewportHeight - height - margin;
    applyPosition(widget, clamp(baseX + offsetX, margin, maxX), clamp(baseY + offsetY, margin, maxY));
  });
}

function getLayout() {
  return readStorage(storageKeys.layout, {});
}

function getDesktopSize() {
  const desktop = document.querySelector('.desktop');
  return desktop
    ? { width: desktop.offsetWidth, height: desktop.offsetHeight }
    : { width: window.innerWidth, height: window.innerHeight };
}

function saveWidgetPosition(widget, onSaved) {
  const name = widget.dataset.widget;
  if (!name) return;
  const layout = getLayout();
  layout[name] = { x: widget.style.left, y: widget.style.top };
  // 记录当前桌面尺寸，用于跨会话视口归一化
  layout._meta = { desktopWidth: savedDesktop.width, desktopHeight: savedDesktop.height };
  writeStorage(storageKeys.layout, layout);
  onSaved?.();
}

export function applySavedLayout() {
  const layout = getLayout();
  if (!layout || typeof layout !== 'object' || !Object.keys(layout).length) {
    resetLayout();
    return;
  }

  // 视口归一化：如果保存时的桌面尺寸与当前不同，等比缩放位置
  const currentSize = getDesktopSize();
  const savedViewport = layout._meta;
  let scaleX = 1, scaleY = 1;
  const needsScale = savedViewport &&
    savedViewport.desktopWidth > 0 && savedViewport.desktopHeight > 0 &&
    (Math.abs(savedViewport.desktopWidth - currentSize.width) > 10 ||
     Math.abs(savedViewport.desktopHeight - currentSize.height) > 10);
  if (needsScale) {
    scaleX = currentSize.width / savedViewport.desktopWidth;
    scaleY = currentSize.height / savedViewport.desktopHeight;
  }

  document.querySelectorAll('[data-widget]:not(.vis-row)').forEach((widget) => {
    const saved = layout[widget.dataset.widget];
    if (!saved) return;

    if (needsScale && saved.x && saved.y) {
      const px = parseFloat(saved.x) || 0;
      const py = parseFloat(saved.y) || 0;
      if (px || py) {
        const w = widget.offsetWidth;
        const h = widget.offsetHeight;
        let newLeft = Math.round(px * scaleX);
        let newTop = Math.round(py * scaleY);
        const maxX = currentSize.width - w - RESIZE_MARGIN;
        const maxY = currentSize.height - h - RESIZE_MARGIN;
        if (maxX >= RESIZE_MARGIN) newLeft = Math.min(newLeft, maxX);
        if (maxY >= RESIZE_MARGIN) newTop = Math.min(newTop, maxY);
        newLeft = Math.max(RESIZE_MARGIN, newLeft);
        newTop = Math.max(RESIZE_MARGIN, newTop);
        widget.style.left = `${newLeft}px`;
        widget.style.top = `${newTop}px`;
        widget.style.setProperty('--x', widget.style.left);
        widget.style.setProperty('--y', widget.style.top);
        return;
      }
    }

    // 不需要缩放时直接应用（兼容旧数据没有 _meta 也可以直接应用）
    widget.style.left = saved.x;
    widget.style.top = saved.y;
    widget.style.setProperty('--x', saved.x);
    widget.style.setProperty('--y', saved.y);
  });
}

export function resetLayout() {
  localStorage.removeItem(storageKeys.layout);
  applyDefaultLayout();
  // 确保 reset 后 widget 可见（即使 layout-ready 尚未由入场动画加上）
  document.querySelectorAll('[data-widget]:not(.vis-row), .notes-fab').forEach((el) => el.classList.add('layout-ready'));
  // 同步桌面尺寸、保存默认位置到 localStorage
  syncDesktopSize();
  persistAllPositions();
}

export function enableDragging({ onPositionSaved } = {}) {
  document.querySelectorAll('[data-widget]:not(.vis-row)').forEach((widget) => {
    let startX = 0, startY = 0, originX = 0, originY = 0, didMove = false;

    widget.addEventListener('pointerdown', (event) => {
      const interactive = event.target.closest('a, button, textarea, input');
      const isFab = widget.classList.contains('notes-fab');
      if (interactive && !(isFab && interactive === widget)) return;
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
      widget.style.left = `${clamp(originX + deltaX, 8, maxX)}px`;
      widget.style.top = `${clamp(originY + deltaY, 8, maxY)}px`;
      widget.style.setProperty('--x', widget.style.left);
      widget.style.setProperty('--y', widget.style.top);
    });

    widget.addEventListener('pointerup', (event) => {
      if (!widget.classList.contains('dragging')) return;
      widget.classList.remove('dragging');
      widget.releasePointerCapture(event.pointerId);
      saveWidgetPosition(widget, onPositionSaved);
      syncDesktopSize();
      if (widget.classList.contains('notes-fab') && !didMove) addNote();
    });

    widget.addEventListener('pointercancel', () => widget.classList.remove('dragging'));
  });
}
