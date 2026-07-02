(() => {
  const storageKey = 'dashboard.theme';
  const root = document.documentElement;
  const savedTheme = (() => {
    try {
      return localStorage.getItem(storageKey);
    } catch (error) {
      return null;
    }
  })();

  if (savedTheme === 'night') root.dataset.theme = 'night';
})();
