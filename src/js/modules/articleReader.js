(function () {
  const reader = document.querySelector('#articleReader');
  const outline = document.querySelector('#articleOutline');
  const manifestPath = 'articles/manifest.json';
  const articleDir = 'articles/';

  if (!reader || !outline) return;

  async function loadArticle() {
    const file = new URLSearchParams(window.location.search).get('file');
    if (!isSafeMarkdownFile(file)) {
      renderError('没有找到要阅读的文章。');
      return;
    }

    try {
      const [manifestResponse, markdownResponse] = await Promise.all([
        fetch(manifestPath, { cache: 'no-store' }),
        fetch(`${articleDir}${file}`, { cache: 'no-store' })
      ]);

      if (!manifestResponse.ok) throw new Error(`manifest ${manifestResponse.status}`);
      if (!markdownResponse.ok) throw new Error(`markdown ${markdownResponse.status}`);

      const manifest = await manifestResponse.json();
      const metadata = Array.isArray(manifest) ? manifest.find((article) => article.file === file) : null;
      const markdown = await markdownResponse.text();
      renderArticle(markdown, metadata, file);
    } catch (error) {
      renderError('暂时无法读取这篇 Markdown 文章，请确认文件已登记且页面由本地服务器提供。');
    }
  }

  function renderArticle(markdown, metadata, file) {
    const parsed = parseMarkdown(markdown);
    const title = metadata?.title || parsed.title || file.replace(/\.md$/i, '');
    document.title = `${title} · 云外庭院`;

    reader.innerHTML = `
      <header class="article-reader-head">
        <span class="kicker">LOCAL ARTICLE</span>
        <h1>${escapeHtml(title)}</h1>
        <div class="article-reader-meta">
          <time datetime="${escapeAttribute(metadata?.createdAt || '')}">${formatDate(metadata?.createdAt)}</time>
          ${(metadata?.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
        </div>
      </header>
      <div class="markdown-body">
        ${parsed.html}
      </div>
    `;

    renderOutline(parsed.headings);
  }

  function parseMarkdown(markdown) {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const headings = [];
    const htmlParts = [];
    let paragraph = [];
    let listItems = [];
    let inFence = false;
    let codeLines = [];
    let title = '';

    function flushParagraph() {
      if (!paragraph.length) return;
      htmlParts.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }

    function flushList() {
      if (!listItems.length) return;
      htmlParts.push(`<ul>${listItems.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ul>`);
      listItems = [];
    }

    function flushCode() {
      htmlParts.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      codeLines = [];
    }

    lines.forEach((line) => {
      if (/^```/.test(line.trim())) {
        if (inFence) {
          flushCode();
          inFence = false;
        } else {
          flushParagraph();
          flushList();
          inFence = true;
        }
        return;
      }

      if (inFence) {
        codeLines.push(line);
        return;
      }

      const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
      if (headingMatch) {
        flushParagraph();
        flushList();
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        const id = slugify(text, headings.length);
        if (level === 1 && !title) title = text;
        if (level > 1) headings.push({ level, text, id });
        htmlParts.push(`<h${level} id="${escapeAttribute(id)}">${renderInline(text)}</h${level}>`);
        return;
      }

      const listMatch = /^[-*]\s+(.+)$/.exec(line);
      if (listMatch) {
        flushParagraph();
        listItems.push(listMatch[1]);
        return;
      }

      if (!line.trim()) {
        flushParagraph();
        flushList();
        return;
      }

      flushList();
      paragraph.push(line.trim());
    });

    flushParagraph();
    flushList();
    if (inFence) flushCode();

    return { title, headings, html: htmlParts.join('\n') };
  }

  function renderInline(value) {
    return escapeHtml(value)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  }

  function renderOutline(headings) {
    if (!headings.length) {
      outline.innerHTML = '<p class="outline-empty">这篇文章还没有二级标题。</p>';
      return;
    }

    outline.innerHTML = headings.map((heading) => `
      <a class="outline-link outline-level-${heading.level}" href="#${escapeAttribute(heading.id)}">${escapeHtml(heading.text)}</a>
    `).join('');
  }

  function renderError(message) {
    reader.innerHTML = `<p class="projects-status">${escapeHtml(message)}</p>`;
    outline.innerHTML = '<p class="outline-empty">暂无大纲</p>';
  }

  function isSafeMarkdownFile(file) {
    return typeof file === 'string' && /^[\w.-]+\.md$/i.test(file) && !file.includes('..');
  }

  function slugify(value, index) {
    const base = value
      .trim()
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '');
    return base || `section-${index + 1}`;
  }

  function formatDate(value) {
    if (!value) return '创建时间未知';
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

  loadArticle();
})();
