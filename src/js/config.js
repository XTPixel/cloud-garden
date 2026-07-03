export const storageKeys = {
  notes: 'dashboard.notes',
  quoteIndex: 'dashboard.quoteIndex',
  layout: 'dashboard.widgetLayout',
  weather: 'dashboard.weather',
  githubProjects: 'dashboard.githubProjects',
  favorites: 'dashboard.favorites'
};

export const github = {
  username: 'XTPixel',
  maxRepos: 6
};

/** 照片来源：本地 'photos' 或 Cloudflare R2 公网 URL */
export const photos = {
  baseUrl: import.meta.env.VITE_PHOTOS_BASE_URL || 'photos'
};
