Garden.createId = function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

Garden.escapeHtml = function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

Garden.clamp = function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
};
