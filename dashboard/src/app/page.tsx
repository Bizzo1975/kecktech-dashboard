import { TileGrid } from "@/components/TileGrid";
import { SERVICES } from "@/lib/services";
import { checkHealth } from "@/lib/checkHealth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Dashboard() {
  const results = await Promise.all(
    SERVICES.map(async (svc) => {
      const health = svc.noHealthCheck
        ? { status: "up" as const, latency: 0 }
        : await checkHealth(svc.healthUrl, svc.healthHost);
      const { healthHost: _h, ...tile } = svc;
      return { ...tile, ...health };
    })
  );

  const healthChecked = results.filter((r) => !r.noHealthCheck);
  const upCount = healthChecked.filter((r) => r.status === "up").length;
  const totalCount = healthChecked.length;
  const now = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div style={{ background: "#0f172a" }}>
      {/* Header */}
      <header
        style={{
          background: "#1e293b",
          borderBottom: "1px solid #334155",
          padding: "20px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <a
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              padding: "2px 0",
              lineHeight: 0,
              flexShrink: 0,
            }}
            aria-label="Kecktech home"
          >
            {/* Logo: same header band height (~56px) as before; wider maxWidth uses horizontal slack only. */}
            <img
              src="/brand/transparent-logo.png"
              alt="Kecktech"
              width={520}
              height={145}
              style={{
                height: 56,
                maxHeight: 56,
                width: "auto",
                maxWidth: "min(520px, 46vw)",
                display: "block",
                objectFit: "contain",
              }}
            />
          </a>
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: 700,
                color: "#f1f5f9",
                lineHeight: 1.15,
              }}
            >
              Dashboard
            </h1>
            <p style={{ margin: "3px 0 0", fontSize: "14px", color: "#94a3b8", lineHeight: 1.25 }}>
              Internal service overview
            </p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: upCount === totalCount ? "#34d399" : "#fbbf24",
            }}
          >
            {upCount}/{totalCount} Services Up
          </div>
          <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
            Last checked: {now}
          </div>
        </div>
      </header>

      {/* Tile Grid */}
      <main
        style={{
          padding: "32px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "20px",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <TileGrid tiles={results} />
      </main>

      {/* Footer */}
      <footer
        style={{
          textAlign: "center",
          padding: "24px",
          fontSize: "13px",
          color: "#475569",
        }}
      >
        Kecktech.net — Senior IT Support — Refresh page to update health status
      </footer>
    </div>
  );
}
