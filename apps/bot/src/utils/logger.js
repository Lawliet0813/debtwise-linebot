const redact = (value) => {
  if (typeof value !== 'string') return value;
  if (!value) return value;
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
};

const formatPayload = (payload, level) => {
  const base = {
    level,
    timestamp: new Date().toISOString(),
  };
  const data = { ...payload };
  if (typeof data.token === 'string') {
    data.token = redact(data.token);
  }
  if (typeof data.secret === 'string') {
    data.secret = redact(data.secret);
  }
  return JSON.stringify({ ...base, ...data });
};

export function logInfo(payload) {
  console.log(formatPayload(payload, 'info'));
}

export function logError(payload) {
  console.error(formatPayload(payload, 'error'));
}
