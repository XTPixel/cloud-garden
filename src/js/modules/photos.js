import { escapeHtml, escapeAttribute, clamp } from '../utils/format.js';
import { photos as photosConfig } from '../config.js';

const PHOTO_BASE = photosConfig.baseUrl;

const wall = document.querySelector('#photoWall');
const lightbox = document.querySelector('#photoLightbox');
const lightboxImage = document.querySelector('#photoLightboxImage');
const lightboxCaption = document.querySelector('#photoLightboxCaption');
const closeButton = document.querySelector('.photo-lightbox-close');

const MANIFEST_URL = 'src/data/photos.json';

let photos = [];
let topZIndex = 30;
let dragState = null;

/* ============================================
   动态布局生成（确定性伪随机）
   每张照片的位置由序号唯一确定，
   刷新页面或增减照片后布局保持一致
   ============================================ */

function frac(x) { return x - Math.floor(x); }

/**
 * 以黄金比例散点 + 分组推进生成布局坐标
 *
 * 每张照片的水平位置由 黄金比例取小数 确定——
 * 这是一种天然均匀分布却不重复的列阵方式，
 * 配合垂直方向每 ~5 张为一组向下推进、组间重叠，
 * 以及每张照片独立的小幅随机偏移和旋转，
 * 实现「乱中有序」的散落照片墙效果。
 *
 * @param {number} index — 照片在数组中的序号
 * @returns {[number, number, number]} [left%, top%, rotateDeg]
 */
function generateLayout(index) {
  // 水平安全边距与照片宽度
  const MARGIN_LR = 2;
  const PHOTO_W = 14;
  const MAX_X = 100 - MARGIN_LR - PHOTO_W;

  // 黄金比例 φ 的倒数 ≈ 0.618，能产生最均匀的 [0,1) 分布
  const PHI = 0.61803398875;
  const baseX = MARGIN_LR + frac(index * PHI) * (MAX_X - MARGIN_LR);

  // 每约 5 张为一「簇」，纵向推进，簇间重叠
  const CLUSTER_SIZE = 5;
  const CLUSTER_GAP = 16;   // vh
  const baseY = 2 + Math.floor(index / CLUSTER_SIZE) * CLUSTER_GAP;

  // 每张照片的独立偏移 — 打破行列感
  const jX = (frac(index * 0.371) - 0.5) * 7;       // ±3.5vw
  const jY = (frac(index * 0.839 + 0.3) - 0.5) * 5;  // ±2.5vh
  const rot = (frac(index * 0.517 + 0.7) - 0.5) * 24; // ±12°

  return [
    +clamp(baseX + jX, MARGIN_LR, MAX_X).toFixed(1),
    +(baseY + jY).toFixed(1),
    +rot.toFixed(1)
  ];
}

/* ============================================
   格式化
   ============================================ */

function formatPhotoTitle(filename) {
  return filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
}

/* ============================================
   灯箱
   ============================================ */

function openLightbox(filename) {
  const title = formatPhotoTitle(filename);
  lightboxImage.src = `${PHOTO_BASE}/${filename}`;
  lightboxImage.alt = title;
  lightboxCaption.textContent = title;
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-lightbox-open');
  closeButton.focus();
}

function closeLightbox() {
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-lightbox-open');
  lightboxImage.src = '';
}

/* ============================================
   拖拽
   ============================================ */

function startDrag(event, paper) {
  if (event.button !== 0) return;
  const wallRect = wall.getBoundingClientRect();
  topZIndex += 1;
  paper.style.zIndex = topZIndex;
  paper.classList.add('is-dragging');
  paper.dataset.wasDragged = 'false';
  paper.setPointerCapture(event.pointerId);

  const paperRect = paper.getBoundingClientRect();
  dragState = {
    paper,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: event.clientX - paperRect.left,
    offsetY: event.clientY - paperRect.top,
    wallRect,
    moved: false
  };
  event.preventDefault();
}

function moveDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  const delta = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
  if (delta > 4) dragState.moved = true;

  const paperRect = dragState.paper.getBoundingClientRect();
  const maxLeft = dragState.wallRect.width - paperRect.width * 0.42;
  const maxTop  = dragState.wallRect.height - paperRect.height * 0.42;
  const nextLeft = clamp(
    event.clientX - dragState.wallRect.left - dragState.offsetX,
    -paperRect.width * 0.42, maxLeft
  );
  const nextTop = clamp(
    event.clientY - dragState.wallRect.top - dragState.offsetY,
    -paperRect.height * 0.28, maxTop
  );

  // 拖拽中复位 CSS 变量偏移，直接用 left/top 定位
  dragState.paper.style.setProperty('--photo-x', '0px');
  dragState.paper.style.setProperty('--photo-y', '0px');
  dragState.paper.style.left = `${nextLeft}px`;
  dragState.paper.style.top  = `${nextTop}px`;
}

function endDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  const paper = dragState.paper;
  paper.classList.remove('is-dragging');
  paper.dataset.wasDragged = String(dragState.moved);
  window.setTimeout(() => { paper.dataset.wasDragged = 'false'; }, 0);
  dragState = null;
}

function bindPhotoPaper(paper, filename) {
  paper.addEventListener('pointerdown', (event) => startDrag(event, paper));
  paper.addEventListener('click', () => {
    if (paper.dataset.wasDragged === 'true') return;
    openLightbox(filename);
  });
  paper.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openLightbox(filename);
    }
  });
}

/* ============================================
   渲染
   ============================================ */

function renderPhotos() {
  wall.innerHTML = photos.map((photo, index) => {
    const [left, top, rotate] = generateLayout(index);
    const title = formatPhotoTitle(photo);
    return `
      <figure class="photo-paper" tabindex="0" role="button" aria-label="查看 ${escapeAttribute(title)}"
              style="--photo-x:${left}vw; --photo-y:${top}vh; --rotate:${rotate}deg; --hover-rotate:${(rotate * 0.45).toFixed(1)}deg; --z:${index + 1};">
        <img src="${PHOTO_BASE}/${escapeAttribute(photo)}" alt="${escapeAttribute(title)}" draggable="false" />
        <figcaption>${escapeHtml(title)}</figcaption>
      </figure>
    `;
  }).join('');

  wall.querySelectorAll('.photo-paper').forEach((paper, index) => bindPhotoPaper(paper, photos[index]));

  // 扩展容器高度使页面可以滚动
  const clusters = Math.ceil(photos.length / 5);
  wall.style.height = `${clusters * 16 + 24}vh`;
}

/* ============================================
   加载照片清单
   ============================================ */

async function loadManifest() {
  const emptyMsg = `
    <p class="photos-empty">📷 照片墙还是空的……<br>
    <small>请将照片放入 <code>photos/</code> 文件夹，
    然后运行 <code>node tools/scan-photos.js</code></small></p>`;

  try {
    const resp = await fetch(`${MANIFEST_URL}?t=${Date.now()}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const list = await resp.json();
    if (!Array.isArray(list) || list.length === 0) {
      wall.innerHTML = emptyMsg;
      return false;
    }
    photos = list;
    return true;
  } catch (e) {
    console.warn('[照片墙] 无法加载照片清单:', e);
    wall.innerHTML = emptyMsg;
    return false;
  }
}

/* ============================================
   刷新功能
   ============================================ */

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

async function refreshPhotos() {
  const btn = document.getElementById('photoRefreshBtn');
  if (!btn) return;
  btn.classList.add('is-spinning');

  try {
    // ① 优先调用服务端 API —— 只有 node server.js 下可用
    const resp = await fetch('/api/scan-photos', { method: 'POST' });
    if (resp.ok) {
      const data = await resp.json();
      if (data.ok) {
        if (Array.isArray(data.photos) && data.photos.length > 0) {
          photos = data.photos;
          renderPhotos();
          showToast(`✅ 已更新，共 ${photos.length} 张照片`);
        } else {
          photos = [];
          renderPhotos();
          showToast('📭 photos/ 目录中没有照片', 2500);
        }
        return;
      }
      // API 返回了错误
      showToast('⚠️ 扫描失败: ' + (data.error || '未知错误'), 3500);
      return;
    }

    // ② API 不可用（未使用 node server.js）
    //    尝试重新拉取清单（需用户已手动运行 node tools/scan-photos.js）
    const fallbackResp = await fetch(`${MANIFEST_URL}?t=${Date.now()}`);
    if (fallbackResp.ok) {
      const list = await fallbackResp.json();
      if (Array.isArray(list)) {
        // 比较是否真的有变化
        const same = list.length === photos.length &&
          list.every((f, i) => f === photos[i]);
        if (same) {
          showToast('💡 清单未变化，请在终端执行 node tools/scan-photos.js 后重试', 3500);
          return;
        }
        if (list.length > 0) {
          photos = list;
          renderPhotos();
          showToast(`✅ 已刷新，共 ${photos.length} 张照片`);
        } else {
          photos = [];
          renderPhotos();
          showToast('📭 photos/ 目录中没有照片', 2500);
        }
        return;
      }
    }

    // ③ 全部失败
    showToast('⚠️ 刷新失败，请使用 node server.js 启动服务', 3500);
  } catch (e) {
    // ④ 网络错误（如 file:// 直接打开）
    showToast('⚠️ 请在终端执行 node tools/scan-photos.js 后刷新页面', 3500);
  } finally {
    btn.classList.remove('is-spinning');
  }
}

/* ============================================
   启动
   ============================================ */

async function init() {
  if (!wall || !lightbox || !lightboxImage || !lightboxCaption || !closeButton) return;

  const ok = await loadManifest();
  if (!ok) return;

  renderPhotos();

  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  closeButton.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && lightbox.getAttribute('aria-hidden') === 'false') closeLightbox();
  });

  // 绑定刷新按钮
  const refreshBtn = document.getElementById('photoRefreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshPhotos);
  }
}

init();
