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

/** 照片来源：七牛云 CDN 公网 URL（也可通过 VITE_PHOTOS_BASE_URL 环境变量覆盖） */
export const photos = {
  baseUrl: import.meta.env.VITE_PHOTOS_BASE_URL || 'http://thmrgc8qb.hb-bkt.clouddn.com/photos'
};

/** 音乐来源：七牛云 CDN 公网 URL（也可通过 VITE_MUSIC_BASE_URL 环境变量覆盖） */
export const music = {
  baseUrl: import.meta.env.VITE_MUSIC_BASE_URL || 'http://thmrgc8qb.hb-bkt.clouddn.com/music'
};
