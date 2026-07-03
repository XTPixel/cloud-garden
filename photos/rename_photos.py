"""
照片按图像内容自动重命名
使用 MiniMax M3 Vision API 分析每张照片，生成描述性中文文件名

用法:
  python rename_photos.py              # 预览模式，仅显示命名计划
  python rename_photos.py --execute    # 执行重命名

安全机制:
  - 先预览所有命名，确认后再执行
  - 自动处理重名（加序号后缀）
  - 支持断点续传（跳过已分析的照片）
  - API Key 从环境变量 MINIMAX_API_KEY 读取
"""

import os
import sys
import json
import base64
import re
import urllib.request
import urllib.error

# ============================================================
# 配置
# ============================================================
PHOTOS_DIR = os.path.dirname(os.path.abspath(__file__))
API_KEY = os.environ.get("MINIMAX_API_KEY", "")
BASE_URL = "https://api.minimax.io/v1/chat/completions"
MODEL = "MiniMax-M3"
CACHE_FILE = os.path.join(PHOTOS_DIR, ".rename_cache.json")
DRY_RUN = True

# ============================================================
# 工具函数
# ============================================================

def clean_filename(name):
    """清理文件名，移除不安全字符"""
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    name = name.strip().replace('\n', '').replace('\r', '')
    if len(name) > 50:
        name = name[:50]
    return name or "未命名照片"


def load_cache():
    """加载已分析的结果缓存"""
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_cache(cache):
    """保存分析结果缓存"""
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def describe_image(filepath, retry=2):
    """调用 MiniMax M3 Vision API 分析图片内容，返回简短中文描述"""
    with open(filepath, 'rb') as f:
        img_bytes = f.read()

    img_b64 = base64.standard_b64encode(img_bytes).decode('utf-8')

    ext = os.path.splitext(filepath)[1].lower()
    mime_map = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.gif': 'image/gif',
        '.webp': 'image/webp', '.bmp': 'image/bmp',
    }
    media_type = mime_map.get(ext, 'image/jpeg')
    data_url = f"data:{media_type};base64,{img_b64}"

    payload = {
        "model": MODEL,
        "max_tokens": 50,
        "temperature": 0.3,
        "messages": [{
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "请用简练的中文描述这张照片的核心内容（10个字以内）。"
                        "描述照片中的主体：人物活动、风景、建筑、场景等。"
                        "只输出描述文字，不要引号、标点或额外解释。"
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {"url": data_url},
                },
            ],
        }],
    }

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }

    for attempt in range(retry):
        try:
            req = urllib.request.Request(
                BASE_URL,
                data=json.dumps(payload).encode('utf-8'),
                headers=headers,
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read().decode('utf-8'))
                # OpenAI 兼容格式：choices[0].message.content
                choices = result.get('choices', [])
                if choices:
                    text = choices[0].get('message', {}).get('content', '').strip()
                    text = text.strip('"\'').strip('。，！？、 ').strip()
                    return text if text else None

        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8') if e.fp else ''
            print(f"  HTTP {e.code}: {error_body[:300]}")
            if e.code == 401:
                print(f"  ⚠ API Key 无效，请检查 MINIMAX_API_KEY 环境变量")
                return None
            if e.code == 400 and 'image' in error_body.lower():
                print(f"  ⚠ 模型可能不支持图片输入")
                return None
        except Exception as e:
            print(f"  请求异常: {e}")
            if attempt < retry - 1:
                print(f"  重试 ({attempt + 2}/{retry})...")

    return None


def get_image_files():
    """获取所有需要处理的图片文件"""
    exts = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
    files = []
    for f in os.listdir(PHOTOS_DIR):
        if os.path.splitext(f)[1].lower() in exts and not f.startswith('.'):
            files.append(f)
    return sorted(files)


def resolve_conflicts(mapping):
    """处理重名冲突，给重复名称加序号后缀"""
    name_count = {}
    resolved = {}
    for old_name, new_base in mapping.items():
        base = os.path.splitext(new_base)[0]
        ext = os.path.splitext(old_name)[1].lower()
        if base in name_count:
            name_count[base] += 1
            new_name = f"{base}_{name_count[base]}{ext}"
        else:
            name_count[base] = 0
            new_name = f"{base}{ext}"
        resolved[old_name] = new_name
    return resolved


# ============================================================
# 主流程
# ============================================================

def main():
    global DRY_RUN

    if '--execute' in sys.argv or '-x' in sys.argv:
        DRY_RUN = False

    if not API_KEY:
        print("❌ 未设置 MINIMAX_API_KEY 环境变量")
        print("   PowerShell: $env:MINIMAX_API_KEY = 'your-key'")
        print("   Bash:       export MINIMAX_API_KEY='your-key'")
        sys.exit(1)

    print("=" * 60)
    print("  照片按内容自动重命名 (MiniMax M3 Vision)")
    print(f"  目录: {PHOTOS_DIR}")
    print("=" * 60)

    image_files = get_image_files()
    print(f"\n共发现 {len(image_files)} 张图片\n")

    if not image_files:
        print("没有找到图片文件！")
        return

    cache = load_cache()
    new_names = dict(cache)

    # 分析每张图片
    for i, filename in enumerate(image_files):
        print(f"[{i+1}/{len(image_files)}] {filename}")
        if filename in cache:
            print(f"  ✓ 已缓存: {cache[filename]}")
            continue

        filepath = os.path.join(PHOTOS_DIR, filename)
        desc = describe_image(filepath)
        if desc:
            new_names[filename] = desc
            print(f"  → {desc}")
        else:
            new_names[filename] = f"照片_{filename[4:12]}"
            print(f"  ✗ 分析失败，使用日期命名: {new_names[filename]}")

        save_cache(new_names)

    print(f"\n{'=' * 60}")
    print("  命名预览")
    print(f"{'=' * 60}")

    ext_map = {f: os.path.splitext(f)[1] for f in image_files}
    raw_mapping = {}
    for old_name in image_files:
        desc = new_names.get(old_name, f"照片_{old_name[4:12]}")
        safe_name = clean_filename(desc)
        ext = ext_map[old_name]
        raw_mapping[old_name] = safe_name + ext

    final_mapping = resolve_conflicts(raw_mapping)

    unchanged = 0
    for old_name in image_files:
        new_name = final_mapping[old_name]
        if old_name == new_name:
            unchanged += 1
        else:
            print(f"  {old_name}")
            print(f"  → {new_name}")
            print()

    if unchanged == len(image_files):
        print("  所有文件名无需更改！")
        return

    print(f"  共 {len(image_files) - unchanged} 个文件将被重命名")

    if DRY_RUN:
        print(f"\n  🔍 预览模式。确认无误后运行:")
        print(f"     python rename_photos.py --execute")
        print(f"\n  💡 修改命名: 编辑 .rename_cache.json 后重新运行")
    else:
        print(f"\n  ⚡ 执行重命名...")
        renamed = 0
        for old_name in image_files:
            new_name = final_mapping[old_name]
            if old_name != new_name:
                old_path = os.path.join(PHOTOS_DIR, old_name)
                new_path = os.path.join(PHOTOS_DIR, new_name)
                try:
                    os.rename(old_path, new_path)
                    renamed += 1
                    print(f"  ✓ {old_name} → {new_name}")
                except OSError as e:
                    print(f"  ✗ 重命名失败: {e}")

        print(f"\n  ✅ 完成! 共重命名 {renamed} 个文件")

        if os.path.exists(CACHE_FILE):
            os.remove(CACHE_FILE)
            print(f"  已清理缓存文件")


if __name__ == '__main__':
    main()
