type Bucket = { count: number; resetAt: number };

const minuteStore = new Map<string, Bucket>();
const hourStore = new Map<string, Bucket>();
const dayStore = new Map<string, Bucket>();

const LIMITS = {
  perMinute: 10,
  perHour: 50,
  perDay: 200,
};

const WINDOWS = {
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
};

function checkBucket(store: Map<string, Bucket>, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = store.get(key);
  if (!b || b.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }
  b.count++;
  return { ok: true, remaining: limit - b.count, resetAt: b.resetAt };
}

function gc() {
  const now = Date.now();
  for (const store of [minuteStore, hourStore, dayStore]) {
    for (const [k, v] of store.entries()) {
      if (v.resetAt < now) store.delete(k);
    }
  }
}

export function rateLimit(ip: string) {
  if (Math.random() < 0.01) gc();
  const m = checkBucket(minuteStore, ip, LIMITS.perMinute, WINDOWS.minute);
  if (!m.ok) return { ok: false, scope: "minuto", resetAt: m.resetAt };
  const h = checkBucket(hourStore, ip, LIMITS.perHour, WINDOWS.hour);
  if (!h.ok) return { ok: false, scope: "hora", resetAt: h.resetAt };
  const d = checkBucket(dayStore, ip, LIMITS.perDay, WINDOWS.day);
  if (!d.ok) return { ok: false, scope: "día", resetAt: d.resetAt };
  return { ok: true, remaining: m.remaining, resetAt: m.resetAt };
}

export function getClientIP(req: Request): string {
  const headers = req.headers;
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  return "unknown";
}
