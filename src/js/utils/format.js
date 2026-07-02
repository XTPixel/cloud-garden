export function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

export function formatDate(value) {
  if (!value) return '创建时间未知';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '创建时间未知';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

export function slugify(value) {
  const base = String(value)
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return base || `section-${Date.now()}`;
}
