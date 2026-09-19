export const HEALTH_CONTRACT_VERSION = "2.0.0";

export const HEALTH_STATUSES = Object.freeze([
  "ready",
  "application_available",
  "reachable",
  "auth_required",
  "redirected",
  "degraded",
  "unreachable",
  "not_monitored",
]);

/** Produce the stable v2 summary without treating weaker evidence as readiness. */
export function summarizeHealth(results) {
  return {
    total: results.length,
    ready: results.filter((result) => result.status === "ready").length,
    applicationAvailable: results.filter((result) => result.status === "application_available").length,
    reachable: results.filter((result) => result.status === "reachable").length,
    authRequired: results.filter((result) => result.status === "auth_required").length,
    redirected: results.filter((result) => result.status === "redirected").length,
    degraded: results.filter((result) => result.status === "degraded").length,
    unreachable: results.filter((result) => result.status === "unreachable").length,
    notMonitored: results.filter((result) => result.status === "not_monitored").length,
  };
}

export function formatHealthStatus(status, reason, latency) {
  switch (status) {
    case "ready": return `${latency}ms ready`;
    case "application_available": return `${latency}ms app available; dependencies unverified`;
    case "reachable": return `${latency}ms reachable; readiness unverified`;
    case "auth_required": return "Auth required; readiness unverified";
    case "redirected": return "Redirected; readiness unverified";
    case "degraded": return "Degraded";
    case "not_monitored": return "Not monitored";
    case "unreachable":
      if (reason === "tls_error") return "TLS verification failed";
      if (reason === "timeout") return "Timed out";
      return "Unreachable";
    default:
      return "Unknown health state";
  }
}
