import { elements } from '../dom.js';
import { github } from '../config.js';
import { storageKeys } from '../config.js';
import { readStorage, writeStorage } from '../utils/storage.js';
import { escapeHtml, escapeAttribute, formatDate } from '../utils/format.js';

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

function updateProfileLink() {
  const url = `https://github.com/${github.username}`;
  if (elements.projectsProfile) {
    elements.projectsProfile.href = url;
    elements.projectsProfile.setAttribute('aria-label', `打开 ${github.username} 的 GitHub 主页`);
  }
}

async function fetchGitHubProjects() {
  const response = await fetch(`https://api.github.com/users/${github.username}/repos?type=owner&sort=updated&per_page=100`, {
    headers: { Accept: 'application/vnd.github+json' }
  });
  if (!response.ok) throw new Error('github request failed');
  return normalizeProjects(await response.json());
}

function readCachedProjects() {
  return normalizeCachedProjects(readStorage(storageKeys.githubProjects, null));
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

async function readSnapshotProjects() {
  try {
    const response = await fetch('src/data/github-projects.json', { cache: 'no-cache' });
    if (!response.ok) return [];
    return normalizeCachedProjects(await response.json());
  } catch {
    return [];
  }
}

function writeProjectCache(projects) {
  writeStorage(storageKeys.githubProjects, {
    username: github.username,
    syncedAt: new Date().toISOString(),
    projects
  });
}

function renderProjects(projects, notice = '') {
  const noticeMarkup = notice ? `<p class="projects-status">${escapeHtml(notice)}</p>` : '';
  if (elements.projectGrid) {
    elements.projectGrid.innerHTML = `${noticeMarkup}${projects.map(renderProjectCard).join('')}`;
  }
}

function renderStatus(message) {
  if (elements.projectGrid) {
    elements.projectGrid.innerHTML = `<p class="projects-status">${escapeHtml(message)}</p>`;
  }
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
        <time datetime="${escapeAttribute(project.updated_at || '')}">${formatDate(project.updated_at)}</time>
      </div>
    </article>
  `;
}

async function loadProjects() {
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
    const snapshotProjects = await readSnapshotProjects();
    if (snapshotProjects.length > 0) {
      renderProjects(snapshotProjects, '暂时无法连接 GitHub，已使用本地快照项目。');
      return;
    }
    renderProjects(fallbackProjects, '暂时无法连接 GitHub，且暂无本地缓存，先展示备用项目。');
  }
}

loadProjects();
