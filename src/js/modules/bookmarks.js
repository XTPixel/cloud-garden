import { elements } from '../dom.js';

const fallbackBookmarks = [
  { title: 'GitHub', url: 'https://github.com/XTPixel', tone: 'github' },
  { title: 'Bilibili', url: 'https://space.bilibili.com/401865997', tone: 'bilibili' },
  { title: '小红书', url: 'https://www.xiaohongshu.com/user/profile/649e868700000000100348aa', tone: 'rednote' },
  { title: 'Email', url: 'https://mail.qq.com/cgi-bin/qm_share?t=qm_mailme&email=2742996687@qq.com', tone: 'email' }
];

const platformIcons = {
  github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.36 6.84 9.72.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.19-1.11-1.51-1.11-1.51-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.98c.85 0 1.71.12 2.51.34 1.9-1.33 2.74-1.05 2.74-1.05.56 1.41.21 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z"/></svg>',
  bilibili: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.34 4.18a.9.9 0 0 1 1.27 0L12 6.57l2.39-2.39a.9.9 0 1 1 1.27 1.27l-1.84 1.84h2.72A4.46 4.46 0 0 1 21 11.75v3.5a4.46 4.46 0 0 1-4.46 4.46H7.46A4.46 4.46 0 0 1 3 15.25v-3.5a4.46 4.46 0 0 1 4.46-4.46h2.72L8.34 5.45a.9.9 0 0 1 0-1.27ZM7.46 9.08a2.66 2.66 0 0 0-2.66 2.67v3.5a2.66 2.66 0 0 0 2.66 2.66h9.08a2.66 2.66 0 0 0 2.66-2.66v-3.5a2.66 2.66 0 0 0-2.66-2.67H7.46Zm1.58 3.01c.5 0 .9.4.9.9v1.2a.9.9 0 1 1-1.8 0v-1.2c0-.5.4-.9.9-.9Zm5.92 0c.5 0 .9.4.9.9v1.2a.9.9 0 1 1-1.8 0v-1.2c0-.5.4-.9.9-.9Z"/></svg>',
  rednote: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.56 3h10.88A3.56 3.56 0 0 1 21 6.56v10.88A3.56 3.56 0 0 1 17.44 21H6.56A3.56 3.56 0 0 1 3 17.44V6.56A3.56 3.56 0 0 1 6.56 3Zm.99 4.38v3.52H5.82v1.7h1.73v4.04h1.82V12.6h1.83v-1.7H9.37V7.38H7.55Zm5.06 0-.65 2.07h-1.28v1.66h.76l-1.14 3.65h1.72l.4-1.33h1.54l.41 1.33h1.77l-1.15-3.65h.8V9.45h-1.32l-.65-2.07h-1.21Zm.16 4.55.42-1.45.43 1.45h-.85Zm3.02-4.55v9.26h1.83V7.38h-1.83Z"/></svg>',
  email: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5h15A2.5 2.5 0 0 1 22 8v8a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 16V8a2.5 2.5 0 0 1 2.5-2.5Zm0 2c-.1 0-.2.01-.29.04L12 12.62l7.79-5.08a1 1 0 0 0-.29-.04h-15Zm15.5 2.02-7.45 4.86a1 1 0 0 1-1.1 0L4 9.52V16c0 .28.22.5.5.5h15c.28 0 .5-.22.5-.5V9.52Z"/></svg>'
};

let bookmarks = [];

function normalizeBookmarks(data) {
  if (!Array.isArray(data)) return fallbackBookmarks;
  const normalized = data.map((item) => ({
    title: String(item?.title || '').trim(),
    url: String(item?.url || '').trim(),
    tone: String(item?.tone || 'default').trim()
  })).filter((item) => item.title && item.url);
  return normalized.length > 0 ? normalized : fallbackBookmarks;
}

/* ---- Toast 提示（复用已有样式 .photo-toast） ---- */
function showToast(msg, duration) {
  duration = duration || 2000;
  let el = document.querySelector('.photo-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'photo-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('is-visible');
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => el.classList.remove('is-visible'), duration);
}

/* 从 QQ 邮箱分享链接中提取邮箱地址 */
function extractEmail(url) {
  const m = url.match(/email=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

function handleEmailClick(e) {
  const bookmark = bookmarks.find(b => b.tone === 'email');
  if (!bookmark) return;
  const email = extractEmail(bookmark.url);
  if (!email) return;
  navigator.clipboard.writeText(email).then(() => {
    showToast('📋 已复制邮箱');
  }).catch(() => {
    /* fallback: 选中并复制 */
    const ta = document.createElement('textarea');
    ta.value = email;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('📋 已复制邮箱');
  });
}

function renderBookmarks() {
  elements.bookmarkGrid.innerHTML = bookmarks.map((bookmark) => {
    if (bookmark.tone === 'email') {
      return `
        <span class="quick-link" role="button" tabindex="0" data-tone="email"
              title="点击复制邮箱地址">
          <span class="quick-link-icon">${platformIcons.email}</span>
          <span>${bookmark.title}</span>
        </span>
      `;
    }
    return `
      <a class="quick-link" href="${bookmark.url}" target="_blank" rel="noreferrer" data-tone="${bookmark.tone}">
        <span class="quick-link-icon">${platformIcons[bookmark.tone] || platformIcons.email}</span>
        <span>${bookmark.title}</span>
      </a>
    `;
  }).join('');

  /* 绑定 Email 点击事件 */
  const emailLink = elements.bookmarkGrid.querySelector('[data-tone="email"]');
  if (emailLink) {
    emailLink.addEventListener('click', handleEmailClick);
    emailLink.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleEmailClick(e);
      }
    });
  }
}

export async function loadBookmarks() {
  try {
    const response = await fetch('src/data/bookmarks.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('bookmarks request failed');
    bookmarks = normalizeBookmarks(await response.json());
  } catch {
    bookmarks = fallbackBookmarks;
  }
  renderBookmarks();
}
