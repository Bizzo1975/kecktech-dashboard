import type { HealthReason, HealthStatus } from "./checkHealth.mjs";

export const HEALTH_CONTRACT_VERSION: "2.0.0";
export const HEALTH_STATUSES: readonly HealthStatus[];

export type HealthSummary = {
  total: number;
  ready: number;
  applicationAvailable: number;
  reachable: number;
  authRequired: number;
  redirected: number;
  degraded: number;
  unreachable: number;
  notMonitored: number;
};

export function summarizeHealth(results: ReadonlyArray<{ status: HealthStatus }>): HealthSummary;
export function formatHealthStatus(status: HealthStatus, reason: HealthReason, latency: number): string;
