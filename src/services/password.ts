// Demo credential hashing with Web Crypto (browser and Node 20+). Passwords are stored in
// localStorage only as salted PBKDF2-SHA256 hashes, never as plain text. This is demo-grade
// protection on a shared device, not a substitute for server-side authentication.

export const PBKDF2_ITERATIONS = 100_000;
const HEX = /^[0-9a-f]+$/;

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex: string) => new Uint8Array(hex.match(/../g)!.map((h) => parseInt(h, 16)));

export const isSaltHex = (v: unknown): v is string => typeof v === "string" && v.length === 32 && HEX.test(v);
export const isHashHex = (v: unknown): v is string => typeof v === "string" && v.length === 64 && HEX.test(v);

export async function hashPassword(password: string, saltHex?: string): Promise<{ salt: string; hash: string }> {
  const salt = saltHex ?? toHex(crypto.getRandomValues(new Uint8Array(16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromHex(salt), iterations: PBKDF2_ITERATIONS }, key, 256);
  return { salt, hash: toHex(new Uint8Array(bits)) };
}

/** Constant-time comparison of the derived hash against the stored one. */
export async function verifyPassword(password: string, account: { salt?: string; passwordHash?: string }): Promise<boolean> {
  if (!isSaltHex(account.salt) || !isHashHex(account.passwordHash)) return false;
  const { hash } = await hashPassword(password, account.salt);
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ account.passwordHash.charCodeAt(i);
  return diff === 0;
}
