import type { HealthReason, HealthStatus } from "@/lib/checkHealth.mjs";

const icons: Record<string, string> = {
  briefcase: "💼",
  headset: "🎧",
  lock: "🔒",
  workflow: "⚡",
  globe: "🌐",
  book: "📚",
  chart: "📊",
  monitor: "🖥️",
  mail: "📧",
  container: "📦",
  route: "🔀",
  shield: "🛡️",
  edit: "✏️",
  users: "👥",
  remote: "🖥️",
};

interface AppTileProps {
  name: string;
  description: string;
  url: string;
  icon: string;
  color: string;
  status: HealthStatus;
  reason: HealthReason;
  statusCode: number;
  latency: number;
  logoUrl?: string;
  disableLink?: boolean;
  /** Retained as service metadata; it never implies a runtime state. */
  noHealthCheck?: boolean;
}

export function AppTile({
  name,
  description,
  url,
  icon,
  color,
  status,
  reason,
  latency,
  logoUrl,
  disableLink = false,
}: AppTileProps) {
  const statusMeta: Record<HealthStatus, { label: string; detail: string; color: string }> = {
    ready: { label: "Ready", detail: `${latency}ms readiness response`, color: "#34d399" },
    application_available: { label: "App Available", detail: `${latency}ms application response; dependencies may be unverified`, color: "#60a5fa" },
    reachable: { label: "Reachable", detail: `${latency}ms HTTP response; readiness unverified`, color: "#fbbf24" },
    auth_required: { label: "Auth Required", detail: "Edge reachable; readiness unverified", color: "#fbbf24" },
    redirected: { label: "Redirected", detail: "Redirect received; readiness unverified", color: "#fbbf24" },
    degraded: { label: "Degraded", detail: "Unexpected application response", color: "#fb923c" },
    unreachable: {
      label: "Unreachable",
      detail: reason === "timeout" ? "Readiness check timed out" : reason === "tls_error" ? "TLS verification failed" : "Network check failed",
      color: "#f87171",
    },
    not_monitored: { label: "Not Monitored", detail: "No automated readiness check", color: "#94a3b8" },
  };
  const health = statusMeta[status];
  const tileBody = (
    <div
      style={{
        display: "block",
        background: "#1e293b",
        border: `1px solid ${status === "ready" ? "#334155" : `${health.color}66`}`,
        borderRadius: "12px",
        padding: "24px",
        transition: "transform 0.15s, border-color 0.15s",
        textDecoration: "none",
        color: "inherit",
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "16px",
        }}
      >
        {/* Icon / Logo */}
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "10px",
            background: `${color}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={name}
              width={32}
              height={32}
              style={{ width: 32, height: 32, objectFit: "contain", display: "block" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
                (e.currentTarget.parentElement as HTMLElement).innerText = icons[icon] || "🔧";
              }}
            />
          ) : (
            icons[icon] || "🔧"
          )}
        </div>

        {/* Status indicator */}
        <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 500,
              color: health.color,
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: health.color,
                boxShadow: status === "ready" ? "0 0 8px rgba(52,211,153,0.5)" : "none",
              }}
            />
            {health.label}
          </div>
      </div>

      {/* Name and description */}
      <h2
        style={{
          margin: "0 0 4px",
          fontSize: "18px",
          fontWeight: 600,
          color: "#f1f5f9",
        }}
      >
        {name}
      </h2>
      <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#94a3b8" }}>
        {description}
      </p>

      {/* Latency */}
      <div style={{ fontSize: "12px", color: "#64748b" }}>
        {health.detail}
      </div>
    </div>
  );

  if (disableLink) {
    return tileBody;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        cursor: "inherit",
        textDecoration: "none",
        color: "inherit",
        height: "100%",
      }}
    >
      {tileBody}
    </a>
  );
}
