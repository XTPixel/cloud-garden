(function () {
  const articleList = document.querySelector('#articleList');
  const manifestPath = 'articles/manifest.json';

  if (!articleList) return;

  async function loadArticles() {
    try {
      const response = await fetch(manifestPath, { cache: 'no-store' });
      if (!response.ok) throw new Error(`manifest ${response.status}`);
      const articles = await response.json();
      renderArticles(normalizeArticles(articles));
    } catch (error) {
      articleList.innerHTML = '<p class="projects-status">暂时无法读取 articles/manifest.json，请确认通过本地服务器打开页面。</p>';
    }
  }

  function normalizeArticles(articles) {
    if (!Array.isArray(articles)) return [];
    return articles
      .filter((article) => article?.title && article?.file && article?.createdAt)
      .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
  }

  function renderArticles(articles) {
    if (!articles.length) {
      articleList.innerHTML = '<p class="projects-status">articles 文件夹里还没有登记文章。</p>';
      return;
    }

    articleList.innerHTML = articles.map((article) => {
      const tags = Array.isArray(article.tags) ? article.tags : [];
      const url = `article.html?file=${encodeURIComponent(article.file)}`;
      return `
        <article class="article-card">
          <a href="${escapeAttribute(url)}" aria-label="阅读 ${escapeAttribute(article.title)}">
            <time datetime="${escapeAttribute(article.createdAt)}">${formatDate(article.createdAt)}</time>
            <h3>${escapeHtml(article.title)}</h3>
            <p>${escapeHtml(article.summary || '这篇文章还没有摘要，点进去看看全文吧。')}</p>
            <div class="article-tags">
              ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
            </div>
          </a>
        </article>
      `;
    }).join('');
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '创建时间未知';
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>\"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[char]));
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/'/g, '&#39;');
  }

  loadArticles();
})();
