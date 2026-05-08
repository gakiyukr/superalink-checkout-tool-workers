import type { DiscountCap, SuperalinkProduct } from './types';

export const STORE = 'https://storefront.api.superalink.com';
export const WWW = 'https://www.superalink.com';
export const DEFAULT_URL = 'https://www.superalink.com/cn/esim/china-mainland?affiliate_code=HAN000000&duration=5&option=unlimited&promo=affiliate-influencer&utm_source=affiliate';
export const DEFAULT_COUNTRY_CODE = 'CN';
export const DEFAULT_LOCALE = 'cn';
export const DEFAULT_CURRENCY = 'THB';
export const DEFAULT_DURATION = '5';
export const DEFAULT_OPTION = 'unlimited';
export const DEFAULT_SKU = 'CN-5GB_UNLIMITED-5GB-5-DAYS';
export const DEFAULT_COUPON = 'HAN000000';
export const TOKEN_TTL = 1800;
export const EMAIL_CACHE_TTL = 86400;

export const DEST_SLUGS: Record<string, string> = {
  'china-mainland': 'CN', 'china': 'CN', 'taiwan': 'TW', 'hong-kong': 'HK',
  'japan': 'JP', 'korea': 'KR', 'south-korea': 'KR', 'singapore': 'SG',
  'thailand': 'TH', 'malaysia': 'MY', 'indonesia': 'ID', 'vietnam': 'VN',
  'philippines': 'PH', 'united-states': 'US', 'usa': 'US', 'united-kingdom': 'GB',
};

export const COUNTRY_SLUGS: Record<string, string> = {
  AU: 'australia', NZ: 'new-zealand', US: 'united-states', GB: 'united-kingdom',
  HK: 'hong-kong', MO: 'macau', SG: 'singapore', JP: 'japan', KR: 'south-korea',
  TH: 'thailand', MY: 'malaysia', ID: 'indonesia', VN: 'vietnam', PH: 'philippines',
  TW: 'taiwan', CN: 'china-mainland',
};

export const DISCOUNT_CAPS: Record<string, DiscountCap> = {
  THB: { amount: 175, symbol: '฿', decimals: 2 },
  EUR: { amount: 4, symbol: '€', decimals: 2 },
  USD: { amount: 5, symbol: '$', decimals: 2 },
  GBP: { amount: 4, symbol: '£', decimals: 2 },
  KRW: { amount: 6750, symbol: '₩', decimals: 0 },
  JPY: { amount: 775, symbol: '¥', decimals: 0 },
  SGD: { amount: 6.75, symbol: 'S$', decimals: 2 },
  CNY: { amount: 36.25, symbol: '¥', decimals: 2 },
  IDR: { amount: 80000, symbol: 'Rp', decimals: 0 },
};

export const CNY_RATES: Record<string, number> = {
  THB: 0.21, GBP: 9.15, AUD: 4.70, SGD: 5.55, USD: 7.20,
  HKD: 0.92, TWD: 0.23, JPY: 0.047, CNY: 1, EUR: 7.75,
  KRW: 0.0052, IDR: 0.00045,
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  THB: '฿', GBP: '£', AUD: 'A$', SGD: 'S$', USD: '$',
  HKD: 'HK$', TWD: 'NT$', JPY: '¥', CNY: '¥', EUR: '€', KRW: '₩', IDR: 'Rp',
};

export const CURRENCY_DECIMALS: Record<string, number> = { JPY: 0, KRW: 0, IDR: 0 };

export const LOCAL_REFERENCE_CURRENCIES: Record<string, string> = {
  CN: 'CNY', HK: 'HKD', MO: 'HKD', HK_MO: 'HKD', TW: 'TWD',
  JP: 'JPY', KR: 'KRW', TH: 'THB', SG: 'SGD', ID: 'IDR',
  AU: 'AUD', NZ: 'AUD', GB: 'GBP', US: 'USD', US_CA: 'USD', EU_33: 'EUR',
};

export const STORE_FRONT_5GB_DAYS_BY_COUNTRY: Record<string, number[]> = {
  TH: [6, 7, 10, 12, 15, 20, 30], SG: [5, 6, 7, 10, 12, 15, 20, 30],
  VN: [5, 7, 10, 12, 15, 20, 30], JP: [5, 6, 7, 10, 12, 15, 20, 30],
  MY: [6, 7, 10, 12, 15, 20, 30], PH: [5, 7, 10, 12, 15, 20, 30],
  ID: [5, 7, 10, 12, 15, 20, 30], TW: [5, 7, 10, 12, 15, 20, 30],
  KR: [5, 6, 7, 10, 12, 15, 20, 30], AP: [5, 7, 10, 12, 15, 20, 30],
  KR_JP: [5, 6, 7, 10, 12, 15, 20, 30], CN: [5, 6, 7, 10, 12, 15, 20, 30],
  CH: [5, 7, 10, 12, 15, 20, 30], AE: [5, 7, 10, 12, 15, 20, 30],
  MX: [5, 6, 7, 10, 12, 15, 20, 30], US: [5, 6, 7, 10, 12, 15, 20, 30],
  CA: [5, 6, 7, 10, 12, 15, 20, 30], SA: [5, 7, 10, 12, 15, 20, 30],
  DE: [5, 7, 10, 12, 15, 20, 30], AU: [5, 6, 7, 10, 12, 15, 20, 30],
  EG: [5, 7, 10, 12, 15, 20, 30], ES: [5, 7, 10, 12, 15, 20, 30],
  FR: [5, 7, 10, 12, 15, 20, 30], GU: [5, 7, 10, 12, 15, 20, 30],
  GU_MP: [5, 7, 10, 12, 15, 20, 30], DK: [5, 7, 10, 12, 15, 20, 30],
  HK_MO: [5, 7, 10, 12, 15, 20, 30], IT: [5, 7, 10, 12, 15, 20, 30],
  KH: [5, 7, 10, 12, 15, 20, 30], MN: [5, 7, 10, 12, 15, 20, 30],
  MO: [5, 7, 10, 12, 15, 20, 30], GB: [5, 7, 10, 12, 15, 20, 30],
  PT: [5, 7, 10, 12, 15, 20, 30], SE: [5, 7, 10, 12, 15, 20, 30],
  TR: [5, 7, 10, 12, 15, 20, 30], US_CA: [5, 7, 10, 12, 15, 20, 30],
  ZA: [5, 7, 10, 12, 15, 20, 30], MT: [5, 7, 10, 12, 15, 20, 30],
  HK: [5, 7, 10, 12, 15, 20, 30], AT: [5, 7, 10, 12, 15, 20, 30],
  WW_109: [7, 10, 15, 20, 30], IE: [5, 7, 10, 12, 15, 20, 30],
  MP: [5, 7, 10, 12, 15, 20, 30],
};
export const DEFAULT_STORE_FRONT_5GB_DAYS = [5, 7, 10, 12, 15, 20, 30];

// --- Helper functions ---

export function formatPrice(currency: string, amount: number | null | undefined): string {
  const decimals = CURRENCY_DECIMALS[currency] ?? 2;
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency + ' ';
  if (amount == null) return '--';
  if (decimals === 0) return `${symbol}${Math.round(amount)}`;
  return `${symbol}${amount.toFixed(2)}`;
}

export function localReferenceCurrency(countryCode?: string): string {
  const cc = (countryCode ?? DEFAULT_COUNTRY_CODE).toUpperCase();
  return LOCAL_REFERENCE_CURRENCIES[cc] ?? 'CNY';
}

export function countrySlug(countryCode?: string): string {
  const cc = (countryCode ?? DEFAULT_COUNTRY_CODE).toUpperCase();
  return COUNTRY_SLUGS[cc] ?? cc.toLowerCase().replace(/_/g, '-');
}

export function normalizeOption(option?: string | null): string | null {
  if (!option) return null;
  const o = option.toLowerCase().trim();
  if (['unlimited', '无限', '不限量'].includes(o)) return 'UNLIMITED';
  if (['quota', 'regular', 'fixed', '流量'].includes(o)) return 'QUOTA';
  return o.toUpperCase();
}

export function durationDays(product: SuperalinkProduct): number | null {
  const dp = product.dataPlan;
  const value = dp?.data?.duration?.value;
  const unit = dp?.data?.duration?.unit;
  if (unit === 'MILLISECONDS' && value != null) return Math.round(value / 86400000);
  return null;
}

export function productDataAmount(product: SuperalinkProduct): [number | null, string | null] {
  const dp = product.dataPlan;
  if (dp?.option === 'UNLIMITED') {
    const data = dp?.FUP?.data;
    return [data?.amount ?? null, data?.unit ?? null];
  }
  const data = dp?.data?.data;
  return [data?.amount ?? null, data?.unit ?? null];
}

export function skuCountryCode(sku?: string | null): string | null {
  if (sku && sku.includes('-')) return sku.split('-')[0].toUpperCase();
  return null;
}

export function countryCodeFromUrl(pageUrl?: string | null): string | null {
  try {
    const url = new URL(pageUrl ?? '');
    const parts = url.pathname.split('/').filter(Boolean);
    const esimIdx = parts.indexOf('esim');
    if (esimIdx >= 0 && esimIdx + 1 < parts.length) {
      const slug = parts[esimIdx + 1].toLowerCase();
      if (DEST_SLUGS[slug]) return DEST_SLUGS[slug];
    }
    if (parts.includes('destination')) return null;
  } catch { /* ignore */ }
  return null;
}

export function normalizeEmail(email?: string | null): string {
  let e = (email ?? '').trim().toLowerCase();
  // NFKC normalization: collapse full-width characters to prevent homoglyph bypass
  e = e.replace(/\uff20/g, '@').replace(/\uff0e/g, '.'); // ＠→@, ．→.
  return e;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}