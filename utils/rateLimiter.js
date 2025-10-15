const LIMIT_PER_MINUTE = 15;
const WINDOW_MS = 60_000;

const buckets = new Map();

export function allowRequest(key) {
  if (!key) {
    return true;
  }

  const now = Date.now();
  const bucket = buckets.get(key) ?? {
    count: 0,
    resetAt: now + WINDOW_MS,
  };

  if (now >= bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + WINDOW_MS;
  }

  if (bucket.count >= LIMIT_PER_MINUTE) {
    buckets.set(key, bucket);
    return false;
  }

  bucket.count += 1;
  buckets.set(key, bucket);
  return true;
}
