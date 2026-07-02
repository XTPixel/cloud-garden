/* ========================================
   cat.js — 庭中黑猫 · 电子宠物主模块
   基于罗小黑 GIF 序列帧动画
   ======================================== */

import { storageKeys } from '../config.js';
import { readStorage, writeStorage } from '../utils/storage.js';
import { clamp } from '../utils/format.js';

// ---- 常量 ----
const GIF_BASE = 'src/assets/cat/';
const CAT_SIZE_W = 96;   // CSS 渲染尺寸
const CAT_SIZE_H = 104;

const MOVE_SPEED = 80;          // 像素/秒
const MOVE_THRESHOLD = 6;       // 到达判定距离

const TICK_INTERVAL = 1500;     // 状态 tick 间隔
const SAVE_INTERVAL = 30000;    // 状态保存间隔（30s）

// ---- 行为定义 ----
const BEHAVIORS = {
  idle:    { gif: 'lxh-idle.gif',       minDur: 2500, maxDur: 6000 },
  waiting: { gif: 'lxh-waiting.gif',    minDur: 2000, maxDur: 5000 },
  review:  { gif: 'lxh-review.gif',     minDur: 2000, maxDur: 4500 },
  waving:  { gif: 'lxh-waving.gif',     minDur: 1500, maxDur: 3500 },
  jumping: { gif: 'lxh-jumping.gif',    minDur: 800,  maxDur: 1500 },
  failed:  { gif: 'lxh-failed.gif',     minDur: 1200, maxDur: 2500 },
  // 走路——分方向
  walkRight: { gif: 'lxh-running-right.gif', minDur: 800, maxDur: 2000 },
  walkLeft:  { gif: 'lxh-running-left.gif',  minDur: 800, maxDur: 2000 },
  walkFwd:   { gif: 'lxh-running.gif',       minDur: 800, maxDur: 2000 },
};

// 走路行为列表（用于随机选择）
const WALK_BEHAVIORS = ['walkRight', 'walkLeft', 'walkFwd'];
const IDLE_BEHAVIORS = ['idle', 'waiting', 'review', 'waving'];
const ALL_BEHAVIORS = Object.keys(BEHAVIORS);

// 猫的语录（点击时随机显示）
const CAT_LINES = [
  '…看我干嘛？',
  '喵？',
  '（甩了甩尾巴）',
  '…饿了',
  '今天天气不错。',
  '（打了个哈欠）',
  '不想动……',
  '你回来了。',
  '……（眯眼）',
  '喵呜~',
  '庭院今天很安静呢。',
  '（耳朵抖了抖）',
];

// 点击反应
const CLICK_REACTIONS = [
  { gif: 'review', lines: ['嗯？', '…怎么了', '喵？'], dur: 1800 },
  { gif: 'waving', lines: ['（挥爪）', '嗨~', '你好'], dur: 2000 },
  { gif: 'jumping', lines: ['哇！', '吓我一跳！', '…！'], dur: 1200 },
  { gif: 'waiting', lines: ['…有事吗', '（歪头）', '嗯？'], dur: 2000 },
  { gif: 'failed', lines: ['…（叹气）', '困了', '…不跟你玩'], dur: 1800 },
];

// ---- 模块状态 ----
let catContainer = null;
let catSprite = null;
let state = {};
let target = { x: 0, y: 0 };
let moveStart = { x: 0, y: 0 };
let moveProgress = 0;        // 0~1
let moveDuration = 0;        // ms
let moveStartTime = 0;

let currentBehavior = 'idle';
let behaviorTimer = null;
let rafId = null;
let lastTimestamp = 0;
let isMoving = false;
let clickCount = 0;
let lastClickTime = 0;
let speechTimer = null;

// ---- Widget 位置缓存 ----
let widgetRects = [];

// ---- 工具 ----
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ============================================================
//  初始化
// ============================================================

export function initCat(opts = {}) {
  const isMini = opts.mini || false;

  // 读取持久化状态
  state = loadCatState();

  // 创建 DOM
  catContainer = document.createElement('div');
  catContainer.className = 'cat-container' + (isMini ? ' is-mini' : '');
  catContainer.setAttribute('aria-label', '庭院小黑猫');
  catContainer.setAttribute('role', 'img');
  catContainer.style.left = state.x + 'px';
  catContainer.style.top = state.y + 'px';

  catSprite = document.createElement('img');
  catSprite.className = 'cat-sprite';
  catSprite.src = GIF_BASE + 'lxh-idle.gif';
  catSprite.alt = '小黑猫';
  catContainer.appendChild(catSprite);
  document.body.appendChild(catContainer);

  // 刷新 widget 位置
  refreshWidgetRects();

  // 首次目标（初始位置稍微挪一下）
  target.x = state.x;
  target.y = state.y;

  // 启动
  bindEvents();
  if (!isMini) {
    startBehaviorLoop();
    startSaveLoop();
  } else {
    // 迷你模式：只播放 idle
    setBehavior('idle');
  }

  // 监听主题变化
  observeTheme();

  return catContainer;
}

// ============================================================
//  状态管理
// ============================================================

function defaultState() {
  // 默认初始位置——桌面右下区域（天气 widget 下方附近）
  return {
    x: 780,
    y: 620,
    energy: 80,
    mood: 65,
    hunger: 75,
    behavior: 'idle',
    totalDistance: 0,
    daysLived: 1,
    favoriteSpot: null,
    lastActiveAt: Date.now(),
    version: 1,
  };
}

function loadCatState() {
  const saved = readStorage('dashboard.cat', null);
  if (saved && saved.version === 1) {
    return { ...defaultState(), ...saved };
  }
  return defaultState();
}

function saveCatState() {
  state.lastActiveAt = Date.now();
  state.behavior = currentBehavior;
  state.x = parseFloat(catContainer?.style.left || state.x);
  state.y = parseFloat(catContainer?.style.top || state.y);
  writeStorage('dashboard.cat', state);
}

// ============================================================
//  行为状态机
// ============================================================

function startBehaviorLoop() {
  scheduleNextBehavior();
}

function scheduleNextBehavior(delay) {
  if (behaviorTimer) {
    clearTimeout(behaviorTimer);
    behaviorTimer = null;
  }
  // 如果正在移动，不打断
  if (isMoving) {
    behaviorTimer = setTimeout(scheduleNextBehavior, 500);
    return;
  }
  const dur = delay || rand(2000, 5000);
  behaviorTimer = setTimeout(pickNextBehavior, dur);
}

function pickNextBehavior() {
  if (isMoving) return;

  // 1. 概率决定去哪里
  const roll = Math.random();

  if (roll < 0.35) {
    // 走向一个随机位置
    const p = pickRandomTarget();
    startWalking(p.x, p.y);
    return;
  }

  if (roll < 0.55 && widgetRects.length > 0) {
    // 走向一个 widget
    const wid = pick(widgetRects);
    const wx = wid.left + wid.width / 2;
    const wy = wid.top + wid.height - 20;
    startWalking(wx, wy, true);
    return;
  }

  // 2. 原地 idle 行为
  if (state.energy < 25) {
    // 困了——睡觉
    setBehavior('waiting');
    scheduleNextBehavior(rand(3000, 6000));
  } else if (state.mood < 30) {
    // 心情差
    setBehavior('failed');
    scheduleNextBehavior(rand(2000, 3500));
  } else {
    const bhv = pick(IDLE_BEHAVIORS);
    setBehavior(bhv);
    scheduleNextBehavior(rand(2000, 5000));
  }
}

// ---- 移动系统 ----

function pickRandomTarget() {
  const margin = 80;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    x: clamp(rand(margin, vw - margin), margin, vw - margin),
    y: clamp(rand(margin + 40, vh - margin), margin + 40, vh - margin),
  };
}

function startWalking(tx, ty, isWidgetTarget) {
  const cx = parseFloat(catContainer.style.left) || state.x;
  const cy = parseFloat(catContainer.style.top) || state.y;

  // 同位置不动
  if (Math.abs(cx - tx) < 5 && Math.abs(cy - ty) < 5) {
    pickNextBehavior();
    return;
  }

  const dist = Math.hypot(tx - cx, ty - cy);
  moveDuration = (dist / MOVE_SPEED) * 1000; // ms
  moveProgress = 0;
  moveStart = { x: cx, y: cy };
  target = { x: tx, y: ty };
  moveStartTime = performance.now();
  isMoving = true;

  // 选择方向 GIF
  const dx = tx - cx;
  const dy = ty - cy;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx > absDy && dx > 0) setBehavior('walkRight');
  else if (absDx > absDy && dx < 0) setBehavior('walkLeft');
  else setBehavior('walkFwd');

  // 设置面向方向
  catContainer.dataset.facing = dx < 0 ? 'left' : 'right';

  // 启动移动循环
  if (rafId) cancelAnimationFrame(rafId);
  lastTimestamp = performance.now();
  moveLoop(lastTimestamp);
}

function moveLoop(timestamp) {
  if (!isMoving) return;

  const dt = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  const elapsed = timestamp - moveStartTime;
  moveProgress = Math.min(elapsed / moveDuration, 1);

  // 缓动函数：ease-in-out quad
  const ease = moveProgress < 0.5
    ? 2 * moveProgress * moveProgress
    : 1 - Math.pow(-2 * moveProgress + 2, 2) / 2;

  const cx = moveStart.x + (target.x - moveStart.x) * ease;
  const cy = moveStart.y + (target.y - moveStart.y) * ease;

  catContainer.style.left = cx + 'px';
  catContainer.style.top = cy + 'px';

  // 移动中更新小阴影
  updateShadow(cx, cy);

  if (moveProgress >= 1) {
    arrive();
    return;
  }

  rafId = requestAnimationFrame(moveLoop);
}

function arrive() {
  isMoving = false;
  catContainer.style.left = target.x + 'px';
  catContainer.style.top = target.y + 'px';
  state.totalDistance += Math.hypot(target.x - moveStart.x, target.y - moveStart.y);

  // 到达后先 idle 再决策
  setBehavior('idle');
  setTimeout(() => {
    // 如果附近有 widget，互动一下
    const nearby = findNearestWidget();
    if (nearby && Math.random() < 0.6) {
      interactWithWidget(nearby);
    } else {
      scheduleNextBehavior(rand(1500, 3000));
    }
  }, 600);
}

function updateShadow(cx, cy) {
  // 阴影由 CSS 处理
}

// ---- Widget 交互 ----

function refreshWidgetRects() {
  const widgets = document.querySelectorAll('.widget[data-widget]');
  widgetRects = Array.from(widgets).map(el => {
    const rect = el.getBoundingClientRect();
    return {
      el,
      id: el.dataset.widget,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    };
  });
}

function findNearestWidget() {
  const cx = parseFloat(catContainer.style.left) || state.x;
  const cy = parseFloat(catContainer.style.top) || state.y;
  let minDist = Infinity;
  let nearest = null;

  for (const w of widgetRects) {
    const d = Math.hypot(cx - w.centerX, cy - w.centerY);
    if (d < minDist) {
      minDist = d;
      nearest = w;
    }
  }

  // 只在 180px 内算"附近"
  return minDist < 180 ? nearest : null;
}

function interactWithWidget(widget) {
  if (!widget) return;
  setBehavior('review');

  // 猫看向 widget
  const dx = widget.centerX - (parseFloat(catContainer.style.left) || state.x);
  catContainer.dataset.facing = dx < 0 ? 'left' : 'right';

  // 针对不同 widget 的特定反应
  const wid = widget.id;
  let dur = 2500;

  switch (wid) {
    case 'music':
      // 听音乐
      dur = 3500;
      break;
    case 'clock':
      // 看时间
      dur = 3000;
      break;
    case 'greeting':
      // 在问候卡片旁休息
      dur = 4000;
      break;
    case 'quote':
      // 看箴言
      dur = 2500;
      break;
    case 'weather':
      // 看窗外
      dur = 3000;
      break;
    default:
      dur = 2000;
  }

  // 互动完继续
  scheduleNextBehavior(dur);
}

// ============================================================
//  GIF 切换
// ============================================================

function setBehavior(behavior) {
  if (!catSprite) return;

  currentBehavior = behavior;
  const def = BEHAVIORS[behavior];
  if (!def) return;

  // 切换 GIF src（强制刷新）
  catSprite.src = GIF_BASE + def.gif;

  // 更新容器状态类
  catContainer.classList.remove('is-sleeping', 'is-jumping');
  if (behavior === 'waiting' && state.energy < 30) {
    catContainer.classList.add('is-sleeping');
  }
  if (behavior === 'jumping') {
    catContainer.classList.add('is-jumping');
  }
}

// ============================================================
//  事件绑定
// ============================================================

function bindEvents() {
  // 点击
  catContainer.addEventListener('click', handleClick);
  catContainer.addEventListener('pointerdown', handlePointerDown);

  // 窗口变化刷新 widget 位置
  window.addEventListener('resize', () => {
    refreshWidgetRects();
  });

  // 页面可见性变化——回来后刷新位置
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      refreshWidgetRects();
    }
  });
}

function handleClick(e) {
  e.stopPropagation();

  const now = Date.now();

  // 双击检测
  if (now - lastClickTime < 400) {
    clickCount++;
  } else {
    clickCount = 1;
  }
  lastClickTime = now;

  if (clickCount >= 3) {
    // 三连击：表达爱
    showHearts(3);
    state.mood = Math.min(100, state.mood + 5);
    setBehavior('waving');
    showSpeech('(开心)');
    clearBehaviorTimer();
    scheduleNextBehavior(2000);
    clickCount = 0;
    return;
  }

  // 普通点击
  const reaction = pick(CLICK_REACTIONS);
  setBehavior(reaction.gif);
  showSpeech(pick(reaction.lines));
  spawnRipple();

  // 心情稍微提升
  state.mood = Math.min(100, state.mood + 2);

  clearBehaviorTimer();
  scheduleNextBehavior(reaction.dur);
}

function handlePointerDown(e) {
  // 用于标记点击 vs 拖动（避免和拖动冲突）
  // 简单起见只监听 click
}

function clearBehaviorTimer() {
  if (behaviorTimer) {
    clearTimeout(behaviorTimer);
    behaviorTimer = null;
  }
}

// ============================================================
//  特效
// ============================================================

function spawnRipple() {
  const ripple = document.createElement('div');
  ripple.className = 'cat-ripple';
  catContainer.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);
}

function showSpeech(text) {
  if (speechTimer) {
    clearTimeout(speechTimer);
    const old = catContainer.querySelector('.cat-speech');
    if (old) old.remove();
  }

  const bubble = document.createElement('div');
  bubble.className = 'cat-speech';
  bubble.textContent = text;
  catContainer.appendChild(bubble);

  speechTimer = setTimeout(() => {
    bubble.remove();
    speechTimer = null;
  }, 2500);
}

function showHearts(count) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const heart = document.createElement('span');
      heart.className = 'cat-heart';
      heart.textContent = '♥';
      heart.style.left = rand(-20, 20) + 'px';
      heart.style.top = '0px';
      catContainer.appendChild(heart);
      setTimeout(() => heart.remove(), 1300);
    }, i * 200);
  }
}

// ============================================================
//  主题监听
// ============================================================

function observeTheme() {
  const observer = new MutationObserver(() => {
    // 夜间模式时猫的配色由 CSS 处理，不需要额外操作
    // 但我们可以记录一下
    const isNight = document.documentElement.dataset.theme === 'night';
    catContainer.dataset.night = isNight ? 'true' : 'false';
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}

// ============================================================
//  状态保存循环
// ============================================================

function startSaveLoop() {
  setInterval(() => {
    saveCatState();
  }, SAVE_INTERVAL);
}

// ============================================================
//  子页面迷你模式 API
// ============================================================

export function setMiniCat(enabled) {
  if (!catContainer) return;
  if (enabled) {
    catContainer.classList.add('is-mini');
    if (rafId) cancelAnimationFrame(rafId);
    isMoving = false;
    clearBehaviorTimer();
    setBehavior('idle');
    // 放在右下角
    catContainer.style.right = '20px';
    catContainer.style.bottom = '20px';
    catContainer.style.left = 'auto';
    catContainer.style.top = 'auto';
  } else {
    catContainer.classList.remove('is-mini');
    catContainer.style.right = 'auto';
    catContainer.style.bottom = 'auto';
  }
}

// ============================================================
//  公开 API — 外部模块调用
// ============================================================

/**
 * 让猫对某个事件做出反应（外部触发）
 * @param {string} eventType - 'musicPlay' | 'musicPause' | 'timerEnd' | 'quoteClick' | 'weatherChange'
 */
export function catReact(eventType) {
  if (!catContainer || catContainer.classList.contains('is-mini')) return;

  switch (eventType) {
    case 'musicPlay':
      // 音乐播放 → 猫靠近音乐卡片听
      showSpeech('(竖起耳朵)');
      break;
    case 'musicPause':
      showSpeech('…嗯？');
      break;
    case 'timerEnd':
      setBehavior('jumping');
      showSpeech('！？');
      clearBehaviorTimer();
      scheduleNextBehavior(1500);
      break;
    case 'quoteClick':
      showSpeech(pick(['…有道理', '嗯…', '（点头）']));
      break;
    case 'weatherChange':
      setBehavior('review');
      showSpeech('(看窗外)');
      clearBehaviorTimer();
      scheduleNextBehavior(2500);
      break;
    default:
      break;
  }
}
