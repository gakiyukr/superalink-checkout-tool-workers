import { INDEX_HTML } from './html';
import { flowHtml, payHtml } from './html';
import { loadToken } from './tokens';
import { resultFromParams, handleCheckEmail, handlePrepay } from './checkout';
import { catalogForCountry } from './catalog';
import { proxySuperalinkAsset, handleStripeCallback } from './proxy';
import { DEFAULT_COUNTRY_CODE, localReferenceCurrency } from './constants';
import type { Env, CheckoutParams } from './types';

function jsonResponse(obj: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  const body = JSON.stringify(obj, null, 2);
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

function htmlResponse(html: string, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- Static assets proxy ---
    if (path.startsWith('/_next/')) {
      return proxySuperalinkAsset(path, env.LOCAL_API_BASE, request.headers.get('User-Agent') ?? undefined);
    }

    // --- Homepage ---
    if (path === '/') {
      return htmlResponse(INDEX_HTML);
    }

    // --- Flow: create checkout then redirect ---
    if (path === '/flow') {
      try {
        const params: CheckoutParams = Object.fromEntries(url.searchParams.entries());
        const result = await resultFromParams(env.CHECKOUT_KV, params);
        const redirectUrl = new URL(result.pay_url!, request.url).toString();
        return Response.redirect(redirectUrl, 302);
      } catch (e: unknown) {
        return jsonResponse({ ok: false, error: String(e) }, 500);
      }
    }

    // --- API: create checkout (POST) ---
    if (path === '/api/create') {
      let params: CheckoutParams = Object.fromEntries(url.searchParams.entries());
      if (request.method === 'POST') {
        try {
          const body = await request.json() as Record<string, string>;
          params = { ...params, ...body };
        } catch { /* ignore */ }
      }
      try {
        const result = await resultFromParams(env.CHECKOUT_KV, params);
        return jsonResponse(result);
      } catch (e: unknown) {
        return jsonResponse({ ok: false, error: String(e) }, 500);
      }
    }

    // --- API: catalog ---
    if (path === '/api/catalog') {
      const cc = (url.searchParams.get('country_code') ?? DEFAULT_COUNTRY_CODE).toUpperCase();
      try {
        const products = await catalogForCountry(cc);
        return jsonResponse({
          ok: true,
          country_code: cc,
          reference_currency: localReferenceCurrency(cc),
          products,
        });
      } catch (e: unknown) {
        return jsonResponse({ ok: false, error: String(e) }, 500);
      }
    }

    // --- API: products (raw proxy) ---
    if (path === '/api/products') {
      const cc = url.searchParams.get('country_code') ?? DEFAULT_COUNTRY_CODE;
      try {
        const resp = await fetch(`https://storefront.api.superalink.com/products?country_code=${encodeURIComponent(cc)}`, {
          headers: { 'Accept-Language': 'cn', 'User-Agent': 'Mozilla/5.0' },
        });
        const data = await resp.json();
        return jsonResponse(data, resp.status);
      } catch (e: unknown) {
        return jsonResponse({ ok: false, error: String(e) }, 500);
      }
    }

    // --- API: check-email ---
    if (path === '/api/check-email' && request.method === 'POST') {
      try {
        const body = await request.json() as { t: string; email: string };
        const result = await handleCheckEmail(env.CHECKOUT_KV, body);
        return jsonResponse(result);
      } catch (e: unknown) {
        return jsonResponse({ ok: false, error: String(e) }, 400);
      }
    }

    // --- API: prepay ---
    if (path === '/api/prepay' && request.method === 'POST') {
      try {
        const body = await request.json() as { t: string; email: string; method: string };
        const result = await handlePrepay(env.CHECKOUT_KV, body);
        return jsonResponse(result);
      } catch (e: unknown) {
        return jsonResponse({ ok: false, error: String(e) }, 500);
      }
    }

    // --- Stripe callback ---
    if (path === '/api/stripe-callback') {
      return handleStripeCallback(url);
    }

    // --- Pay page ---
    if (path === '/pay') {
      try {
        const token = url.searchParams.get('t') ?? '';
        const data = await loadToken(env.CHECKOUT_KV, token);
        const publicData = { ...data, token };
        delete (publicData as Record<string, unknown>).order_id;
        delete (publicData as Record<string, unknown>).checkout_url;
        delete (publicData as Record<string, unknown>).stripe_intent_id;
        delete (publicData as Record<string, unknown>).cookie_value;
        const html = payHtml(publicData as typeof data & { token: string }, env.STRIPE_PK);
        return htmlResponse(html);
      } catch (e: unknown) {
        return jsonResponse({ ok: false, error: String(e) }, 500);
      }
    }

    // --- Bridge page (legacy) ---
    if (path === '/bridge') {
      try {
        const token = url.searchParams.get('t') ?? '';
        const data = await loadToken(env.CHECKOUT_KV, token);
        const sid = data.cookie_value;
        const target = url.searchParams.get('target') ?? new URL(data.checkout_url).pathname;
        const html = `<!doctype html><meta charset='utf-8'><title>Superalink 预填跳转</title>
<script>
try {
  document.cookie = 'splnk_checkout_session=' + encodeURIComponent(${JSON.stringify(sid)}) + '; path=/; max-age=86400; SameSite=Lax; Secure';
  document.cookie = "NEXT_LOCALE=cn; path=/; max-age=86400; SameSite=Lax; Secure";
  localStorage.setItem('CHECKOUT_SESSION', ${JSON.stringify(sid)});
} catch(e) {}
location.replace(${JSON.stringify(target)});
</script>
<p>正在进入 Superalink 官方付款页...</p>`;
        return new Response(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Set-Cookie': `splnk_checkout_session=${sid}; Path=/; Max-Age=86400; SameSite=Lax; Secure`,
            'Cache-Control': 'no-store',
          },
        });
      } catch (e: unknown) {
        return jsonResponse({ ok: false, error: String(e) }, 500);
      }
    }

    // --- Go page (native redirect) ---
    if (path === '/go') {
      try {
        const token = url.searchParams.get('t') ?? '';
        const data = await loadToken(env.CHECKOUT_KV, token);
        const targetPath = new URL(data.checkout_url).pathname;
        const bridgeUrl = `/bridge?t=${token}&target=${encodeURIComponent(targetPath)}`;
        const html = `<!doctype html><meta charset='utf-8'><title>跳转中</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:680px;margin:40px auto;padding:0 16px}.muted{color:#666}</style>
<h2>正在打开 Superalink 官方付款页...</h2>
<p>邮箱：${data.email ?? ''}</p>
<p>优惠券：${data.coupon ?? ''}</p>
<p>金额：${data.amount ?? ''}</p>
<p class=muted>如果没有自动跳转，请点击：<a href="${bridgeUrl}">打开官方付款页</a></p>
<script>location.replace(${JSON.stringify(bridgeUrl)});</script>`;
        return htmlResponse(html);
      } catch (e: unknown) {
        return jsonResponse({ ok: false, error: String(e) }, 500);
      }
    }

    // --- Apple Pay domain verification ---
    if (path === '/.well-known/apple-developer-merchantid-domain-association') {
      return new Response('Not configured', { status: 404 });
    }

    // --- 404 ---
    return jsonResponse({ ok: false, error: 'not found' }, 404);
  },
};