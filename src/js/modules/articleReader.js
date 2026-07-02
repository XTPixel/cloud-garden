import { escapeHtml, escapeAttribute, formatDate, slugify } from '../utils/format.js';

const reader = document.querySelector('#articleReader');
const outline = document.querySelector('#articleOutline');
const manifestPath = 'articles/manifest.json';
const articleDir = 'articles/';

if (reader && outline) {
  loadArticle();
}

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

function isSafeMarkdownFile(file) {
  return typeof file === 'string' && /^[\w.-]+\.md$/i.test(file) && !file.includes('..');
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
  let ulItems = [];
  let olItems = [];
  let olIndex = 0;
  let blockquoteLines = [];
  let inFence = false;
  let fenceLang = '';
  let codeLines = [];
  let title = '';

  function flushParagraph() {
    if (!paragraph.length) return;
    htmlParts.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (ulItems.length) {
      htmlParts.push(`<ul>${ulItems.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ul>`);
      ulItems = [];
    }
    if (olItems.length) {
      htmlParts.push(`<ol>${olItems.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ol>`);
      olItems = [];
      olIndex = 0;
    }
  }

  function flushBlockquote() {
    if (!blockquoteLines.length) return;
    htmlParts.push(`<blockquote>${blockquoteLines.map((line) => {
      const content = line.replace(/^>\s?/, '').trim();
      return content ? `<p>${renderInline(content)}</p>` : '';
    }).join('')}</blockquote>`);
    blockquoteLines = [];
  }

  function flushCode() {
    const langClass = fenceLang ? ` class="language-${escapeAttribute(fenceLang)}"` : '';
    htmlParts.push(`<pre><code${langClass}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    codeLines = [];
    fenceLang = '';
  }

  function isHorizontalRule(line) {
    return /^(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim());
  }

  lines.forEach((line) => {
    if (/^```/.test(line.trim())) {
      if (inFence) {
        flushCode();
        inFence = false;
      } else {
        flushParagraph();
        flushList();
        flushBlockquote();
        inFence = true;
        fenceLang = line.trim().slice(3).trim();
      }
      return;
    }

    if (inFence) {
      codeLines.push(line);
      return;
    }

    if (isHorizontalRule(line)) {
      flushParagraph();
      flushList();
      flushBlockquote();
      htmlParts.push('<hr />');
      return;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    if (headingMatch) {
      flushParagraph();
      flushList();
      flushBlockquote();
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const id = slugify(text);
      if (level === 1 && !title) title = text;
      if (level > 1) headings.push({ level, text, id });
      htmlParts.push(`<h${level} id="${escapeAttribute(id)}">${renderInline(text)}</h${level}>`);
      return;
    }

    const blockquoteMatch = /^>\s?(.*)$/.exec(line);
    if (blockquoteMatch) {
      flushParagraph();
      flushList();
      blockquoteLines.push(line);
      return;
    }

    const ulMatch = /^[-*]\s+(.+)$/.exec(line);
    if (ulMatch) {
      flushParagraph();
      flushBlockquote();
      flushOlBeforeNewUl();
      ulItems.push(ulMatch[1]);
      return;
    }

    const olMatch = /^(\d+)\.\s+(.+)$/.exec(line);
    if (olMatch) {
      flushParagraph();
      flushBlockquote();
      flushUlBeforeNewOl();
      const num = parseInt(olMatch[1], 10);
      if (olItems.length === 0) olIndex = num;
      olItems.push(olMatch[2]);
      return;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushBlockquote();
      return;
    }

    flushList();
    flushBlockquote();
    paragraph.push(line.trim());
  });

  function flushOlBeforeNewUl() {
    if (olItems.length) { flushList(); }
  }

  function flushUlBeforeNewOl() {
    if (ulItems.length) { flushList(); }
  }

  flushParagraph();
  flushList();
  flushBlockquote();
  if (inFence) flushCode();

  return { title, headings, html: htmlParts.join('\n') };
}

function renderInline(value) {
  const escaped = escapeHtml(value);

  // Images: ![alt](url) — must be processed before links
  let result = escaped.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
    '<img src="$2" alt="$1" loading="lazy" />'
  );

  // Links: [text](url)
  result = result.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
  );

  // Inline code
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  return result;
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
