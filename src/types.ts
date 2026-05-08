export interface Env {
  CHECKOUT_KV: KVNamespace;
  STRIPE_PK: string;
  PAYPAL_CLIENT_ID: string;
  LOCAL_API_BASE: string;
}

export interface TokenData {
  checkout_url: string;
  order_id: string;
  email: string | null;
  coupon: string | null;
  amount: string | undefined;
  currency: string;
  client_secret: string | null;
  stripe_intent_id: string | null;
  paypal_intent_id: string | null;
  paypal_order_id: string | null;
  cookie_name: string;
  cookie_value: string;
  product: ProductSummary;
}

export interface ProductSummary {
  sku: string;
  country_code: string;
  kind: string | null;
  duration_days: number | null;
  option: string | null;
  fup_or_data: { amount: number | null; unit: string | null };
  price: PriceInfo | null;
  gross_price: PriceInfo | null;
  official_url: string;
}

export interface PriceInfo {
  amount: number;
  symbol?: string;
  inUse?: boolean;
  decimals: number;
  display: string;
  formattedAmount?: string;
  discountCap?: number;
  discountDisplay?: string;
}

export interface CheckoutParams {
  url?: string;
  country_code?: string;
  sku?: string;
  currency?: string;
  coupon?: string;
  affiliate_code?: string;
  duration?: string;
  option?: string;
  locale?: string;
  email?: string;
  recipient_email?: string;
  subscribe?: string;
  qty?: string;
  data_amount?: string;
  data_unit?: string;
}

export interface SuperalinkProduct {
  sku: string;
  kind: string;
  price: Record<string, PriceInfo>;
  dataPlan: {
    option: string;
    data: {
      data: { amount: number; unit: string };
      duration: { value: number; unit: string };
    };
    FUP?: { data: { amount: number; unit: string } };
  };
  [key: string]: unknown;
}

export interface SuperalinkOrder {
  uniqueId: string;
  buyer: { sessionID: string };
  recipient?: { email?: string; phone?: string };
  coupons?: unknown[];
  [key: string]: unknown;
}

export interface PaymentIntent {
  id: string;
  methodIdentifier: string;
  meta?: { clientSecret?: string; orderId?: string };
  prices?: Record<string, Record<string, PriceInfo>>;
  [key: string]: unknown;
}

export interface CatalogItem {
  sku: string;
  kind: string | null;
  option: string | null;
  duration_days: number | null;
  data_amount: number | null;
  data_unit: string | null;
  prices: Record<string, PriceInfo>;
  discounted_prices: Record<string, PriceInfo>;
  country_slug: string;
  reference_currency: string;
}

export interface DiscountCap {
  amount: number;
  symbol: string;
  decimals: number;
}

export interface CreateCheckoutResult {
  ok: boolean;
  created_at?: number;
  checkout_url?: string;
  pay_url?: string;
  native_url?: string;
  order_id?: string;
  email?: string | null;
  recipient?: unknown;
  session_cookie?: { name: string; value: string; domain: string };
  product?: ProductSummary;
  coupon_sent?: string | null;
  note?: string;
  error?: string;
}

export interface SuperalinkSession {
  sessionId: string;
  locale: string;
}

export interface ApiError {
  status_code: number;
  body: unknown;
}