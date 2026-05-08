import {
  DEFAULT_URL, DEFAULT_LOCALE, DEFAULT_CURRENCY, DEFAULT_DURATION, DEFAULT_OPTION,
  DEFAULT_SKU, DEFAULT_COUPON, WWW, countryCodeFromUrl, skuCountryCode,
  durationDays, productDataAmount, countrySlug, localReferenceCurrency,
} from './constants';
import type { CheckoutParams, CreateCheckoutResult, TokenData, SuperalinkOrder, PaymentIntent } from './types';
import { storeToken, loadToken, rememberEmailIneligible, cachedEmailIneligible, normalizeEmail } from './tokens';
import { createCheckout, updateRecipientEmail, getOrder, getIntents, makePaypalIntent, captureIntent, authorizeCapture, pageHeaders } from './api';
import { chooseProduct, officialCheckoutUrlFromProduct, activePriceFromIntent, capDiscountedPrices } from './catalog';

export async function resultFromParams(kv: KVNamespace, params: CheckoutParams): Promise<CreateCheckoutResult> {
  const pageUrl = params.url || DEFAULT_URL;
  let affiliateCode = DEFAULT_COUPON;
  try {
    const u = new URL(pageUrl);
    affiliateCode = u.searchParams.get('affiliate_code') ?? DEFAULT_COUPON;
  } catch { /* ignore */ }
  const coupon = params.coupon || affiliateCode || DEFAULT_COUPON;
  const currency = params.currency || DEFAULT_CURRENCY;
  const duration = params.duration || DEFAULT_DURATION;
  const option = params.option || DEFAULT_OPTION;
  const urlCountry = countryCodeFromUrl(pageUrl);
  const sku = params.sku || null;
  const countryCode = params.country_code || skuCountryCode(sku) || urlCountry || DEFAULT_COUNTRY_CODE;
  const locale = params.locale || DEFAULT_LOCALE;

  let effectiveSku = sku;
  if (!effectiveSku && countryCode === DEFAULT_COUNTRY_CODE && duration === DEFAULT_DURATION && option === DEFAULT_OPTION && !urlCountry) {
    effectiveSku = DEFAULT_SKU;
  }

  const product = await chooseProduct(
    countryCode,
    duration ? parseInt(duration) : null,
    option,
    params.data_amount ? parseFloat(params.data_amount) : null,
    params.data_unit,
    effectiveSku,
  );

  const { order, sessionId, headers } = await createCheckout({
    sku: product.sku, qty: parseInt(params.qty || '1'), currency, coupon, pageUrl, locale,
  });

  const orderId = order.uniqueId;
  let email = (params.email || params.recipient_email || '').trim();
  let updatedOrder: SuperalinkOrder | null = null;

  if (email) {
    const result = await updateRecipientEmail(
      { sessionId, locale }, orderId, email,
      ['1', 'true', 'yes', 'y'].includes((params.subscribe ?? '').toLowerCase()),
    );
    if (result.order) updatedOrder = result.order;
  }

  const intents = await getIntents({ sessionId, locale }, orderId);
  const stripe = intents.find(i => i.methodIdentifier === 'stripe') ?? null;
  const paypalIntent = intents.find(i => i.methodIdentifier === 'paypal') ?? null;
  const [amount, unit] = productDataAmount(product);
  const checkoutPrice = activePriceFromIntent(stripe, currency) ?? product.price?.[currency] ?? product.price?.['USD'] ?? null;

  const checkoutUrl = `${WWW}/${locale}/checkout/${orderId}?affiliate_code=${coupon}&duration=${duration}&option=${option}&promo=affiliate-influencer&utm_source=affiliate&currency=${currency}&coupon=${coupon}`;
  const clientSecret = stripe?.meta?.clientSecret ?? null;
  const stripeIntentId = stripe?.id ?? null;

  const tokenData: TokenData = {
    checkout_url: checkoutUrl,
    order_id: orderId,
    email: email || null,
    coupon,
    amount: checkoutPrice?.display,
    currency,
    client_secret: clientSecret,
    stripe_intent_id: stripeIntentId,
    paypal_intent_id: paypalIntent?.id ?? null,
    paypal_order_id: paypalIntent?.meta?.orderId ?? null,
    cookie_name: 'splnk_checkout_session',
    cookie_value: sessionId,
    product: {
      sku: product.sku,
      country_code: product.sku.split('-')[0],
      kind: product.kind,
      duration_days: durationDays(product),
      option: product.dataPlan?.option ?? null,
      fup_or_data: { amount, unit },
      price: checkoutPrice,
      gross_price: product.price?.[currency] ?? product.price?.['USD'] ?? null,
      official_url: officialCheckoutUrlFromProduct(product, locale, coupon, coupon, currency),
    },
  };

  const token = await storeToken(kv, tokenData);

  return {
    ok: true,
    created_at: Math.floor(Date.now() / 1000),
    checkout_url: checkoutUrl,
    pay_url: `/pay?t=${token}`,
    native_url: `/go?t=${token}`,
    order_id: orderId,
    email: email || null,
    recipient: order.recipient,
    session_cookie: { name: 'splnk_checkout_session', value: '[REDACTED]', domain: '.superalink.com' },
    product: tokenData.product,
    coupon_sent: coupon,
    note: '已创建 Superalink 原生 checkout；浏览器会在 supera.onlypast.com 同域代理页写入 session 后打开付款页，以便优惠券和付款方式正常加载。',
  };
}

export async function handleCheckEmail(
  kv: KVNamespace, body: { t: string; email: string },
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const data = await loadToken(kv, body.t);
  const email = normalizeEmail(body.email);
  if (!email) throw new Error('请先填写接收 eSIM 的邮箱');

  const cached = await cachedEmailIneligible(kv, email);
  if (cached) throw new Error(cached);

  const session = { sessionId: data.cookie_value, locale: DEFAULT_LOCALE };
  const result = await updateRecipientEmail(session, data.order_id, email, false);
  if (result.ineligible) {
    await rememberEmailIneligible(kv, email, result.reason);
    throw new Error(result.reason ?? '该优惠券仅在首次购买时可用。');
  }
  data.email = email;
  return { ok: true, message: '邮箱可用，优惠券仍可用。' };
}

export async function handlePrepay(
  kv: KVNamespace, body: { t: string; email: string; method: string },
): Promise<{ ok: boolean; pre_capture?: boolean; pre_capture_error?: string | null; callback?: string; amount?: string; coupon?: string; error?: string }> {
  const data = await loadToken(kv, body.t);
  const email = normalizeEmail(body.email);
  const session = { sessionId: data.cookie_value, locale: DEFAULT_LOCALE };

  const cached = await cachedEmailIneligible(kv, email);
  if (cached) throw new Error(cached);

  const emailResult = await updateRecipientEmail(session, data.order_id, email, false);
  if (emailResult.ineligible) {
    await rememberEmailIneligible(kv, email, emailResult.reason);
    throw new Error(emailResult.reason ?? '该优惠券仅在首次购买时可用。');
  }

  const cap = await authorizeCapture(session, data.order_id, data.stripe_intent_id ?? '');
  const cb = `?paymentMethod=stripe&session=${encodeURIComponent(data.cookie_value)}`;

  return {
    ok: true,
    pre_capture: cap.ok,
    pre_capture_error: cap.ok ? null : JSON.stringify(cap.error),
    callback: cb,
    amount: data.amount,
    coupon: data.coupon,
  };
}

export async function handlePaypalCreate(
  kv: KVNamespace, body: { t: string; email: string },
): Promise<{ ok: boolean; paypal_order_id?: string; pre_capture?: boolean; error?: string }> {
  const data = await loadToken(kv, body.t);
  const email = normalizeEmail(body.email);
  const session = { sessionId: data.cookie_value, locale: DEFAULT_LOCALE };

  const cached = await cachedEmailIneligible(kv, email);
  if (cached) throw new Error(cached);

  const emailResult = await updateRecipientEmail(session, data.order_id, email, false);
  if (emailResult.ineligible) {
    await rememberEmailIneligible(kv, email, emailResult.reason);
    throw new Error(emailResult.reason ?? '该优惠券仅在首次购买时可用。');
  }

  const pi = await makePaypalIntent(session, data.order_id);
  const cap = await authorizeCapture(session, data.order_id, pi.id);
  data.paypal_intent_id = pi.id;
  data.paypal_order_id = pi.meta?.orderId;

  return {
    ok: true,
    paypal_order_id: data.paypal_order_id ?? undefined,
    pre_capture: cap.ok,
  };
}

export async function handlePaypalCapture(
  kv: KVNamespace, body: { t: string; paypal_order_id: string },
): Promise<{ ok: boolean; capture_error?: string | null; error?: string }> {
  const data = await loadToken(kv, body.t);
  const session = { sessionId: data.cookie_value, locale: DEFAULT_LOCALE };

  let intentId = data.paypal_intent_id;
  if (!intentId) {
    const intents = await getIntents(session, data.order_id);
    const match = intents.find(i =>
      i.methodIdentifier === 'paypal' && (i as PaymentIntent & { meta?: { orderId?: string } }).meta?.orderId === body.paypal_order_id,
    );
    intentId = match?.id ?? null;
  }
  if (!intentId) throw new Error('paypal intent not found');

  const cap = await captureIntent(session, data.order_id, intentId);
  return { ok: cap.ok, capture_error: cap.ok ? null : JSON.stringify(cap.error) };
}