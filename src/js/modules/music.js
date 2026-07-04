import { elements } from '../dom.js';

/* ====================================
   播放列表 — 按顺序排在 src/assets/music/
   ==================================== */
const playlist = [
  {
    src: new URL('../../assets/music/wan-an-miao.mp3', import.meta.url).href,
    title: '晚安喵',
    artist: '《罗小黑战记》主题曲 · 艾索',
  },
  {
    src: new URL('../../assets/music/稻香-周杰伦.mp3', import.meta.url).href,
    title: '稻香',
    artist: '周杰伦',
  },
  {
    src: new URL('../../assets/music/昔涟-张韶涵＿HOYO-MiX.mp3', import.meta.url).href,
    title: '昔涟',
    artist: '张韶涵 & HOYO-MiX',
  },
];

let currentIndex = 0;

// ── 内部状态更新 ──────────────────────────────────

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

// ── 歌曲切换 ──────────────────────────────────────

/**
 * 加载指定索引的歌曲并更新 UI（不自动播放）
 */
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

// ── 用户操作 ──────────────────────────────────────

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
  // 切歌后自动播放
  const { musicAudio } = elements;
  if (musicAudio) musicAudio.play().catch(() => {});
}

function nextTrack() {
  const next = currentIndex < playlist.length - 1 ? currentIndex + 1 : 0;
  loadTrack(next);
  const { musicAudio } = elements;
  if (musicAudio) musicAudio.play().catch(() => {});
}

// ── 初始化 ────────────────────────────────────────

export function initMusicPlayer() {
  const { musicAudio, musicToggle, musicPrev, musicNext } = elements;
  if (!musicAudio || !musicToggle) return;

  // 用播放列表第一首填充 UI
  loadTrack(0);

  // 点击事件
  musicToggle.addEventListener('click', toggleMusic);
  if (musicPrev) musicPrev.addEventListener('click', prevTrack);
  if (musicNext) musicNext.addEventListener('click', nextTrack);

  // 媒体事件
  musicAudio.addEventListener('play', () => setPlayingState(true));
  musicAudio.addEventListener('pause', () => setPlayingState(false));
  musicAudio.addEventListener('timeupdate', updateProgress);
  musicAudio.addEventListener('loadedmetadata', updateProgress);
  musicAudio.addEventListener('error', setUnavailableState);

  // 自动切歌（循环播放）
  musicAudio.addEventListener('ended', nextTrack);
}
