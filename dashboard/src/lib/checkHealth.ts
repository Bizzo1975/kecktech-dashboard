import https from "node:https";
import { URL } from "node:url";

/** Statuses that mean the Traefik edge (and usually Authelia) is reachable. */
function isUpStatus(status: number): boolean {
  if (status > 0 && status < 400) return true;
  // Authelia SSO challenge / redirect
  return status === 401 || status === 403 || status === 301 || status === 302 || status === 307 || status === 308;
}

/**
 * Health ping Traefik by IP. For HTTPS, set TLS SNI to healthHost so routers match
 * (Host header alone is not enough — SNI defaults to the IP and Traefik returns 404).
 */
export async function checkHealth(
  healthUrl: string,
  healthHost?: string,
  timeoutMs = 5000
): Promise<{ status: "up" | "down"; latency: number; statusCode: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let statusCode: number;

    if (healthHost && healthUrl.startsWith("https://")) {
      const u = new URL(healthUrl);
      statusCode = await new Promise<number>((resolve, reject) => {
        const req = https.request(
          {
            hostname: u.hostname,
            port: u.port || 443,
            path: `${u.pathname}${u.search}`,
            method: "GET",
            headers: { Host: healthHost },
            servername: healthHost,
            rejectUnauthorized: false,
            signal: controller.signal,
          },
          (res) => {
            res.resume();
            resolve(res.statusCode ?? 0);
          }
        );
        req.on("error", reject);
        req.end();
      });
    } else {
      const headers = new Headers();
      if (healthHost) headers.set("Host", healthHost);
      const res = await fetch(healthUrl, {
        signal: controller.signal,
        cache: "no-store",
        redirect: "manual",
        headers,
      });
      statusCode = res.status;
    }

    clearTimeout(timer);
    return {
      status: isUpStatus(statusCode) ? "up" : "down",
      latency: Date.now() - start,
      statusCode,
    };
  } catch {
    return { status: "down", latency: Date.now() - start, statusCode: 0 };
  }
}
