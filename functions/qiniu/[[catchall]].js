/**
 * Cloudflare Pages Function — 代理七牛云资源
 *
 * 浏览器通过 HTTPS 请求 /qiniu/photos/xxx.jpg
 * 本函数转发到七牛云 HTTP 地址，解决 HTTPS 混合内容问题
 *
 * 注意：必须保留原始 URL 编码，因为七牛云不识别未编码的中文字符
 */
const QINIU_BASE = 'http://thmrgc8qb.hb-bkt.clouddn.com';

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  // 用完整 URL 替换前缀，保留浏览器原有的 URL 编码
  const qiniuUrl = context.request.url
    .replace(requestUrl.origin + '/qiniu/', QINIU_BASE + '/');

  try {
    const response = await fetch(qiniuUrl);

    const responseHeaders = new Headers({
      'Content-Type':   response.headers.get('Content-Type') || 'application/octet-stream',
      'Cache-Control':  'public, max-age=31536000',
      'X-Debug-Qiniu-Url': qiniuUrl,  // 调试：记录实际请求的七牛云 URL
    });

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(`代理失败: ${err.message}`, { status: 502 });
  }
}
