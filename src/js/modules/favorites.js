import { elements } from '../dom.js';
import { escapeHtml, escapeAttribute } from '../utils/format.js';

const defaultFavorites = [
  { title: 'HAPPY', url: 'https://happy.bigmess.org/', description: '一个带有复古与实验气质的网页小站。' },
  { title: 'Soundwise AI', url: 'https://soundwise.ai/zh-CN', description: '面向中文用户的 AI 音频与声音工具。' },
  { title: 'Smallpdf', url: 'https://smallpdf.com/cn', description: '在线处理、转换和压缩 PDF 的实用工具箱。' }
];

let favorites = [];

async function loadFavorites() {
  try {
    const response = await fetch('src/data/favorite-sites.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('favorites request failed');
    return normalizeFavorites(await response.json());
  } catch {
    return defaultFavorites;
  }
}

function normalizeFavorites(data) {
  const normalized = (Array.isArray(data) ? data : defaultFavorites).map((item) => ({
    title: String(item?.title || '').trim(),
    url: normalizeUrl(String(item?.url || '').trim()),
    description: String(item?.description || '').trim()
  })).filter((item) => item.title && item.url);
  return normalized.length > 0 ? normalized : defaultFavorites;
}

function normalizeUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function getHostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function getInitial(title) {
  return escapeHtml(title.trim().slice(0, 1).toUpperCase() || '◎');
}

function renderFavorites() {
  if (!elements.favoriteGrid) return;

  if (favorites.length === 0) {
    elements.favoriteGrid.innerHTML = '<p class="projects-status">暂无收藏，等待主人添加更多网站。</p>';
    return;
  }

  elements.favoriteGrid.innerHTML = favorites.map((fav, index) => `
    <article class="favorite-card" data-index="${index}">
      <a class="favorite-card-link" href="${escapeAttribute(fav.url)}" target="_blank" rel="noreferrer" aria-label="打开 ${escapeAttribute(fav.title)}">
        <div class="favorite-card-main">
          <span class="favorite-favicon" aria-hidden="true">${getInitial(fav.title)}</span>
          <div>
            <h3>${escapeHtml(fav.title)}</h3>
            <p>${escapeHtml(fav.description || getHostname(fav.url))}</p>
            <small>${escapeHtml(getHostname(fav.url))}</small>
          </div>
        </div>
      </a>
    </article>
  `).join('');
}

export async function initFavoritesPage() {
  favorites = await loadFavorites();
  renderFavorites();
}
