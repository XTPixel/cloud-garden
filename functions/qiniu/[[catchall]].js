/**
 * Cloudflare Pages Function — 代理七牛云资源
 *
 * 浏览器通过 HTTPS 请求 /qiniu/photos/xxx.jpg
 * 本函数转发到七牛云 HTTP 地址，解决 HTTPS 混合内容问题
 */
const QINIU_BASE = 'http://thmrgc8qb.hb-bkt.clouddn.com';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  // 去掉 /qiniu/ 前缀，得到 photos/xxx.jpg 或 music/xxx.mp3
  const proxyPath = url.pathname.replace('/qiniu/', '');
  const qiniuUrl = `${QINIU_BASE}/${proxyPath}`;

  try {
    const response = await fetch(qiniuUrl);

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type':   response.headers.get('Content-Type') || 'application/octet-stream',
        'Cache-Control':  'public, max-age=31536000',
        // 允许浏览器缓存一年
      },
    });
  } catch (err) {
    return new Response(`代理失败: ${err.message}`, { status: 502 });
  }
}
