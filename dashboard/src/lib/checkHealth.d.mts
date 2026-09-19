export type SuccessfulHealthStatus = "ready" | "application_available" | "reachable";
export type HealthStatus = SuccessfulHealthStatus | "auth_required" | "redirected" | "degraded" | "unreachable" | "not_monitored";
export type HealthReason = "success" | "authentication_required" | "redirect_response" | "unexpected_http_status" | "timeout" | "tls_error" | "network_error" | "not_monitored";
export type HealthResult = { status: HealthStatus; reason: HealthReason; latency: number; statusCode: number };

export function classifyHttpStatus(statusCode: number, successStatus?: SuccessfulHealthStatus): Pick<HealthResult, "status" | "reason">;
export function classifyRequestError(error: unknown): Pick<HealthResult, "status" | "reason">;
export function checkHealth(healthUrl: string, healthHost?: string, timeoutMs?: number, successStatus?: SuccessfulHealthStatus): Promise<HealthResult>;
