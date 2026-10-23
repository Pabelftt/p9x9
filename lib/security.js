import crypto from "node:crypto";
import { promisify } from "node:util";

const rateLimitMap = new Map();
const scrypt = promisify(crypto.scrypt);

export function sanitizeString(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim().replace(/\s+/g, " ").slice(0, 2000);
}

export function normalizeRouteName(value) {
  return sanitizeString(value).toLowerCase().replace(/[^a-z0-9\-\s]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function isValidHttpUrl(value) {
  if (typeof value !== "string") return false;

  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) && !!parsed.hostname;
  } catch {
    return false;
  }
}

export function isLikelyPrivateHost(hostname) {
  if (!hostname) return true;

  const normalized = hostname.toLowerCase();
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(normalized)) return true;
  if (normalized.endsWith(".localhost")) return true;
  if (normalized.includes("127.0.0.")) return true;

  const privateHostnames = ["local", "internal", "home.arpa", "example.com", "example.org", "example.net"];
  return privateHostnames.some((entry) => normalized === entry || normalized.endsWith(`.${entry}`));
}

export function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;

  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  const max = Math.max(aBuf.length, bBuf.length);
  const aPad = Buffer.alloc(max, 0);
  const bPad = Buffer.alloc(max, 0);
  aBuf.copy(aPad);
  bBuf.copy(bPad);

  return crypto.timingSafeEqual(aPad, bPad) && aBuf.length === bBuf.length;
}

export function isScryptPasswordHash(value) {
  return typeof value === "string" && value.startsWith("scrypt$");
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64, {
    N: 16_384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024
  });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password, storedValue) {
  if (!isScryptPasswordHash(storedValue)) {
    return timingSafeEqual(storedValue, password);
  }

  const parts = storedValue.split("$");
  if (
    parts.length !== 6 ||
    parts[1] !== "16384" ||
    parts[2] !== "8" ||
    parts[3] !== "1" ||
    !/^[A-Za-z0-9_-]{22}$/.test(parts[4]) ||
    !/^[A-Za-z0-9_-]{86}$/.test(parts[5])
  ) {
    return false;
  }

  try {
    const salt = Buffer.from(parts[4], "base64url");
    const expected = Buffer.from(parts[5], "base64url");
    const actual = await scrypt(password, salt, expected.length, {
      N: 16_384,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024
    });
    return (
      expected.length === actual.length &&
      crypto.timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}

export function rateLimit(key, windowMs = 60_000, maxRequests = 12) {
  const now = Date.now();
  if (rateLimitMap.size >= 10_000 && !rateLimitMap.has(key)) {
    for (const [entryKey, bucket] of rateLimitMap) {
      if (bucket.resetAt <= now) rateLimitMap.delete(entryKey);
    }
    while (rateLimitMap.size >= 10_000) {
      const oldestKey = rateLimitMap.keys().next().value;
      if (oldestKey === undefined) break;
      rateLimitMap.delete(oldestKey);
    }
  }
  const bucket = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  rateLimitMap.set(key, bucket);

  return bucket.count <= maxRequests;
}
