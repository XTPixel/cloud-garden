import { defineConfig } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** 递归复制目录到构建输出 */
function copyDir(src, dest) {
  if (!existsSync(src)) return 0
  mkdirSync(dest, { recursive: true })
  let count = 0
  for (const entry of readdirSync(src)) {
    const srcPath = resolve(src, entry)
    const destPath = resolve(dest, entry)
    if (statSync(srcPath).isDirectory()) {
      count += copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
      count++
    }
  }
  return count
}

export default defineConfig({
  // 相对路径 → 可部署到任意子路径
  base: './',

  build: {
    rollupOptions: {
      input: {
        index:     resolve(__dirname, 'index.html'),
        photos:    resolve(__dirname, 'photos.html'),
        articles:  resolve(__dirname, 'articles.html'),
        projects:  resolve(__dirname, 'projects.html'),
        favorites: resolve(__dirname, 'favorites.html'),
        article:   resolve(__dirname, 'article.html'),
        library:   resolve(__dirname, 'library.html'),
      },
    },
    assetsDir: 'assets',
  },

  server: {
    port: 3000,
    open: true,
  },

  plugins: [
    {
      name: 'copy-runtime-assets',
      closeBundle() {
        const outDir = resolve(__dirname, 'dist')
        let total = 0

        // 文章（manifest.json + .md 文件）
        total += copyDir(
          resolve(__dirname, 'articles'),
          resolve(outDir, 'articles')
        )

        // 数据文件（如照片清单等）
        total += copyDir(
          resolve(__dirname, 'src', 'data'),
          resolve(outDir, 'src', 'data')
        )

        console.log(`\n📦 已复制 ${total} 个运行时文件到构建输出`)
      },
    },
  ],
})
