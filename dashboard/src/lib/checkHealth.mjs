import https from "node:https";
import { URL } from "node:url";

export function classifyHttpStatus(statusCode, successStatus = "ready") {
  if (statusCode >= 200 && statusCode < 300) return { status: successStatus, reason: "success" };
  if (statusCode === 401 || statusCode === 403) return { status: "auth_required", reason: "authentication_required" };
  if (statusCode >= 300 && statusCode < 400) return { status: "redirected", reason: "redirect_response" };
  return { status: "degraded", reason: "unexpected_http_status" };
}

export function classifyRequestError(error) {
  const code = error?.code ?? error?.cause?.code ?? "";
  if (error?.name === "AbortError" || code === "ABORT_ERR") return { status: "unreachable", reason: "timeout" };
  if (/^(?:CERT_|ERR_TLS_|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_VERIFY_LEAF_SIGNATURE)/.test(code)) {
    return { status: "unreachable", reason: "tls_error" };
  }
  return { status: "unreachable", reason: "network_error" };
}

/** Probe one selected HTTP layer. Redirects and auth responses never prove readiness. */
export async function checkHealth(healthUrl, healthHost, timeoutMs = 5000, successStatus = "ready") {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let statusCode;
    if (healthHost && healthUrl.startsWith("https://")) {
      const url = new URL(healthUrl);
      statusCode = await new Promise((resolve, reject) => {
        const request = https.request({
          hostname: url.hostname,
          port: url.port || 443,
          path: `${url.pathname}${url.search}`,
          method: "GET",
          headers: { Host: healthHost },
          servername: healthHost,
          signal: controller.signal,
        }, (response) => {
          response.resume();
          resolve(response.statusCode ?? 0);
        });
        request.on("error", reject);
        request.end();
      });
    } else {
      const headers = new Headers();
      if (healthHost) headers.set("Host", healthHost);
      const response = await fetch(healthUrl, { signal: controller.signal, cache: "no-store", redirect: "manual", headers });
      response.body?.cancel().catch(() => undefined);
      statusCode = response.status;
    }
    return { ...classifyHttpStatus(statusCode, successStatus), latency: Date.now() - start, statusCode };
  } catch (error) {
    return { ...classifyRequestError(error), latency: Date.now() - start, statusCode: 0 };
  } finally {
    clearTimeout(timer);
  }
}
