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
  status: "up" | "down";
  latency: number;
  logoUrl?: string;
  disableLink?: boolean;
  /** When true, skip health ping display and show a static "Running" badge */
  noHealthCheck?: boolean;
}

export function AppTile({
  name,
  description,
  url,
  icon,
  color,
  status,
  latency,
  logoUrl,
  disableLink = false,
  noHealthCheck = false,
}: AppTileProps) {
  const tileBody = (
    <div
      style={{
        display: "block",
        background: "#1e293b",
        border: `1px solid ${status === "up" ? "#334155" : "#7f1d1d"}`,
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
        {noHealthCheck ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 500,
              color: "#34d399",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#34d399",
                boxShadow: "0 0 8px rgba(52,211,153,0.5)",
              }}
            />
            Running
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 500,
              color: status === "up" ? "#34d399" : "#f87171",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: status === "up" ? "#34d399" : "#f87171",
                boxShadow:
                  status === "up"
                    ? "0 0 8px rgba(52,211,153,0.5)"
                    : "0 0 8px rgba(248,113,113,0.5)",
              }}
            />
            {status === "up" ? "Online" : "Offline"}
          </div>
        )}
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
        {noHealthCheck ? "Direct TCP/UDP" : status === "up" ? `${latency}ms response` : "Unreachable"}
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
