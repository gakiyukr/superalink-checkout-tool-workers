import { STORE, WWW, DEFAULT_URL, DEFAULT_LOCALE } from './constants';
import type { SuperalinkOrder, PaymentIntent, SuperalinkSession } from './types';

function sessionCookies(session: SuperalinkSession): string {
  return `splnk_checkout_session=${session.sessionId}; NEXT_LOCALE=${session.locale}`;
}

function pageHeaders(pageUrl?: string, locale?: string): Record<string, string> {
  const url = pageUrl ?? DEFAULT_URL;
  const loc = locale ?? DEFAULT_LOCALE;
  let path = '/';
  let origin = WWW;
  try {
    const u = new URL(url);
    path = u.pathname + (u.search || '');
    origin = u.origin;
  } catch { /* ignore */ }
  return {
    'Content-Type': 'application/json',
    'Accept-Language': loc,
    'Origin': WWW,
    'Referer': url,
    'User-Agent': 'Mozilla/5.0 (Superalink checkout prefill; +cloudflare-worker)',
    'X-Page-URL': url,
    'X-Page-Path': path,
    'X-Page-Origin': origin,
  };
}

export async function fetchProducts(countryCode: string): Promise<unknown[]> {
  const url = `${STORE}/products?country_code=${encodeURIComponent(countryCode)}`;
  const resp = await fetch(url, {
    headers: { 'Accept-Language': DEFAULT_LOCALE, 'User-Agent': 'Mozilla/5.0' },
  });
  if (!resp.ok) throw new Error(`products API failed: ${resp.status} ${await resp.text()}`);
  const data = await resp.json() as unknown[];
  const products: unknown[] = [];
  for (const g of data) {
    if (g && typeof g === 'object' && 'products' in g) {
      products.push(...(g as { products: unknown[] }).products);
    }
  }
  return products;
}

export async function createCheckout(params: {
  sku: string; qty: number; currency: string; coupon?: string; pageUrl?: string; locale?: string;
}): Promise<{ order: SuperalinkOrder; sessionId: string; headers: Record<string, string> }> {
  const headers = pageHeaders(params.pageUrl, params.locale);
  const payload: Record<string, unknown> = {
    sku: params.sku, qty: params.qty, currency: params.currency, isExtension: false,
  };
  if (params.coupon) payload.coupon = params.coupon;

  const resp = await fetch(`${STORE}/v2/checkout`, {
    method: 'POST', headers, body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`create checkout failed: ${resp.status} ${text}`);
  }
  const data = await resp.json() as { order: SuperalinkOrder };
  const order = data.order;
  const sessionId = order.buyer.sessionID;
  return { order, sessionId, headers };
}

export async function updateRecipientEmail(
  session: SuperalinkSession, orderId: string, email: string, subscribe: boolean = false,
): Promise<{ order: SuperalinkOrder | null; ineligible: boolean; reason?: string }> {
  const payload = {
    voucherRecipientEmail: email,
    voucherRecipientIsSubscribingToNewsletter: subscribe,
  };
  const resp = await fetch(`${STORE}/v2/checkout/${orderId}`, {
    method: 'PATCH',
    headers: { ...pageHeaders(), 'Cookie': sessionCookies(session) },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`update recipient email failed: ${resp.status} ${text}`);
  }
  const data = await resp.json() as Record<string, unknown>;
  const order = (data.order ?? data) as SuperalinkOrder | null;
  const msgBlob = JSON.stringify(data).toLowerCase();
  const couponBlob = JSON.stringify((order?.coupons ?? data.coupons ?? data) ?? '').toLowerCase();

  if (
    msgBlob.includes('first') || msgBlob.includes('首次') ||
    (msgBlob.includes('used') && msgBlob.includes('coupon')) ||
    msgBlob.includes('not applicable') ||
    (msgBlob.includes('invalid') && msgBlob.includes('coupon')) ||
    (couponBlob.includes('coupon') && (couponBlob.includes('removed') || couponBlob.includes('invalid') || couponBlob.includes('not')))
  ) {
    return { order: null, ineligible: true, reason: '该优惠券仅在首次购买时可用。' };
  }
  return { order, ineligible: false };
}

export async function getIntents(session: SuperalinkSession, orderId: string): Promise<PaymentIntent[]> {
  const resp = await fetch(`${STORE}/v2/checkout/${orderId}/payment-intents`, {
    headers: { ...pageHeaders(), 'Cookie': sessionCookies(session) },
  });
  if (!resp.ok) return [];
  return await resp.json() as PaymentIntent[];
}

export { pageHeaders, sessionCookies };