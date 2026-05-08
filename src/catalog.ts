import {
  STORE, DEFAULT_LOCALE, DISCOUNT_CAPS, CURRENCY_DECIMALS, CURRENCY_SYMBOLS,
  COUNTRY_SLUGS, LOCAL_REFERENCE_CURRENCIES, STORE_FRONT_5GB_DAYS_BY_COUNTRY,
  DEFAULT_STORE_FRONT_5GB_DAYS, DEFAULT_COUNTRY_CODE, DEFAULT_CURRENCY,
  DEFAULT_COUPON, DEFAULT_DURATION, DEFAULT_OPTION, DEFAULT_SKU, DEFAULT_URL,
  formatPrice, localReferenceCurrency, countrySlug, normalizeOption,
  durationDays, productDataAmount, skuCountryCode, countryCodeFromUrl,
} from './constants';
import type { SuperalinkProduct, CatalogItem, PriceInfo, DiscountCap, PaymentIntent } from './types';
import { fetchProducts } from './api';

export function capDiscountedPrices(product: SuperalinkProduct): Record<string, PriceInfo> {
  const prices = product.price ?? {};
  const out: Record<string, PriceInfo> = {};
  for (const [cur, p] of Object.entries(prices)) {
    if (!(cur in DISCOUNT_CAPS)) continue;
    const amount = typeof p === 'object' ? p.amount : null;
    if (amount == null) continue;
    const cap = (DISCOUNT_CAPS[cur] as DiscountCap).amount;
    const final_ = Math.max(0, Math.round((Number(amount) - cap) * 100) / 100);
    const decimals = typeof p === 'object'
      ? (p.decimals ?? CURRENCY_DECIMALS[cur] ?? 2)
      : (CURRENCY_DECIMALS[cur] ?? 2);
    const finalAmount = decimals === 0 ? Math.round(final_) : final_;
    out[cur] = {
      amount: finalAmount,
      symbol: (DISCOUNT_CAPS[cur] as DiscountCap).symbol ?? (typeof p === 'object' ? p.symbol : undefined) ?? CURRENCY_SYMBOLS[cur] ?? cur,
      inUse: typeof p === 'object' ? !!p.inUse : false,
      decimals,
      display: formatPrice(cur, final_),
      formattedAmount: decimals === 0 ? String(Math.round(final_)) : final_.toFixed(2),
      discountCap: cap,
      discountDisplay: formatPrice(cur, cap),
    };
  }
  return out;
}

export function storefrontVisibleProduct(product: SuperalinkProduct, countryCode?: string): boolean {
  const [amount, unit] = productDataAmount(product);
  const days = durationDays(product);
  const allowed = STORE_FRONT_5GB_DAYS_BY_COUNTRY[(countryCode ?? '').toUpperCase()] ?? DEFAULT_STORE_FRONT_5GB_DAYS;
  return (
    product.dataPlan?.option === 'UNLIMITED' &&
    Number(amount) === 5 &&
    String(unit).toUpperCase() === 'GB' &&
    days != null && allowed.includes(days)
  );
}

export async function catalogForCountry(countryCode: string): Promise<CatalogItem[]> {
  const products = await fetchProducts(countryCode);
  const out: CatalogItem[] = [];
  for (const p of products) {
    const sp = p as SuperalinkProduct;
    if (!storefrontVisibleProduct(sp, countryCode)) continue;
    const [amount, unit] = productDataAmount(sp);
    out.push({
      sku: sp.sku,
      kind: sp.kind ?? null,
      option: sp.dataPlan?.option ?? null,
      duration_days: durationDays(sp),
      data_amount: amount,
      data_unit: unit,
      prices: sp.price ?? {},
      discounted_prices: capDiscountedPrices(sp),
      country_slug: countrySlug(countryCode),
      reference_currency: localReferenceCurrency(countryCode),
    });
  }
  out.sort((a, b) => ((a.duration_days ?? 9999) - (b.duration_days ?? 9999)) || (a.option ?? '').localeCompare(b.option ?? '') || (a.sku ?? '').localeCompare(b.sku ?? ''));
  const seen = new Set<string>();
  return out.filter(item => {
    if (seen.has(item.sku)) return false;
    seen.add(item.sku);
    return true;
  });
}

export async function chooseProduct(
  countryCode: string, durationDaysWanted?: number | null, option?: string | null,
  dataAmount?: number | null, dataUnit?: string | null, sku?: string | null,
): Promise<SuperalinkProduct> {
  const products = await fetchProducts(countryCode);
  if (sku) {
    const found = products.find(p => (p as SuperalinkProduct).sku === sku);
    if (found) return found as SuperalinkProduct;
    throw new Error(`SKU not found: ${sku}`);
  }
  const opt = normalizeOption(option);
  const candidates: SuperalinkProduct[] = [];
  for (const p of products) {
    const sp = p as SuperalinkProduct;
    if (opt && sp.dataPlan?.option !== opt) continue;
    if (durationDaysWanted != null && durationDays(sp) !== durationDaysWanted) continue;
    const [amt, unit] = productDataAmount(sp);
    if (dataAmount != null && Number(amt) !== dataAmount) continue;
    if (dataUnit && String(unit).toUpperCase() !== dataUnit.toUpperCase()) continue;
    candidates.push(sp);
  }
  if (candidates.length === 0) throw new Error('No product matched. Try explicit sku.');
  if (opt === 'UNLIMITED' && dataAmount == null) {
    const preferred = candidates.find(p => {
      const [a, u] = productDataAmount(p);
      return a === 5 && u === 'GB';
    });
    if (preferred) return preferred;
  }
  candidates.sort((a, b) => {
    const pa = a.price?.USD?.amount ?? 1e9;
    const pb = b.price?.USD?.amount ?? 1e9;
    return pa - pb;
  });
  return candidates[0];
}

export function officialCheckoutUrlFromProduct(
  product: SuperalinkProduct, locale?: string, affiliateCode?: string, coupon?: string, currency?: string,
): string {
  const slug = countrySlug(skuCountryCode(product.sku) ?? DEFAULT_COUNTRY_CODE);
  const params = new URLSearchParams({
    duration: String(durationDays(product) ?? DEFAULT_DURATION),
    utm_source: 'affiliate',
    affiliate_code: affiliateCode ?? DEFAULT_COUPON,
    promo: 'affiliate-influencer',
    currency: currency ?? DEFAULT_CURRENCY,
    coupon: coupon ?? DEFAULT_COUPON,
  });
  return `${WWW}/${locale ?? DEFAULT_LOCALE}/esim/${slug}?${params.toString()}`;
}

export function activePriceFromIntent(intent: PaymentIntent | null, currency: string): PriceInfo | null {
  const prices = intent?.prices ?? {};
  for (const bucket of ['net', 'gross'] as const) {
    const b = prices[bucket];
    if (b && typeof b === 'object') {
      const price = b[currency];
      if (price) return price as PriceInfo;
      for (const candidate of Object.values(b)) {
        if (typeof candidate === 'object' && candidate?.inUse) return candidate as PriceInfo;
      }
    }
  }
  return null;
}

