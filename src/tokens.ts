import { TOKEN_TTL, EMAIL_CACHE_TTL, normalizeEmail } from './constants';
import type { TokenData } from './types';

export { normalizeEmail };

export async function storeToken(kv: KVNamespace, data: TokenData): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const token = btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await kv.put(`token:${token}`, JSON.stringify(data), { expirationTtl: TOKEN_TTL });
  return token;
}

export async function loadToken(kv: KVNamespace, token: string): Promise<TokenData> {
  const raw = await kv.get(`token:${token}`);
  if (!raw) throw new Error('token expired or not found');
  return JSON.parse(raw) as TokenData;
}

export async function rememberEmailIneligible(
  kv: KVNamespace,
  email: string,
  reason: string = '该优惠券仅在首次购买时可用。',
): Promise<void> {
  if (!email) return;
  const key = `email:${normalizeEmail(email)}`;
  await kv.put(key, JSON.stringify({ reason }), { expirationTtl: EMAIL_CACHE_TTL });
}

export async function cachedEmailIneligible(
  kv: KVNamespace,
  email: string,
): Promise<string | null> {
  const key = `email:${normalizeEmail(email)}`;
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed.reason ?? null;
  } catch {
    return null;
  }
}