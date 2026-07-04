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

/** 照片来源：本地 'photos' 或通过 Pages Function 代理七牛云 */
export const photos = {
  baseUrl: import.meta.env.VITE_PHOTOS_BASE_URL || '/qiniu/photos'
};

/** 音乐来源：通过 VITE_MUSIC_BASE_URL 可切换为远程地址（默认本地） */
export const music = {
  baseUrl: import.meta.env.VITE_MUSIC_BASE_URL || ''
};
