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
    [...document.querySelectorAll('[data-widget]')].map((widget) => [widget.dataset.widget, widget])
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

function saveWidgetPosition(widget, onSaved) {
  const name = widget.dataset.widget;
  if (!name) return;
  const layout = getLayout();
  layout[name] = { x: widget.style.left, y: widget.style.top };
  writeStorage(storageKeys.layout, layout);
  onSaved?.();
}

export function applySavedLayout() {
  const layout = getLayout();
  if (!layout || typeof layout !== 'object' || !Object.keys(layout).length) {
    resetLayout();
    return;
  }
  document.querySelectorAll('[data-widget]').forEach((widget) => {
    const saved = layout[widget.dataset.widget];
    if (!saved) return;
    widget.style.left = saved.x;
    widget.style.top = saved.y;
    widget.style.setProperty('--x', saved.x);
    widget.style.setProperty('--y', saved.y);
  });
}

export function resetLayout() {
  localStorage.removeItem(storageKeys.layout);
  applyDefaultLayout();
}

export function enableDragging({ onPositionSaved } = {}) {
  document.querySelectorAll('[data-widget]').forEach((widget) => {
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
      if (widget.classList.contains('notes-fab') && !didMove) addNote();
    });

    widget.addEventListener('pointercancel', () => widget.classList.remove('dragging'));
  });
}
