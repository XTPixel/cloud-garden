#!/usr/bin/env node
/**
 * scan-photos.js — 扫描 photos/ 目录生成照片清单
 *
 * 使用方法:
 *   node tools/scan-photos.js
 *
 * 每次向 photos/ 添加或删除图片后执行此脚本，
 * 生成的 src/data/photos.json 会自动更新照片墙的内容。
 *
 * 由于 photos/*.jpg 等文件已被 .gitignore 排除，
 * photos.json 作为纳入 git 追踪的清单文件，记录当前有哪些照片。
 */

const fs = require('fs');
const path = require('path');

const PHOTO_DIR = path.join(__dirname, '..', 'photos');
const OUTPUT = path.join(__dirname, '..', 'src', 'data', 'photos.json');
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif']);

if (!fs.existsSync(PHOTO_DIR)) {
  console.error('❌ 目录不存在: ' + PHOTO_DIR);
  process.exit(1);
}

const files = fs.readdirSync(PHOTO_DIR)
  .filter(f => EXTENSIONS.has(path.extname(f).toLowerCase()))
  .sort();

fs.writeFileSync(OUTPUT, JSON.stringify(files, null, 2) + '\n');
console.log('✅ ' + OUTPUT + ' 已更新（共 ' + files.length + ' 张照片）');

if (files.length === 0) {
  console.warn('⚠️  photos/ 目录中没有找到图片文件');
}
