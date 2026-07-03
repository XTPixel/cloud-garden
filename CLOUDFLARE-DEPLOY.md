# Cloudflare Pages 部署指南

## 方式一：GitHub 自动部署（推荐）

### 1. 创建 GitHub 仓库

1. 打开 https://github.com/new
2. Repository name 填 `cloud-garden`（或你喜欢的名字）
3. 选 **Public**
4. **不要**勾选任何初始化选项
5. 点 **Create repository**

### 2. 推送代码

创建好仓库后，在终端执行（把 `你的用户名` 替换成你的 GitHub 用户名）：

```bash
git remote add origin https://github.com/你的用户名/cloud-garden.git
git push -u origin main
```

### 3. 连接 Cloudflare Pages

1. 登录 https://dash.cloudflare.com/
2. 左侧菜单 → **Workers 和 Pages** → **Pages**
3. 点 **连接到 Git**
4. 授权 GitHub（第一次需要）
5. 选择 `cloud-garden` 仓库
6. 构建设置填：

| 项目 | 值 |
|------|-----|
| 项目名称 | `cloud-garden`（自动填充） |
| 生产分支 | `main` |
| 框架预设 | **无**（选 None） |
| 构建命令 | `npm run build` |
| 构建输出目录 | `dist` |
| 根目录 | `留空` |
| Node.js 版本 | 18 或更高 |

7. 点 **保存并部署**

等大约 1-2 分钟，部署完成会给你一个 `xxx.pages.dev` 的域名，可以直接访问。

### 4. 后续更新

以后每次改完代码：

```bash
git add -A
git commit -m "改了什么"
git push
```

GitHub 收到推送后，Cloudflare 会自动重新构建部署，大约 1 分钟生效。

---

## 方式二：Wrangler CLI 直传

如果你不想用 GitHub，也可以用命令行直接上传：

```bash
# 安装 wrangler
npm install -g wrangler

# 登录 Cloudflare（会打开浏览器）
wrangler login

# 部署 dist/ 目录到 Pages
npx wrangler pages deploy dist/ --project-name=cloud-garden

# 以后更新就重新 build 再 deploy
npm run build
npx wrangler pages deploy dist/ --project-name=cloud-garden
```

但这种方式没有自动部署，每次更新都要手动跑命令。

---

## 绑定自定义域名（可选，推荐）

1. 在 Cloudflare Pages → 你的项目 → **自定义域**
2. 输入你的域名（比如 `garden.你的名字.com`）
3. Cloudflare 会自动配置 DNS

> ⚠️ 如果要用 `.com` / `.cn` 等顶级域名指向国内服务器，需要 **ICP 备案**。
> 但指向 Cloudflare Pages（海外节点）**不需要备案**。

---

## 国内访问优化建议

Cloudflare Pages 的免费计划没有中国内地节点，但可以通过以下方式加速：

1. **保留 Cloudflare 代理** — 默认就开了，等于是 Cloudflare 全球加速
2. **压缩图片** — 照片墙的图片可以转换成 WebP 格式，体积小 60%
3. **保持 Vite 构建** — 我们已配置好的打包压缩，JS/CSS 体积已经很小了
4. **如追求极致速度** → 换成国内 OSS + CDN（需要 ICP 备案，但速度会快很多）
