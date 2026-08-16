"use client";

import { useState } from "react";
import type { TRMMAlert } from "@/lib/trmm";
import { AcknowledgeButton } from "./AcknowledgeButton";

const SEV_COLOR: Record<string, string> = {
  critical: "#f87171",
  high: "#fb923c",
  warning: "#fbbf24",
  info: "#60a5fa",
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
      }}
    >
      {label}
    </span>
  );
}

function AlertCard({ alert }: { alert: TRMMAlert }) {
  const [ticketCreated, setTicketCreated] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const color = SEV_COLOR[(alert.severity || "info").toLowerCase()] || "#94a3b8";

  async function createTicket() {
    setCreating(true);
    setErr("");
    try {
      const res = await fetch(`/api/alerts/${alert.id}/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostname: alert.hostname,
          message: alert.message,
          severity: alert.severity,
          alert_type: alert.alert_type,
        }),
      });
      const data = await res.json();
      if (!res.ok) setErr(data.error || "Failed");
      else setTicketCreated(data.ticketId);
    } catch (e) {
      setErr(String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      style={{
        background: "#1e293b",
        border: `1px solid ${color}33`,
        borderLeft: `4px solid ${color}`,
        borderRadius: "10px",
        padding: "12px 14px",
        marginBottom: "8px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>{alert.hostname}</span>
        <Badge label={alert.severity || "unknown"} color={color} />
      </div>
      <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>{alert.message}</div>
      <div style={{ fontSize: "11px", color: "#475569", marginBottom: "8px" }}>
        {alert.alert_type} · {new Date(alert.alert_time).toLocaleString("en-US", { timeZone: "America/Chicago" })}
      </div>
      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
        <AcknowledgeButton alertId={alert.id} />
        {ticketCreated ? (
          <a
            href={`https://tickets.kecktech.net/#ticket/zoom/${ticketCreated}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "11px", color: "#34d399" }}
          >
            ✓ Ticket #{ticketCreated} created
          </a>
        ) : (
          <button
            onClick={createTicket}
            disabled={creating}
            style={{
              background: "transparent",
              color: "#94a3b8",
              border: "1px solid #334155",
              borderRadius: "5px",
              padding: "3px 10px",
              fontSize: "11px",
              cursor: creating ? "not-allowed" : "pointer",
              opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? "Creating…" : "→ Create Ticket"}
          </button>
        )}
        {err && <span style={{ fontSize: "11px", color: "#f87171" }}>{err}</span>}
      </div>
    </div>
  );
}

export function AlertPanel({ alerts, error }: { alerts: TRMMAlert[]; error?: string }) {
  const sevCount = { critical: 0, high: 0, warning: 0, info: 0 };
  for (const a of alerts) {
    const s = (a.severity || "info").toLowerCase() as keyof typeof sevCount;
    if (s in sevCount) sevCount[s]++;
  }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#e2e8f0" }}>
          🚨 Alerts {alerts.length > 0 && `(${alerts.length})`}
        </h2>
        <a href="https://rmm.kecktech.net" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "#3b82f6" }}>
          Open TRMM ↗
        </a>
      </div>

      {alerts.length > 0 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
          {sevCount.critical > 0 && <Badge label={`${sevCount.critical} Critical`} color="#f87171" />}
          {sevCount.high > 0 && <Badge label={`${sevCount.high} High`} color="#fb923c" />}
          {sevCount.warning > 0 && <Badge label={`${sevCount.warning} Warning`} color="#fbbf24" />}
          {sevCount.info > 0 && <Badge label={`${sevCount.info} Info`} color="#60a5fa" />}
        </div>
      )}

      {error && (
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "12px", color: "#f87171", fontSize: "13px", marginBottom: "8px" }}>
          ⚠ {error}
        </div>
      )}
      {!error && alerts.length === 0 && (
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "24px", textAlign: "center", color: "#475569", fontSize: "13px" }}>
          ✅ No active alerts
        </div>
      )}
      {alerts.map((a) => <AlertCard key={a.id} alert={a} />)}
    </section>
  );
}
