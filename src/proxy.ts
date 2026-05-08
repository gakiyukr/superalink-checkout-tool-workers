import { WWW, DEFAULT_LOCALE } from './constants';

export async function proxySuperalinkAsset(
  path: string, localApiBase: string, userAgent?: string,
): Promise<Response> {
  const upstreamUrl = `${WWW}${path}`;
  const resp = await fetch(upstreamUrl, {
    headers: { 'User-Agent': userAgent ?? 'Mozilla/5.0' },
  });

  let body = resp.body;
  let contentType = resp.headers.get('Content-Type') ?? '';

  // Patch JS/HTML so browser API calls go to same-origin proxy
  if (contentType.includes('javascript') || path.endsWith('.js') || contentType.includes('text/html')) {
    const text = await resp.text();
    let patched = text
      .replace(/https:\/\/storefront\.api\.superalink\.com/g, localApiBase)
      .replace(/"https:\/\/storefront\.api\.superalink\.com"/g, JSON.stringify(localApiBase))
      .replace(/http:\/\/storefront-service\.dev\.superalink\.com/g, localApiBase)
      .replace(/"http:\/\/storefront-service\.dev\.superalink\.com"/g, JSON.stringify(localApiBase));
    return new Response(patched, {
      status: resp.status,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Cache-Control': 'no-store',
      },
    });
  }

  // For binary assets, pass through as-is
  return new Response(body, {
    status: resp.status,
    headers: {
      'Content-Type': contentType || 'application/octet-stream',
      'Cache-Control': 'no-store',
    },
  });
}

export async function handleStripeCallback(url: URL): Promise<Response> {
  const upstream = `https://storefront.api.superalink.com/v2/callback${url.search ? '?' + url.search : ''}`;
  await fetch(upstream, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': DEFAULT_LOCALE },
  }).catch(() => { /* best effort */ });

  const html = `<!doctype html><meta charset='utf-8'><title>支付结果</title><style>body{font-family:system-ui;max-width:620px;margin:40px auto;padding:0 16px}.ok{color:#0a8a3a}.err{color:#c62828}</style><h2>支付已提交</h2><p>如果支付成功，Superalink 会把 eSIM 发到你填写的邮箱。</p><p><a href='/'>返回首页</a></p>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}