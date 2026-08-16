const BASE = process.env.UMAMI_URL || "https://stats.kecktech.net";
const USER = process.env.UMAMI_USER || "admin";
const PASS = process.env.UMAMI_PASS || "";
const SITE_ID = process.env.UMAMI_SITE_ID || "d2427fe3-ce4b-4b9a-8e41-a8a3e9f2cd6d";

export type UmamiStats = {
  pageviews: { value: number; change: number };
  visitors: { value: number; change: number };
  visits: { value: number; change: number };
  bounces: { value: number; change: number };
  totaltime: { value: number; change: number };
};

async function getToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: USER, password: PASS }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

export async function getWebsiteStats(): Promise<{ stats: UmamiStats | null; error?: string }> {
  if (!PASS) return { stats: null, error: "UMAMI_PASS not configured" };
  try {
    const token = await getToken();
    if (!token) return { stats: null, error: "Umami login failed" };

    const end = Date.now();
    const start = end - 7 * 24 * 60 * 60 * 1000;
    const res = await fetch(
      `${BASE}/api/websites/${SITE_ID}/stats?startAt=${start}&endAt=${end}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    if (!res.ok) return { stats: null, error: `Umami HTTP ${res.status}` };
    const data = await res.json();
    return { stats: data };
  } catch (e) {
    return { stats: null, error: String(e) };
  }
}
