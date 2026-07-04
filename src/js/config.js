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

/** 照片来源：本地 'photos' 或七牛云/CDN 公网 URL */
export const photos = {
  baseUrl: import.meta.env.VITE_PHOTOS_BASE_URL || 'photos'
};

/** 音乐来源：本地 'src/assets/music' 或七牛云/CDN 公网 URL */
export const music = {
  baseUrl: import.meta.env.VITE_MUSIC_BASE_URL || ''
};
