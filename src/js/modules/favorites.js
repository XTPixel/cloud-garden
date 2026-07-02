(() => {
  const defaultFavorites = [
    {
      title: 'HAPPY',
      url: 'https://happy.bigmess.org/',
      description: '一个带有复古与实验气质的网页小站。'
    },
    {
      title: 'Soundwise AI',
      url: 'https://soundwise.ai/zh-CN',
      description: '面向中文用户的 AI 音频与声音工具。'
    },
    {
      title: 'Smallpdf',
      url: 'https://smallpdf.com/cn',
      description: '在线处理、转换和压缩 PDF 的实用工具箱。'
    }
  ];

  let favorites = [];

  Garden.initFavoritesPage = async function initFavoritesPage() {
    favorites = await loadFavorites();
    bindFavoriteEvents();
    renderFavorites();
  };

  async function loadFavorites() {
    const saved = Garden.readStorage(Garden.storageKeys.favorites, null);
    if (Array.isArray(saved)) return normalizeFavorites(saved);

    try {
      const response = await fetch('src/data/favorite-sites.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('favorites request failed');
      return normalizeFavorites(await response.json());
    } catch {
      return defaultFavorites;
    }
  }

  function bindFavoriteEvents() {
    Garden.elements.favoriteForm?.addEventListener('submit', handleAddFavorite);
    Garden.elements.favoriteGrid?.addEventListener('click', handleGridClick);
    Garden.elements.selectAllFavorites?.addEventListener('click', toggleSelectAll);
    Garden.elements.deleteSelectedFavorites?.addEventListener('click', deleteSelectedFavorites);
  }

  function handleAddFavorite(event) {
    event.preventDefault();

    const title = Garden.elements.favoriteTitle.value.trim();
    const url = normalizeUrl(Garden.elements.favoriteUrl.value.trim());
    const description = Garden.elements.favoriteDescription.value.trim();

    if (!title || !url) return;

    favorites.unshift({ title, url, description });
    Garden.elements.favoriteForm.reset();
    saveAndRender('已添加到收藏顶部。');
  }

  function handleGridClick(event) {
    const control = event.target.closest('[data-favorite-action]');
    if (control) {
      event.preventDefault();
      event.stopPropagation();
      handleCardAction(control);
    }
  }

  function handleCardAction(control) {
    const card = control.closest('.favorite-card');
    const index = Number(card?.dataset.index);
    if (!Number.isInteger(index)) return;

    const action = control.dataset.favoriteAction;
    if (action === 'delete') {
      favorites.splice(index, 1);
      saveAndRender('已删除 1 个收藏。');
      return;
    }

    if (action === 'up' && index > 0) {
      swapFavorites(index, index - 1);
      saveAndRender('顺序已上移。');
      return;
    }

    if (action === 'down' && index < favorites.length - 1) {
      swapFavorites(index, index + 1);
      saveAndRender('顺序已下移。');
    }
  }

  function toggleSelectAll() {
    const checkboxes = [...Garden.elements.favoriteGrid.querySelectorAll('.favorite-select')];
    const shouldSelectAll = checkboxes.some((checkbox) => !checkbox.checked);
    checkboxes.forEach((checkbox) => {
      checkbox.checked = shouldSelectAll;
    });
    updateTip(shouldSelectAll ? '已选中全部收藏。' : '已取消全部选择。');
  }

  function deleteSelectedFavorites() {
    const selectedIndexes = [...Garden.elements.favoriteGrid.querySelectorAll('.favorite-select:checked')]
      .map((checkbox) => Number(checkbox.dataset.index))
      .filter(Number.isInteger);

    if (selectedIndexes.length === 0) {
      updateTip('请先勾选需要删除的收藏。');
      return;
    }

    const selectedSet = new Set(selectedIndexes);
    favorites = favorites.filter((_, index) => !selectedSet.has(index));
    saveAndRender(`已删除 ${selectedIndexes.length} 个收藏。`);
  }

  function swapFavorites(fromIndex, toIndex) {
    [favorites[fromIndex], favorites[toIndex]] = [favorites[toIndex], favorites[fromIndex]];
  }

  function saveAndRender(message) {
    Garden.writeStorage(Garden.storageKeys.favorites, favorites);
    renderFavorites();
    updateTip(message);
  }

  function renderFavorites() {
    if (!Garden.elements.favoriteGrid) return;

    if (favorites.length === 0) {
      Garden.elements.favoriteGrid.innerHTML = '<p class="projects-status">收藏清单空了，先在顶部添加一个网站吧。</p>';
      return;
    }

    Garden.elements.favoriteGrid.innerHTML = favorites.map((favorite, index) => `
      <article class="favorite-card" data-index="${index}">
        <label class="favorite-check" aria-label="选择 ${escapeAttribute(favorite.title)}">
          <input class="favorite-select" type="checkbox" data-index="${index}" />
        </label>
        <a class="favorite-card-link" href="${escapeAttribute(favorite.url)}" target="_blank" rel="noreferrer" aria-label="打开 ${escapeAttribute(favorite.title)}">
          <div class="favorite-card-main">
            <span class="favorite-favicon" aria-hidden="true">${getInitial(favorite.title)}</span>
            <div>
              <h3>${escapeHtml(favorite.title)}</h3>
              <p>${escapeHtml(favorite.description || getHostname(favorite.url))}</p>
              <small>${escapeHtml(getHostname(favorite.url))}</small>
            </div>
          </div>
        </a>
        <div class="favorite-card-controls" aria-label="调整 ${escapeAttribute(favorite.title)}">
          <button type="button" data-favorite-action="up" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" data-favorite-action="down" ${index === favorites.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="danger" type="button" data-favorite-action="delete">删除</button>
        </div>
      </article>
    `).join('');
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
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  function getInitial(title) {
    return escapeHtml(title.trim().slice(0, 1).toUpperCase() || '◎');
  }

  function updateTip(message) {
    if (Garden.elements.favoriteTip) Garden.elements.favoriteTip.textContent = message;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    })[char]);
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/'/g, '&#039;');
  }
})();


