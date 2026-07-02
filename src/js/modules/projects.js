(() => {
  const { elements, github } = Garden;
  const fallbackProjects = [
    {
      name: 'personal-homepage',
      description: '正在建设中的个人云外庭院主页。',
      html_url: github ? `https://github.com/${github.username}` : 'https://github.com/XTPixel',
      language: 'JavaScript',
      stargazers_count: 0,
      forks_count: 0,
      updated_at: new Date().toISOString()
    }
  ];

  Garden.loadProjects = async function loadProjects() {
    if (!elements.projectGrid || !github?.username) return;
    updateProfileLink();

    const cachedProjects = readCachedProjects();
    if (cachedProjects.length > 0) {
      renderProjects(cachedProjects, '已读取本地项目缓存，正在尝试同步 GitHub 最新数据…');
    } else {
      renderStatus('正在从 GitHub 召唤公开项目…');
    }

    try {
      const projects = await fetchGitHubProjects();
      const usableProjects = projects.length > 0 ? projects : fallbackProjects;
      writeProjectCache(usableProjects);
      renderProjects(usableProjects);
    } catch {
      if (cachedProjects.length > 0) {
        renderProjects(cachedProjects, '暂时无法连接 GitHub，已使用本地缓存项目。');
        return;
      }
      renderProjects(fallbackProjects, '暂时无法连接 GitHub，且暂无本地缓存，先展示备用项目。');
    }
  };

  function updateProfileLink() {
    const url = `https://github.com/${github.username}`;
    elements.projectsProfile.href = url;
    elements.projectsProfile.setAttribute('aria-label', `打开 ${github.username} 的 GitHub 主页`);
  }
  async function fetchGitHubProjects() {
    const response = await fetch(`https://api.github.com/users/${github.username}/repos?type=owner&sort=updated&per_page=100`, {
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!response.ok) throw new Error('github request failed');
    return normalizeProjects(await response.json());
  }

  function readCachedProjects() {
    return normalizeCachedProjects(Garden.readStorage?.(Garden.storageKeys.githubProjects, null));
  }
  async function readSnapshotProjects() {
    try {
      const response = await fetch('src/data/github-projects.json', { cache: 'no-cache' });
      if (!response.ok) return [];
      return normalizeCachedProjects(await response.json());
    } catch {
      return [];
    }
  }

  function getOfflineNotice(error, hasCache) {
    const source = hasCache ? '本地缓存' : '本地快照';
    if (error?.status === 403 && error?.rateLimitRemaining === '0') {
      return `GitHub API 临时限流，已使用${source}项目。`;
    }
    if (error?.status) {
      return `GitHub API 返回 ${error.status}，已使用${source}项目。`;
    }
    return `暂时无法连接 GitHub，已使用${source}项目。`;
  }

  function writeProjectCache(projects) {
    Garden.writeStorage?.(Garden.storageKeys.githubProjects, {
      username: github.username,
      syncedAt: new Date().toISOString(),
      projects
    });
  }

  function normalizeCachedProjects(cache) {
    if (!cache || cache.username !== github.username || !Array.isArray(cache.projects)) return [];
    return cache.projects.filter((project) => project?.name && project?.html_url);
  }

  function normalizeProjects(data) {
    if (!Array.isArray(data)) return [];
    return data
      .filter((repo) => !repo.fork && !repo.archived)
      .sort((first, second) => {
        const firstScore = Number(first.stargazers_count || 0) * 2 + Number(first.forks_count || 0);
        const secondScore = Number(second.stargazers_count || 0) * 2 + Number(second.forks_count || 0);
        if (secondScore !== firstScore) return secondScore - firstScore;
        return new Date(second.updated_at || 0) - new Date(first.updated_at || 0);
      })
      .slice(0, github.maxRepos || 6);
  }

  function renderProjects(projects, notice = '') {
    const noticeMarkup = notice ? `<p class="projects-status">${escapeHtml(notice)}</p>` : '';
    elements.projectGrid.innerHTML = `${noticeMarkup}${projects.map(renderProjectCard).join('')}`;
  }

  function renderStatus(message) {
    elements.projectGrid.innerHTML = `<p class="projects-status">${escapeHtml(message)}</p>`;
  }

  function renderProjectCard(project) {
    const description = project.description || '这个项目还在静静酝酿，没有填写简介。';
    const homepage = project.homepage ? `<a href="${escapeAttribute(project.homepage)}" target="_blank" rel="noreferrer">Demo</a>` : '';
    return `
      <article class="project-card">
        <div class="project-card-head">
          <h3>${escapeHtml(project.name)}</h3>
          <a href="${escapeAttribute(project.html_url)}" target="_blank" rel="noreferrer" aria-label="打开 ${escapeAttribute(project.name)} 仓库">↗</a>
        </div>
        <p>${escapeHtml(description)}</p>
        <div class="project-meta">
          <span>${project.language ? `✦ ${escapeHtml(project.language)}` : '✦ Repository'}</span>
          <span>★ ${Number(project.stargazers_count || 0)}</span>
          <span>⑂ ${Number(project.forks_count || 0)}</span>
        </div>
        <div class="project-links">
          ${homepage}
          <time datetime="${escapeAttribute(project.updated_at || '')}">${formatUpdated(project.updated_at)}</time>
        </div>
      </article>
    `;
  }

  function formatUpdated(value) {
    if (!value) return '最近更新未知';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '最近更新未知';
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[char]));
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/'/g, '&#39;');
  }

  Garden.loadProjects();
})();