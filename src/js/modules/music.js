(() => {
  const { elements } = Garden;

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

    musicToggle.disabled = false;
    musicToggle.textContent = isPlaying ? '❚❚' : '▶';
    musicToggle.setAttribute('aria-label', isPlaying ? '暂停晚安喵' : '播放晚安喵');
  }

  function setUnavailableState() {
    const { musicToggle, songArtist } = elements;
    if (musicToggle) {
      musicToggle.disabled = true;
      musicToggle.textContent = '!';
      musicToggle.setAttribute('aria-label', '音乐加载失败');
    }
    if (songArtist) songArtist.textContent = '音乐加载失败，请检查本地文件';
  }

  async function toggleMusic() {
    const { musicAudio } = elements;
    if (!musicAudio) return;

    if (musicAudio.paused) {
      try {
        await musicAudio.play();
      } catch (error) {
        console.warn('无法播放音乐：', error);
        if (musicAudio.error) {
          setUnavailableState();
          return;
        }
        setPlayingState(false);
      }
      return;
    }

    musicAudio.pause();
  }

  function initMusicPlayer() {
    const { musicAudio, musicToggle } = elements;
    if (!musicAudio || !musicToggle) return;

    musicToggle.addEventListener('click', toggleMusic);
    musicAudio.addEventListener('play', () => setPlayingState(true));
    musicAudio.addEventListener('pause', () => setPlayingState(false));
    musicAudio.addEventListener('timeupdate', updateProgress);
    musicAudio.addEventListener('loadedmetadata', updateProgress);
    musicAudio.addEventListener('error', setUnavailableState);
    musicAudio.addEventListener('ended', () => {
      musicAudio.currentTime = 0;
      updateProgress();
      setPlayingState(false);
    });
  }

  Garden.initMusicPlayer = initMusicPlayer;
})();
