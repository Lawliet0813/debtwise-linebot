const cache = new Map();

function purgeExpired(now = Date.now()) {
  for (const [key, expiry] of cache.entries()) {
    if (expiry <= now) {
      cache.delete(key);
    }
  }
}

export function shouldProcessOnce(key, ttlMs = 300_000) {
  if (!key) {
    return true;
  }

  const now = Date.now();
  purgeExpired(now);

  const expiry = cache.get(key);
  if (expiry && expiry > now) {
    return false;
  }

  cache.set(key, now + ttlMs);
  return true;
}

export function __clearDedupeCache() {
  cache.clear();
}
