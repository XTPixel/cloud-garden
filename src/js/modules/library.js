import { escapeHtml } from '../utils/format.js';

/* ───── 配色 ───── */
const TYPE_SPINE_COLORS = {
  book:  ['#8B3A3A', '#6B4226', '#4A4A1A', '#7D3C3C', '#5C2E2E'],
  movie: ['#1A5276', '#2C3E50', '#4A2C3D', '#1A3A4A', '#2A4C6A'],
  anime: ['#2D5A27', '#1A5C4A', '#117A65', '#2E4A35', '#1A6B4A'],
  tv:    ['#6A2C5A', '#4A2C4A', '#7A3C6A', '#3A2C5A', '#5A3A5A'],
  documentary: ['#5A6A3C', '#4A5A2C', '#6A7A4C', '#3A4A2C', '#7A8A5C'],
  game:  ['#3C4A6A', '#2C3A5A', '#4C5A7A', '#2C3A6A', '#5C6A8A'],
};

const CATEGORIES = {
  anime:       { label: '番剧', icon: '📺' },
  donghua:     { label: '国创', icon: '🏮' },
  tv:          { label: '电视剧', icon: '🖥️' },
  documentary: { label: '纪录片', icon: '🎞️' },
  movie:       { label: '电影', icon: '🎬' },
  book:        { label: '书籍', icon: '📖' },
  game:        { label: '游戏', icon: '🎮' },
};

const STATUS_LABELS = { done: '✅ 完成', reading: '📖 进行中', wish: '⭐ 待办' };

/** 根据 type + tags 判断所属分类 */
function getCategory(item) {
  if (item.type === 'anime' && item.tags?.includes('国创')) return 'donghua';
  return item.type;
}

/* ───── 数据 ───── */
let libraryData = [];

function pickSpine(type) {
  const pool = TYPE_SPINE_COLORS[type] || TYPE_SPINE_COLORS.book;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildStars(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

/* ───── 加载 ───── */
async function loadLibrary() {
  try {
    const resp = await fetch('src/data/library.json', { cache: 'no-cache' });
    if (!resp.ok) throw new Error('library fetch failed');
    return await resp.json();
  } catch {
    return [];
  }
}

/* ───── 渲染 ───── */

/** 每层书架放 4 本 */
const BOOKS_PER_SHELF = 4;

function chunkBooks(books) {
  const chunks = [];
  for (let i = 0; i < books.length; i += BOOKS_PER_SHELF) {
    chunks.push(books.slice(i, i + BOOKS_PER_SHELF));
  }
  return chunks;
}

function buildShelfHTML(chunks) {
  return chunks.map((chunk, si) => `
    <div class="library-shelf" style="--shelf-delay: ${si * 0.08}s">
      <div class="library-books-row">
        ${chunk.map((book, bi) => buildBookHTML(book, si * BOOKS_PER_SHELF + bi)).join('')}
      </div>
      <div class="shelf-plank">
        <span class="shelf-grain" aria-hidden="true"></span>
      </div>
    </div>
  `).join('');
}

function buildBookHTML(book, index) {
  const spine = pickSpine(book.type);
  const stars = buildStars(book.rating);

  return `
    <button class="library-book" type="button" data-index="${index}"
      style="--spine: ${spine}; --s-rotate: ${(Math.random() - 0.5) * 2.4}deg">
      <span class="book-type-icon" aria-hidden="true">
        ${(CATEGORIES[getCategory(book)] || CATEGORIES.book).icon}
      </span>
      <span class="book-spine" aria-hidden="true"></span>
      <span class="book-body">
        <span class="book-title">${escapeHtml(book.title)}</span>
        <span class="book-creator">${escapeHtml(book.creator)}</span>
        <span class="book-divider"></span>
        <span class="book-rating" aria-label="${book.rating} 星">${stars}</span>
        <span class="book-status-bar" data-status="${book.status}">
          <span class="book-status-text">${STATUS_LABELS[book.status] || book.status}</span>
        </span>
      </span>
    </button>
  `;
}

function buildEmptyShelf() {
  return `
    <div class="library-shelf library-shelf-empty">
      <div class="library-books-row library-books-row-empty">
        <p class="projects-status">书房这一格还空着，等一本好书……</p>
      </div>
      <div class="shelf-plank">
        <span class="shelf-grain" aria-hidden="true"></span>
      </div>
    </div>
  `;
}

/* ───── 详情弹窗 ───── */

function buildDetailHTML(book) {
  const stars = buildStars(book.rating);
  const tags = book.tags || [];

  return `
    <button class="detail-close" type="button" aria-label="关闭详情">✕</button>
    <div class="detail-type">${(CATEGORIES[getCategory(book)] || CATEGORIES.book).label}</div>
    <h2 class="detail-title">${escapeHtml(book.title)}</h2>
    <p class="detail-creator">${escapeHtml(book.creator)}</p>
    <div class="detail-rating">${stars}</div>
    <div class="detail-status" data-status="${book.status}">${STATUS_LABELS[book.status] || book.status}</div>
    <p class="detail-comment">${escapeHtml(book.comment)}</p>
    ${tags.length ? `<div class="detail-tags">${tags.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    ${book.date ? `<div class="detail-date">📅 ${book.date.replace('-', ' 年 ')} 月</div>` : ''}
  `;
}

/* ───── 弹窗动画 ───── */

function openDetail(book, bookEl) {
  const overlay = document.getElementById('detailOverlay');
  const card = document.getElementById('detailCard');
  if (!overlay || !card) return;

  /* 书本在视口中的中心坐标 */
  const rect = bookEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  card.innerHTML = buildDetailHTML(book);
  card.classList.remove('is-open');
  card.style.pointerEvents = 'none';
  overlay.hidden = false;

  /* 强制排版 — 此时卡片 scale(0) 但布局位置已确定 */
  void overlay.offsetHeight;

  /*
   * transform-origin 相对于元素自身盒模型计算。
   * card.getBoundingClientRect() 不受 transform:scale(0) 影响，
   * 返回的是真实的布局位置。
   */
  const cardRect = card.getBoundingClientRect();
  const originX = cx - cardRect.left;
  const originY = cy - cardRect.top;
  card.style.transformOrigin = `${originX}px ${originY}px`;

  /* 再次 reflow 让新的 transform-origin 生效 */
  void card.offsetHeight;

  /* 开启动画：卡片从书本位置"生长"到居中 */
  overlay.removeAttribute('aria-hidden');
  overlay.style.opacity = '1';
  card.classList.add('is-open');

  /* 卡片指针在过渡完成后开启 */
  card.addEventListener('transitionend', function onEnd() {
    card.style.pointerEvents = '';
    card.removeEventListener('transitionend', onEnd);
  });

  /* 关闭按钮绑定 */
  const closeBtn = card.querySelector('.detail-close');
  if (closeBtn) closeBtn.addEventListener('click', closeDetail);

  /* Escape 关闭 */
  document.addEventListener('keydown', onEscape);
}

function closeDetail() {
  const overlay = document.getElementById('detailOverlay');
  const card = document.getElementById('detailCard');
  if (!overlay || !card) return;

  card.classList.remove('is-open');
  overlay.style.opacity = '0';

  card.addEventListener('transitionend', function onEnd() {
    if (!card.classList.contains('is-open')) {
      overlay.hidden = true;
      overlay.setAttribute('aria-hidden', 'true');
      card.innerHTML = '';
      card.style.pointerEvents = '';
    }
    card.removeEventListener('transitionend', onEnd);
  }, { once: true });

  document.removeEventListener('keydown', onEscape);
}

function onEscape(e) {
  if (e.key === 'Escape') closeDetail();
}

/* ───── 分类 Tab ───── */
function setupTabs(shelfArea) {
  const container = document.getElementById('libraryTabs');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;

    container.querySelectorAll('[data-filter]').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');

    const filter = btn.dataset.filter;
    applyFilter(filter, shelfArea);
  });
}

function applyFilter(filter, shelfArea) {
  const filtered = filter === 'all'
    ? libraryData
    : libraryData.filter(b => getCategory(b) === filter);

  if (filtered.length === 0) {
    shelfArea.innerHTML = buildEmptyShelf();
  } else {
    shelfArea.innerHTML = buildShelfHTML(chunkBooks(filtered));
  }
}

/* ───── 点击书弹出详情 (委托) ───── */
function setupBookClicks(shelfArea) {
  shelfArea.addEventListener('click', (e) => {
    const bookEl = e.target.closest('.library-book');
    if (!bookEl) return;

    const idx = parseInt(bookEl.dataset.index, 10);
    const allBooks = gatherAllBooks();
    const book = allBooks[idx];
    if (!book) return;

    openDetail(book, bookEl);
  });
}

/** 收集当前过滤后 + 排序后的全部图书（与渲染顺序一致） */
function gatherAllBooks() {
  const activeTab = document.querySelector('#libraryTabs [data-filter].active');
  const filter = activeTab ? activeTab.dataset.filter : 'all';
  return filter === 'all'
    ? libraryData
    : libraryData.filter(b => getCategory(b) === filter);
}

/* ───── 点击弹窗外部关闭 ───── */
function setupOverlayClose() {
  const overlay = document.getElementById('detailOverlay');
  if (!overlay) return;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDetail();
  });
}

/* ───── 入口 ───── */
export async function initLibrary() {
  const shelfArea = document.getElementById('libraryShelfArea');
  if (!shelfArea) return;

  libraryData = await loadLibrary();

  setupTabs(shelfArea);
  setupBookClicks(shelfArea);
  setupOverlayClose();

  if (libraryData.length === 0) {
    shelfArea.innerHTML = buildEmptyShelf();
    return;
  }

  shelfArea.innerHTML = buildShelfHTML(chunkBooks(libraryData));
}
