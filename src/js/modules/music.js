import { elements } from '../dom.js';
import { music as musicConfig } from '../config.js';

const MUSIC_BASE = musicConfig.baseUrl;

/* ====================================
   播放列表 — 按顺序排在 src/assets/music/
   ==================================== */
const playlist = [
  {
    src: MUSIC_BASE ? `${MUSIC_BASE}/wan-an-miao.mp3` : new URL('../../assets/music/wan-an-miao.mp3', import.meta.url).href,
    title: '晚安喵',
    artist: '《罗小黑战记》主题曲 · 艾索',
  },
  {
    src: MUSIC_BASE ? `${MUSIC_BASE}/稻香-周杰伦.mp3` : new URL('../../assets/music/稻香-周杰伦.mp3', import.meta.url).href,
    title: '稻香',
    artist: '周杰伦',
  },
  {
    src: MUSIC_BASE ? `${MUSIC_BASE}/昔涟-张韶涵＿HOYO-MiX.mp3` : new URL('../../assets/music/昔涟-张韶涵＿HOYO-MiX.mp3', import.meta.url).href,
    title: '昔涟',
    artist: '张韶涵 & HOYO-MiX',
  },
];

let currentIndex = 0;

/* ====================================
   状态持久化 — sessionStorage
   跨页面切换后自动续播
   ==================================== */
const MUSIC_STATE_KEY = 'dashboard.musicState';

function saveState(overrides = {}) {
  const { musicAudio } = elements;
  if (!musicAudio) return;
  try {
    const state = {
      currentIndex,
      currentTime: musicAudio.currentTime || 0,
      isPlaying: !musicAudio.paused,
      ...overrides,
    };
    sessionStorage.setItem(MUSIC_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    /* storage full — 静默忽略 */
  }
}

function restoreState() {
  try {
    const raw = sessionStorage.getItem(MUSIC_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* ====================================
   内部状态更新
   ==================================== */

function updateProgress() {
  const { musicAudio, musicProgress } = elements;
  if (!musicAudio || !musicProgress) return;
  const duration = musicAudio.duration || 0;
  const percent = duration > 0 ? (musicAudio.currentTime / duration) * 100 : 0;
  musicProgress.style.width = `${Math.min(percent, 100)}%`;
}

function setPlayingState(isPlaying) {
  const { musicToggle } = elements;
  if (!musicToggle) return;
  const song = playlist[currentIndex];
  musicToggle.disabled = false;
  musicToggle.textContent = isPlaying ? '❚❚' : '▶';
  musicToggle.setAttribute('aria-label', isPlaying ? `暂停${song.title}` : `播放${song.title}`);
}

function setUnavailableState() {
  const { musicToggle, songArtist } = elements;
  if (musicToggle) {
    musicToggle.disabled = true;
    musicToggle.textContent = '!';
    musicToggle.setAttribute('aria-label', '音乐加载失败');
  }
  if (songArtist) songArtist.textContent = '音乐加载失败，请刷新重试';
}

function updateButtonStates() {
  const { musicPrev, musicNext } = elements;
  const prev = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;
  const next = currentIndex < playlist.length - 1 ? currentIndex + 1 : 0;
  if (musicPrev) {
    musicPrev.disabled = false;
    musicPrev.setAttribute('aria-label', `上一首：${playlist[prev].title}`);
  }
  if (musicNext) {
    musicNext.disabled = false;
    musicNext.setAttribute('aria-label', `下一首：${playlist[next].title}`);
  }
}

/* ====================================
   歌曲切换
   ==================================== */

function loadTrack(index) {
  if (index < 0 || index >= playlist.length) return;
  currentIndex = index;
  const song = playlist[index];
  const { musicAudio, songTitle, songArtist, musicToggle } = elements;

  if (songTitle) songTitle.textContent = song.title;
  if (songArtist) songArtist.textContent = song.artist;
  if (musicAudio) {
    musicAudio.src = song.src;
    musicAudio.load();
  }
  if (musicToggle) {
    musicToggle.textContent = '▶';
    musicToggle.disabled = false;
    musicToggle.setAttribute('aria-label', `播放${song.title}`);
  }
  updateProgress();
  updateButtonStates();
}

/* ====================================
   用户操作
   ==================================== */

async function toggleMusic() {
  const { musicAudio } = elements;
  if (!musicAudio) return;

  if (musicAudio.paused) {
    try {
      await musicAudio.play();
    } catch (error) {
      console.warn('无法播放音乐：', error);
      if (musicAudio.error) { setUnavailableState(); return; }
      setPlayingState(false);
    }
    return;
  }
  musicAudio.pause();
}

function prevTrack() {
  const prev = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;
  loadTrack(prev);
  const { musicAudio } = elements;
  if (musicAudio) musicAudio.play().catch(() => {});
}

function nextTrack() {
  const next = currentIndex < playlist.length - 1 ? currentIndex + 1 : 0;
  loadTrack(next);
  const { musicAudio } = elements;
  if (musicAudio) musicAudio.play().catch(() => {});
}

/* ====================================
   初始化
   ==================================== */

export function initMusicPlayer() {
  const { musicAudio, musicToggle, musicPrev, musicNext } = elements;
  if (!musicAudio || !musicToggle) return;

  // ── 恢复跨页面播放状态 ──────────────────────
  const savedState = restoreState();
  let shouldAutoPlay = false;

  if (savedState && savedState.currentIndex !== undefined) {
    const idx = savedState.currentIndex;
    if (idx >= 0 && idx < playlist.length) {
      currentIndex = idx;
      loadTrack(currentIndex);

      // 音频加载完成后 seek 到保存的进度
      const seekAfterLoad = () => {
        const ct = savedState.currentTime || 0;
        if (ct > 0 && ct < (musicAudio.duration || Infinity)) {
          musicAudio.currentTime = ct;
        }
        // 若离开时正在播放，自动续播
        if (savedState.isPlaying) {
          musicAudio.play().catch(() => {
            // 浏览器阻止自动播放：等一次用户交互
            const retry = () => { musicAudio.play().catch(() => {}); };
            document.addEventListener('pointerdown', retry, { once: true });
            document.addEventListener('keydown', retry, { once: true });
          });
        }
      };

      if (musicAudio.readyState >= 1) {
        seekAfterLoad();
      } else {
        musicAudio.addEventListener('loadedmetadata', seekAfterLoad, { once: true });
      }
    } else {
      loadTrack(0);
    }
  } else {
    loadTrack(0);
  }

  // ── 绑定事件 ────────────────────────────────
  musicToggle.addEventListener('click', toggleMusic);
  if (musicPrev) musicPrev.addEventListener('click', prevTrack);
  if (musicNext) musicNext.addEventListener('click', nextTrack);

  musicAudio.addEventListener('play', () => setPlayingState(true));
  musicAudio.addEventListener('pause', () => setPlayingState(false));
  musicAudio.addEventListener('timeupdate', () => {
    updateProgress();
    saveState(); // 定期持久化进度 (约 250ms)
  });
  musicAudio.addEventListener('loadedmetadata', updateProgress);
  musicAudio.addEventListener('error', setUnavailableState);

  // 自动切歌（循环播放）
  musicAudio.addEventListener('ended', nextTrack);

  // ── 全局状态持久化 ──────────────────────────
  // 页面可见性变化时保存（切标签页 / 切后台）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveState();
  });

  // 页面即将卸载时保存（包括 MPA 导航）
  window.addEventListener('pagehide', () => saveState());

  // bfcache 恢复后重新同步 UI
  window.addEventListener('pageshow', () => {
    // 验证当前音频状态与 DOM 控件一致
    if (!musicAudio.paused) {
      setPlayingState(true);
    }
    updateProgress();
  });
}
